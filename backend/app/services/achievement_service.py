from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Literal, Set

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.blockchain.nft.chain_registry import DEFAULT_BADGE_CHAIN_ID, get_chain_config
from app.domains.blockchain.nft.nft_client_factory import NFTClientFactory
from app.models import BadgeTemplate, User, UserBadge
from app.domains.mental_health.models import JournalEntry, PlayerWellnessState
from app.schemas.user import EarnedBadgeInfo

logger = logging.getLogger(__name__)


LET_THERE_BE_BADGE_BADGE_ID = 1
TRIPLE_THREAT_OF_THOUGHTS_BADGE_ID = 2
SEVEN_DAYS_A_WEEK_BADGE_ID = 3
TWO_WEEKS_NOTICE_YOU_GAVE_TO_NEGATIVITY_BADGE_ID = 4
FULL_MOON_POSITIVITY_BADGE_ID = 5
QUARTER_CENTURY_OF_JOURNALING_BADGE_ID = 6
UNLEASH_THE_WORDS_BADGE_ID = 7
BESTIES_BADGE_ID = 8

AchievementAction = Literal[
    "manual_sync",
    "journal_saved",
    "quest_completed",
    "wellness_state_updated",
]


@dataclass(frozen=True)
class BadgeRule:
    badge_id: int
    reason: str
    trigger_actions: Set[AchievementAction]
    min_activity_days: int | None = None
    min_streak: int | None = None
    min_journal_count: int | None = None


DEFAULT_BADGE_RULES: tuple[BadgeRule, ...] = (
    BadgeRule(
        badge_id=LET_THERE_BE_BADGE_BADGE_ID,
        reason="First activity",
        trigger_actions={"manual_sync", "journal_saved", "quest_completed"},
        min_activity_days=1,
    ),
    BadgeRule(
        badge_id=TRIPLE_THREAT_OF_THOUGHTS_BADGE_ID,
        reason="3 days of activity",
        trigger_actions={"manual_sync", "journal_saved", "quest_completed"},
        min_activity_days=3,
    ),
    BadgeRule(
        badge_id=SEVEN_DAYS_A_WEEK_BADGE_ID,
        reason="7-day streak",
        trigger_actions={"manual_sync", "quest_completed", "wellness_state_updated"},
        min_streak=7,
    ),
    BadgeRule(
        badge_id=TWO_WEEKS_NOTICE_YOU_GAVE_TO_NEGATIVITY_BADGE_ID,
        reason="14-day streak",
        trigger_actions={"manual_sync", "quest_completed", "wellness_state_updated"},
        min_streak=14,
    ),
    BadgeRule(
        badge_id=FULL_MOON_POSITIVITY_BADGE_ID,
        reason="30-day streak",
        trigger_actions={"manual_sync", "quest_completed", "wellness_state_updated"},
        min_streak=30,
    ),
    BadgeRule(
        badge_id=QUARTER_CENTURY_OF_JOURNALING_BADGE_ID,
        reason="25 journal entries",
        trigger_actions={"manual_sync", "journal_saved"},
        min_journal_count=25,
    ),
)


@dataclass(frozen=True)
class AchievementMetrics:
    current_streak: int
    journal_count: int
    total_activity_days: int


async def _load_achievement_metrics(db: AsyncSession, user: User) -> AchievementMetrics:
    current_streak = int(getattr(user, "current_streak", 0) or 0)

    journal_count = (
        await db.execute(
            select(func.count(JournalEntry.id)).filter(JournalEntry.user_id == user.id)
        )
    ).scalar() or 0

    total_activity_days = (
        await db.execute(
            select(func.count(func.distinct(JournalEntry.entry_date))).filter(
                JournalEntry.user_id == user.id
            )
        )
    ).scalar() or 0

    wellness_streak = (
        await db.execute(
            select(PlayerWellnessState.current_streak).where(PlayerWellnessState.user_id == user.id)
        )
    ).scalar() or 0
    current_streak = max(current_streak, int(wellness_streak or 0))

    return AchievementMetrics(
        current_streak=current_streak,
        journal_count=int(journal_count),
        total_activity_days=int(total_activity_days),
    )


def _qualifies(rule: BadgeRule, metrics: AchievementMetrics) -> bool:
    if rule.min_activity_days is not None and metrics.total_activity_days < rule.min_activity_days:
        return False
    if rule.min_streak is not None and metrics.current_streak < rule.min_streak:
        return False
    if rule.min_journal_count is not None and metrics.journal_count < rule.min_journal_count:
        return False
    return True


def _rules_for_action(action: AchievementAction) -> List[BadgeRule]:
    return [rule for rule in DEFAULT_BADGE_RULES if action in rule.trigger_actions]


def _criteria_qualifies(criteria: Dict[str, Any], metrics: AchievementMetrics) -> bool:
    if not criteria:
        return False

    min_activity_days_raw = criteria.get("min_activity_days")
    min_streak_raw = criteria.get("min_streak")
    min_journal_count_raw = criteria.get("min_journal_count")

    min_activity_days = int(min_activity_days_raw) if min_activity_days_raw is not None else None
    min_streak = int(min_streak_raw) if min_streak_raw is not None else None
    min_journal_count = int(min_journal_count_raw) if min_journal_count_raw is not None else None

    if min_activity_days is not None and metrics.total_activity_days < min_activity_days:
        return False
    if min_streak is not None and metrics.current_streak < min_streak:
        return False
    if min_journal_count is not None and metrics.journal_count < min_journal_count:
        return False

    return True


async def trigger_achievement_check(
    db: AsyncSession,
    user: User,
    *,
    action: AchievementAction,
    fail_on_config_error: bool = False,
) -> List[EarnedBadgeInfo]:
    """Evaluate and mint badges relevant to a specific user action."""
    candidate_rules = _rules_for_action(action)

    metrics = await _load_achievement_metrics(db, user)

    default_chain_id = DEFAULT_BADGE_CHAIN_ID
    cfg = get_chain_config(default_chain_id)
    default_contract_address = cfg.contract_address if cfg else None
    if not default_contract_address and fail_on_config_error:
        message = f"NFT contract address not configured for chain {default_chain_id}."
        raise RuntimeError(message)
    if not default_contract_address:
        logger.warning(
            "NFT contract address not configured for default chain %s. Skipping default rules for user %s action=%s",
            default_chain_id,
            user.id,
            action,
        )

    awarded_badges_res = await db.execute(
        select(UserBadge.badge_id, UserBadge.chain_id).filter(UserBadge.user_id == user.id)
    )
    awarded_badges: Set[tuple[int, int]] = {(int(row[0]), int(row[1])) for row in awarded_badges_res.all()}

    template_stmt = (
        select(BadgeTemplate)
        .where(
            BadgeTemplate.auto_award_enabled.is_(True),
            BadgeTemplate.status == "PUBLISHED",
            BadgeTemplate.auto_award_action == action,
        )
        .order_by(BadgeTemplate.created_at.asc())
    )
    admin_templates = list((await db.execute(template_stmt)).scalars().all())

    if not candidate_rules and not admin_templates:
        return []

    factory = NFTClientFactory()
    badges_to_add_to_db: List[Dict[str, Any]] = []

    async def attempt_mint(
        *,
        chain_id: int,
        badge_id: int,
        contract_address: str,
        reason: str,
    ) -> None:
        badge_key = (badge_id, chain_id)
        if badge_key in awarded_badges:
            return
        if not user.wallet_address:
            logger.info(
                "User %s qualifies for badge %s (%s) but has no linked wallet",
                user.id,
                badge_id,
                reason,
            )
            return

        logger.info(
            "User %s qualifies for badge %s on chain %s (%s)",
            user.id,
            badge_id,
            chain_id,
            reason,
        )
        tx_hash = await factory.mint_badge(chain_id, user.wallet_address, badge_id)
        if not tx_hash:
            logger.error("Minting badge %s failed for user %s", badge_id, user.id)
            return

        awarded_badges.add(badge_key)
        badges_to_add_to_db.append(
            {
                "badge_id": badge_id,
                "chain_id": chain_id,
                "contract_address": contract_address,
                "tx_hash": tx_hash,
            }
        )

    if default_contract_address:
        for rule in candidate_rules:
            if _qualifies(rule, metrics):
                await attempt_mint(
                    chain_id=default_chain_id,
                    badge_id=rule.badge_id,
                    contract_address=default_contract_address,
                    reason=rule.reason,
                )

    for template in admin_templates:
        criteria = template.auto_award_criteria or {}
        if not isinstance(criteria, dict):
            logger.warning(
                "Skipping auto-award template %s: criteria must be a JSON object.",
                template.id,
            )
            continue
        if not _criteria_qualifies(criteria, metrics):
            continue

        await attempt_mint(
            chain_id=int(template.chain_id),
            badge_id=int(template.token_id),
            contract_address=str(template.contract_address),
            reason=f"Admin auto-award template {template.id}",
        )

    if not badges_to_add_to_db:
        return []

    current_time = datetime.now()
    newly_awarded_badges: List[EarnedBadgeInfo] = []
    for badge_info in badges_to_add_to_db:
        new_award = UserBadge(
            user_id=user.id,
            badge_id=badge_info["badge_id"],
            contract_address=badge_info["contract_address"],
            transaction_hash=badge_info["tx_hash"],
            chain_id=badge_info["chain_id"],
            awarded_at=current_time,
        )
        db.add(new_award)
        newly_awarded_badges.append(
            EarnedBadgeInfo(
                badge_id=badge_info["badge_id"],
                awarded_at=current_time,
                transaction_hash=badge_info["tx_hash"],
                contract_address=badge_info["contract_address"],
            )
        )

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        logger.info(
            "Concurrent badge insert detected for user %s; awards likely already persisted.",
            user.id,
        )
        return []
    except Exception:
        await db.rollback()
        raise

    logger.info(
        "Saved %s new badge awards for user %s (action=%s)",
        len(newly_awarded_badges),
        user.id,
        action,
    )
    return newly_awarded_badges


async def sync_user_achievements(
    db: AsyncSession,
    user: User,
    *,
    fail_on_config_error: bool = True,
) -> List[EarnedBadgeInfo]:
    """Manual sync path that evaluates all rule groups."""
    return await trigger_achievement_check(
        db,
        user,
        action="manual_sync",
        fail_on_config_error=fail_on_config_error,
    )
