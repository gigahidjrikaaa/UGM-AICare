"""CCSE replay runner: probe the frozen crisis corpus against the live backend.

For every scenario in the frozen corpus, replays the conversation up to the
labelled risk-onset user turn, calls ``POST /api/v1/aika`` (SSE), and records
the detection result plus escalation evidence. Results feed :mod:`invariants`.

Evidence channels:

* response text  -> ``crisis_resources_surfaced`` (canonical hotline tokens)
* ``alerts`` table -> ``counselor_alert_created`` (rows tagged with the eval
  user id within the turn window; requires ``--db-url``)
* ``compliance_audit_log`` -> ``audit_annotation_written`` (rows where the eval
  user is the actor or the subject within the turn window)

Without ``--db-url`` the DB-backed evidence fields stay ``None`` so the gate
reports ``not_evaluated`` for INV-2 instead of a false pass.

Usage (from ``backend/``)::

    python research_evaluation/ccse/replay_runner.py \
        --models "gemini:auto,glm-4.6" \
        --out-dir research_evaluation/ccse/runs/2026-10-18-e1

Model switching uses the admin runtime endpoint
``PUT /api/v1/admin/system/api-keys/active-model`` and requires admin
credentials; pass ``--no-model-switch`` to probe whatever model is active.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import httpx

CCSE_DIR = Path(__file__).resolve().parent
RESEARCH_DIR = CCSE_DIR.parent
REPO_ROOT = Path(__file__).resolve().parents[3]
for _path in (str(CCSE_DIR), str(RESEARCH_DIR)):
    if _path not in sys.path:
        sys.path.insert(0, _path)

import invariants as gate  # noqa: E402
from eval_lib.http_client import AuthContext, EvaluationHttpError, login_and_get_user_id  # noqa: E402
from eval_lib.io_utils import ensure_dir, read_json, sha256_file, utc_now_iso, write_json, write_jsonl  # noqa: E402
from research_eval_runner import _call_aika_sse  # noqa: E402

CORPUS_PATH = RESEARCH_DIR / "rq1_crisis_detection" / "conversation_scenarios.json"
LABELS_PATH = CCSE_DIR / "corpus_labels.json"
CONFIG_PATH = CCSE_DIR / "gate_config.json"
FREEZE_PATH = CCSE_DIR / "corpus_freeze.json"

EVIDENCE_PAD = timedelta(seconds=5)
COST_KEYS = ("cost_usd", "cost", "total_cost", "total_cost_usd")


@dataclass(frozen=True)
class ReplayConfig:
    backend_url: str
    eval_email: str
    eval_password: str
    admin_email: Optional[str]
    admin_password: Optional[str]
    out_dir: Path
    timeout_s: float
    evidence_wait_s: float
    sleep_s: float
    db_url: Optional[str]
    switch_model: bool


def _env(name: str, default: Optional[str] = None) -> str:
    value = os.getenv(name, default)
    if value is None or value == "":
        raise ValueError(f"Missing required env var: {name}")
    return value


def derive_provider(model: str) -> str:
    lowered = model.strip().lower()
    if lowered.startswith(("gemini", "gemma")):
        return "google"
    if lowered.startswith(("glm", "z-ai", "zai")):
        return "zai"
    return "other"


def parse_model_specs(raw: Optional[str]) -> list[tuple[str, str]]:
    if not raw:
        return []
    specs: list[tuple[str, str]] = []
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "|" in chunk:
            model, provider = chunk.split("|", 1)
            specs.append((model.strip(), provider.strip() or derive_provider(model)))
        else:
            specs.append((chunk, derive_provider(chunk)))
    return specs


def verify_freeze() -> dict[str, Any]:
    """Abort when the frozen corpus, labels or gate config drifted."""
    freeze = read_json(FREEZE_PATH)
    problems: list[str] = []
    for key, entry in freeze.get("files", {}).items():
        path = REPO_ROOT / entry["path"]
        if not path.exists():
            problems.append(f"{key}: missing {entry['path']}")
            continue
        actual = sha256_file(path)
        if actual != entry.get("sha256"):
            problems.append(f"{key}: sha256 {actual} != frozen {entry.get('sha256')}")
    if problems:
        raise ValueError(
            "Frozen CCSE inputs changed; re-run freeze_corpus.py after review:\n"
            + "\n".join(problems)
        )
    return freeze


def extract_cost(metadata: dict[str, Any]) -> Optional[float]:
    containers: list[dict[str, Any]] = [metadata]
    usage = metadata.get("usage")
    if isinstance(usage, dict):
        containers.append(usage)
    for container in containers:
        for key in COST_KEYS:
            value = container.get(key)
            if value is None:
                continue
            try:
                return float(value)
            except (TypeError, ValueError):
                continue
    return None


class EvidenceCollector:
    """Queries side-effect tables for the turn window (PostgreSQL only)."""

    def __init__(self, db_url: Optional[str]) -> None:
        self.db_url = db_url
        self._psycopg = None
        if db_url:
            try:
                import psycopg  # type: ignore

                self._psycopg = psycopg
            except ImportError:
                self._psycopg = None

    @property
    def enabled(self) -> bool:
        return bool(self._psycopg and self.db_url and "sqlite" not in str(self.db_url))

    def collect(self, user_id: int, start: datetime, end: datetime) -> dict[str, Any]:
        empty = {
            "alert_ids": [],
            "alert_types": [],
            "audit_ids": [],
            "audit_actions": [],
            "counselor_alert_created": None,
            "audit_annotation_written": None,
            "evidence_error": None,
        }
        if not self.enabled:
            return empty

        assert self._psycopg is not None
        try:
            with self._psycopg.connect(self.db_url) as conn:  # type: ignore[union-attr]
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id::text, alert_type
                        FROM alerts
                        WHERE created_at >= %s AND created_at <= %s
                          AND context_data->>'user_id' = %s
                        """,
                        (start, end, str(user_id)),
                    )
                    alert_rows = cur.fetchall()
                    cur.execute(
                        """
                        SELECT id::text, action
                        FROM compliance_audit_log
                        WHERE created_at >= %s AND created_at <= %s
                          AND (actor_id = %s OR extra_data->>'user_id' = %s)
                        """,
                        (start, end, user_id, str(user_id)),
                    )
                    audit_rows = cur.fetchall()
        except Exception as exc:  # noqa: BLE001 - evidence must never crash a run
            return {**empty, "evidence_error": f"{type(exc).__name__}: {exc}"}

        return {
            "alert_ids": [row[0] for row in alert_rows],
            "alert_types": sorted({row[1] for row in alert_rows if row[1]}),
            "audit_ids": [row[0] for row in audit_rows],
            "audit_actions": sorted({row[1] for row in audit_rows if row[1]}),
            "counselor_alert_created": bool(alert_rows),
            "audit_annotation_written": bool(audit_rows),
            "evidence_error": None,
        }


def _utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _evaluated_turn_index(scenario: list[dict[str, Any]], label: Optional[dict[str, Any]]) -> int:
    user_indices = [idx for idx, turn in enumerate(scenario) if turn.get("role") == "user"]
    if not user_indices:
        raise ValueError("scenario has no user turns")
    onset = label.get("risk_onset_user_turn_index") if label else None
    if isinstance(onset, int) and 0 <= onset < len(scenario) and scenario[onset].get("role") == "user":
        return onset
    return user_indices[-1]


async def switch_active_model(
    client: httpx.AsyncClient,
    config: ReplayConfig,
    admin_auth: AuthContext,
    model: str,
) -> dict[str, Any]:
    resp = await client.put(
        f"{config.backend_url}/api/v1/admin/system/api-keys/active-model",
        headers={"Authorization": f"Bearer {admin_auth.access_token}"},
        json={"model": model},
        timeout=config.timeout_s,
    )
    if resp.status_code >= 400:
        raise EvaluationHttpError(
            f"Model switch to {model!r} failed ({resp.status_code}): {resp.text[:500]}"
        )
    return resp.json()


async def replay_scenario(
    client: httpx.AsyncClient,
    config: ReplayConfig,
    auth: AuthContext,
    collector: EvidenceCollector,
    model: str,
    provider: str,
    scenario: dict[str, Any],
    label: Optional[dict[str, Any]],
) -> dict[str, Any]:
    scenario_id = str(scenario.get("id"))
    turns = scenario.get("turns", [])
    base_row: dict[str, Any] = {
        "model": model,
        "provider": provider,
        "scenario_id": scenario_id,
        "is_crisis": bool(label.get("source_is_crisis")) if label else bool(scenario.get("is_crisis")),
        "label_severity": str(label.get("severity", "none")) if label else "none",
        "language": str(label.get("language", "unknown")) if label else "unknown",
        "evaluated_turn_index": None,
        "detected_risk": None,
        "detected_severity": "none",
        "response_text": None,
        "crisis_resources_surfaced": None,
        "counselor_alert_created": None,
        "audit_annotation_written": None,
        "alert_ids": [],
        "audit_ids": [],
        "elapsed_s": None,
        "cost_usd": None,
        "appropriateness_score": None,
        "harmful": None,
        "instrument_indicated": None,
        "instrument_item9_skipped": None,
        "error": None,
    }

    try:
        index = _evaluated_turn_index(turns, label)
        history = [
            {"role": str(turn.get("role")), "content": str(turn.get("content"))}
            for turn in turns[:index]
            if turn.get("role") in {"user", "assistant"} and turn.get("content")
        ]
        message = str(turns[index].get("content"))
    except (ValueError, IndexError) as exc:
        return {**base_row, "error": f"scenario_error: {exc}"}

    window_start = _utc_naive() - EVIDENCE_PAD
    try:
        sse = await _call_aika_sse(
            client,
            config,  # type: ignore[arg-type] - duck-typed backend_url/timeout_s
            auth,
            message=message,
            conversation_history=history,
            role="user",
        )
    except Exception as exc:  # noqa: BLE001 - error rows become INV-1 false negatives
        return {
            **base_row,
            "evaluated_turn_index": index,
            "error": f"{type(exc).__name__}: {exc}",
        }

    if config.evidence_wait_s > 0:
        await asyncio.sleep(config.evidence_wait_s)
    window_end = _utc_naive() + EVIDENCE_PAD

    metadata = sse.get("metadata") or {}
    risk_level = metadata.get("risk_level")
    response_text = sse.get("final_response")
    evidence = collector.collect(auth.user_id, window_start, window_end)

    return {
        **base_row,
        "evaluated_turn_index": index,
        "detected_risk": risk_level,
        "detected_severity": gate.normalize_detected_severity(risk_level),
        "response_text": response_text,
        "crisis_resources_surfaced": gate.response_surfaces_crisis_resources(response_text),
        "counselor_alert_created": evidence["counselor_alert_created"],
        "audit_annotation_written": evidence["audit_annotation_written"],
        "alert_ids": evidence["alert_ids"],
        "audit_ids": evidence["audit_ids"],
        "elapsed_s": sse.get("elapsed_s"),
        "cost_usd": extract_cost(metadata),
        "evidence_error": evidence["evidence_error"],
        "alert_types": evidence["alert_types"],
        "audit_actions": evidence["audit_actions"],
    }


def build_manifest(
    config: ReplayConfig,
    freeze: dict[str, Any],
    requested: list[tuple[str, str]],
    actual_models: dict[str, str],
    row_counts: dict[str, int],
) -> dict[str, Any]:
    try:
        git_sha = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=str(REPO_ROOT), text=True
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        git_sha = None

    return {
        "created_at": utc_now_iso(),
        "backend_url": config.backend_url,
        "timeout_s": config.timeout_s,
        "evidence_wait_s": config.evidence_wait_s,
        "db_evidence_configured": bool(config.db_url),
        "model_switch": config.switch_model,
        "requested_models": [
            {"model": model, "provider": provider} for model, provider in requested
        ],
        "active_models": actual_models,
        "rows_per_model": row_counts,
        "corpus_sha256": freeze["files"]["corpus"]["sha256"],
        "labels_sha256": freeze["files"]["labels"]["sha256"],
        "gate_config_sha256": freeze["files"]["gate_config"]["sha256"],
        "gate_config_version": read_json(CONFIG_PATH).get("config_version"),
        "freeze_version": freeze.get("freeze_version"),
        "review_status": freeze.get("review_status"),
        "git_sha": git_sha,
    }


async def run(args: argparse.Namespace) -> int:
    freeze = verify_freeze()
    scenarios = {str(item.get("id")): item for item in read_json(CORPUS_PATH)}
    labels = gate.index_labels(read_json(LABELS_PATH))

    requested = parse_model_specs(args.models)
    if not requested:
        if args.switch_model:
            raise ValueError("--models is required unless --no-model-switch is used")
        requested = [("active", "active")]

    config = ReplayConfig(
        backend_url=str(args.backend_url).rstrip("/"),
        eval_email=_env("EVAL_USER_EMAIL", "evaluation_user@example.com"),
        eval_password=_env("EVAL_USER_PASSWORD"),
        admin_email=os.getenv("ADMIN_EMAIL"),
        admin_password=os.getenv("ADMIN_PASSWORD"),
        out_dir=Path(args.out_dir),
        timeout_s=float(args.timeout_s),
        evidence_wait_s=float(args.evidence_wait_s),
        sleep_s=float(args.sleep_s),
        db_url=args.db_url or os.getenv("DATABASE_URL"),
        switch_model=bool(args.switch_model),
    )
    ensure_dir(config.out_dir)

    if config.switch_model and not (config.admin_email and config.admin_password):
        raise ValueError("ADMIN_EMAIL and ADMIN_PASSWORD are required for model switching")

    collector = EvidenceCollector(config.db_url)
    if not collector.enabled:
        print("warning: DB evidence disabled; INV-2 will report not_evaluated", file=sys.stderr)

    actual_models: dict[str, str] = {}
    row_counts: dict[str, int] = {}
    scenario_ids = list(scenarios)
    if args.scenario_limit:
        scenario_ids = scenario_ids[: int(args.scenario_limit)]

    async with httpx.AsyncClient() as client:
        auth = await login_and_get_user_id(
            client, config.backend_url, config.eval_email, config.eval_password
        )
        admin_auth: Optional[AuthContext] = None
        if config.switch_model:
            admin_auth = await login_and_get_user_id(
                client, config.backend_url, str(config.admin_email), str(config.admin_password)
            )

        for model, provider in requested:
            if config.switch_model and admin_auth is not None:
                status = await switch_active_model(client, config, admin_auth, model)
                actual_models[model] = str(status.get("active_chat_model", model))
            else:
                actual_models[model] = model

            rows = []
            for position, scenario_id in enumerate(scenario_ids, start=1):
                row = await replay_scenario(
                    client,
                    config,
                    auth,
                    collector,
                    model,
                    provider,
                    scenarios[scenario_id],
                    labels.get(scenario_id),
                )
                rows.append(row)
                print(
                    f"[{model}] {position}/{len(scenario_ids)} {scenario_id}: "
                    f"{row.get('detected_severity')} error={bool(row.get('error'))}",
                    flush=True,
                )
                if config.sleep_s > 0 and position < len(scenario_ids):
                    await asyncio.sleep(config.sleep_s)

            safe_name = "".join(ch if ch.isalnum() or ch in "-_." else "_" for ch in model)
            write_jsonl(config.out_dir / f"results_{safe_name}.jsonl", rows)
            row_counts[model] = len(rows)

    write_json(
        config.out_dir / "manifest.json",
        build_manifest(config, freeze, requested, actual_models, row_counts),
    )

    report = gate.evaluate_run_dir(config.out_dir)
    print(f"gate overall_status={report['overall_status']}")
    print(f"outputs written to {config.out_dir}")

    if not args.enforce:
        return 0
    if report["overall_status"] == gate.STATUS_PASS:
        return 0
    return 1 if report["overall_status"] == gate.STATUS_FAIL else 2


def main(argv: Optional[list[str]] = None) -> None:
    parser = argparse.ArgumentParser(description="Replay the frozen CCSE corpus against a live backend")
    parser.add_argument(
        "--backend-url",
        default=os.getenv("AIKA_BACKEND_URL", "http://127.0.0.1:22001"),
    )
    parser.add_argument("--models", default=os.getenv("CCSE_MODELS"))
    parser.add_argument("--out-dir", default=str(CCSE_DIR / "runs" / utc_now_iso().replace(":", "-")))
    parser.add_argument("--timeout-s", type=float, default=300.0)
    parser.add_argument("--evidence-wait-s", type=float, default=3.0)
    parser.add_argument("--sleep-s", type=float, default=0.5)
    parser.add_argument("--db-url", default=None, help="PostgreSQL URL for alert/audit evidence")
    parser.add_argument("--scenario-limit", type=int, default=None)
    parser.add_argument(
        "--no-model-switch",
        dest="switch_model",
        action="store_false",
        help="Probe whatever model is currently active instead of switching",
    )
    parser.add_argument("--enforce", action="store_true", help="Non-zero exit on fail/not_evaluated")
    parser.set_defaults(switch_model=True)

    try:
        raise SystemExit(asyncio.run(run(parser.parse_args(argv))))
    except (EvaluationHttpError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
