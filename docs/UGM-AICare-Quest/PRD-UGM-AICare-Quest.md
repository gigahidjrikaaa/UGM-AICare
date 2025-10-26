# UGM-AICare Quest MVP PRD

## Overview

- **Module**: Multi-module (QES, RCS, DOS, ATS, CLS, CareQuest Hub, Frontend)
- **Owner**: Product Lead – UGM-AICare Quest
- **Goal / Problem Statement**: Deliver a gamified mental wellness experience for UGM students that transforms counseling milestones into cooperative quests, while ensuring regulatory compliance, counselor oversight, and transparent blockchain-based incentives. The **CareQuest Hub** typing mini-game provides an engaging, therapeutic supplement where students practice positive affirmations and CBT phrases through skill-based typing gameplay.
- **Success Metrics**:
  - **Main Quest System**:
    - ≥60% of pilot users complete at least one daily quest per day during first 30 days.
    - ≥35% D7 retention among pilot cohort.
    - ≥90% of counselor-signed quests generate attestations within SLA (<10 min).
    - Zero P0/P1 security or compliance incidents during MVP trial.
  - **CareQuest Hub (Typing Game)**:
    - ≥40% of pilot users try CareQuest Hub within first 7 days.
    - ≥25% of hub users return for 3+ sessions within first 14 days.
    - Average session duration: 8-12 minutes (sweet spot for engagement without fatigue).
    - Average typing accuracy improvement: ≥5% from first to 10th session.
    - ≥80% of typed sentences from Affirmations and Coping categories (indicates therapeutic focus).
    - Zero reports of triggering content or addictive behavior patterns from counselors.

## Background & Context

- Based on the UGM-AICare Quest GDD (Section 5–7), we need a foundational implementation covering quest generation, rewards, dialogue, attestations, and compliance to support a closed beta at UGM.
- Counseling team requires visibility into student progress and the ability to override quests for safety reasons (GDD 6.1.2, Appendix 16.6).
- Blockchain elements (CARE token, attestations) must remain on Sepolia testnet until audits are complete (GDD 7.1.1, Phase Plan).
- Compliance obligations include UU PDP, OJK digital finance guidance, and internal university ethics policies (GDD Section 13).

## Requirements

### R1: Quest Engine v1 (QES)

- **User Story**: As a student, I receive daily wellness quests tailored to my streak and mood so I can maintain healthy routines.
- **Acceptance Criteria**:
  - Given a player with valid session, when daily reset occurs, then QES issues 3 quest slots (Daily Solo, Peer Support, Stretch) respecting cooldowns.
  - Given a player completes a quest, when telemetry heartbeat is received, then quest status transitions to `completed` and streak updated.
  - Given Compassion Mode is active, when new quests issue, then difficulty flag is reduced and reward multiplier adjusted per spec.
- **Safety/Compliance**: Compassion Mode triggers must be logged; counselor overrides require secure audit trail.
- **Accessibility**: Quest payload must include text summaries readable by screen readers.

### R2: Rewards Calculator MVP (RCS)

- **User Story**: As a player, I want immediate feedback (XP/`JOY`/Harmony) so I understand progress and incentives.
- **Acceptance Criteria**:
  - Given quest completion event, when processed, then ledger updates happen within 3 seconds with streak multiplier applied.
  - Given counselor-signed quest, when reward issued, then CARE is simulated (no on-chain mint yet) and recorded as pending.
  - Reward breakdown endpoint returns base reward, multipliers, and pending on-chain actions.
- **Safety/Compliance**: All rewards modifications must be idempotent and auditable; attempt to issue negative rewards should be rejected.
- **Accessibility**: Reward breakdown data exposed to frontend for accessible UI (ARIA tables).

### R3: Dialogue Orchestrator MVP (DOS)

- **User Story**: As a student interacting with Aika, I receive empathetic guidance tied to my activity.
- **Acceptance Criteria**:
  - Aika responds within 3 seconds for cached prompts, 7 seconds for LLM responses.
  - Safety filters catch flagged phrases and route to human review; fallback script deployed for outage.
  - Echo memory system stores key preferences and surfaces them in future prompts.
- **Safety**: All flagged conversations tagged for counselor review; LLM requests rate-limited and logged.
- **Accessibility**: Provide text-only responses with optional speech synthesis toggle.

### R4: Attestation Service MVP (ATS)

- **User Story**: As a counselor, I want signed proof of student session completion recorded immutably.
- **Acceptance Criteria**:
  - Counselor portal can submit signed session; ATS validates signature and records hashed attestation.
  - Attestations batched and stored in Postgres with state `pending_onchain`.
  - Admin dashboard shows attestation queue with status updates.
- **Safety/Compliance**: Hashing mechanism ensures PII not stored on-chain; access logged in compliance audit trail.

### R5: Compliance Layer Foundation (CLS)

- **User Story**: As compliance officer, I need visibility and control over data access.
- **Acceptance Criteria**:
  - OPA policies enforce role-based access for staff endpoints.
  - Consent API stores student/counselor consents and exposes retrieval endpoint.
  - Audit log captures all counselor overrides, data exports, and attestation submissions.
- **Accessibility**: Admin tools must be navigable via keyboard and readable by screen readers.

### R6: Frontend Experience MVP

- **User Story**: As a student, I can view dashboard with quests, Lightstorm meter, and rewards; as counselor, I can view assigned students.
- **Acceptance Criteria**:
  - Dashboard shows current quests, statuses, streak, Harmony score, Lightstorm progress.
  - Quest completion flows accessible on mobile/desktop with responsive layout.
  - Counselor view lists students, recent quest completions, and a button for attestations.
- **Accessibility**: WCAG 2.1 AA compliance for color contrast, keyboard navigation, skip links.

### R7: CareQuest Hub – Typing Combat Mini-Game (MVP)

- **User Story**: As a student, I can play a typing-based mini-game where I type mental health affirmations to defeat "Gloom" monsters, earning `JOY`, `CARE`, and Harmony that syncs with my main quest profile, so I can practice positive self-talk while developing typing skills.
  
- **Acceptance Criteria**:
  
  **Typing Engine (Core Gameplay)**:
  - Given a monster appears, when a sentence is displayed, then player can type character-by-character with real-time visual feedback (green for correct, red shake for incorrect, gray for pending).
  - Given player types a sentence, when sentence is completed, then system calculates WPM, accuracy percentage, and mistakes count within 100ms.
  - Given typing metrics are calculated, when damage formula is applied, then total damage = (WPM/60 × 0.5 × accuracy) × upgrades × combo × crit multipliers.
  - Given player achieves 100% accuracy, when sentence completes, then critical hit triggers with 2.5x damage multiplier and golden sparkle animation.
  - Given player makes a typing mistake or exceeds 15 seconds per sentence, when combo tracker updates, then combo resets to 0 and toast notification displays "Combo broken".
  
  **Monster & Progression System**:
  - Given player is at Stage N, when monster is generated, then HP = Base HP × (1 + Stage × 0.2) × Type Multiplier.
  - Given player defeats 9 common monsters, when Stage 10 reached, then boss monster spawns with 5-10x HP and rewards.
  - Given player's Harmony rank increases, when new monsters spawn, then sentence difficulty tier increases correspondingly (rank 1 = difficulty 1, rank 6 = difficulty 6).
  - Given game state updates (stage, resources, upgrades), when change occurs, then localStorage saves snapshot within 500ms.
  
  **Sentence Database**:
  - Given player's current Harmony rank, when sentence is requested, then system returns sentence matching difficulty tier with bilingual support (English and Indonesian).
  - Given a sentence was recently typed, when new sentence is requested, then 72-hour cooldown prevents duplicate within same session.
  - Given sentence categories (Affirmations, Coping, CBT, Wisdom, Indonesian Sayings), when difficulty tier determined, then allowed categories filter appropriately (e.g., difficulty 1-2 only Affirmations).
  - Sentence database must contain minimum 25 sentences across 5 categories at MVP launch (expandable post-MVP).
  
  **Upgrade System**:
  - Given player has sufficient `JOY`/`CARE`/Harmony resources, when upgrade button clicked, then cost deducted, level incremented, and value recalculated per formula (cost = base × 1.15^level).
  - Given upgrades are purchased, when damage calculation occurs, then multipliers apply cumulatively (Typing Power affects base, Combo Mastery affects combo bonuses).
  - Four upgrades required: Typing Power (damage boost), Auto-Healer (passive DPS), Critical Insight (crit multiplier), Combo Mastery (combo bonuses).
  
  **Resource Synchronization**:
  - Given player earns `JOY`/`CARE`/Harmony in CareQuest Hub, when 5 seconds elapse or game exits, then delta values sent to `PATCH /api/v1/quests/state/update` endpoint.
  - Given backend confirms sync, when response received, then query invalidation triggers to refresh header wellness metrics.
  - Given sync fails (network error), when detected, then retry queue accumulates deltas and attempts sync every 10 seconds with exponential backoff.
  
  **UX & Accessibility**:
  - Given player is first-time user, when game loads, then onboarding tutorial displays with 3 guided sentences and mechanic explanations.
  - Given player completes session, when exit triggered, then summary modal shows stats (words typed, monsters defeated, WPM average, resources earned).
  - Given player has low accuracy (<50% for 5 consecutive sentences), when Compassion Mode triggers, then system offers easier sentences and supportive messaging without penalty.
  - Given player uses screen reader, when navigating typing interface, then ARIA labels announce current sentence, typed progress, and WPM/accuracy metrics.
  - Keyboard navigation must support Tab/Shift+Tab for focus management; Enter key confirms actions; Escape key cancels/exits modals.

- **Safety/Compliance**:
  - No punishment for mistakes; low accuracy reduces damage but never deducts resources or displays negative feedback.
  - Sentence content reviewed by counseling team for therapeutic appropriateness and cultural sensitivity before database inclusion.
  - Typing metrics (WPM, accuracy, session duration) logged for analytics but cannot identify individual users without consent (aggregated only).
  - Copy-paste disabled via `onPaste` event prevention to ensure authentic engagement.
  
- **Accessibility**:
  - WCAG 2.1 AA compliance for all UI elements (minimum 4.5:1 contrast ratio, scalable text, keyboard-only navigation).
  - Colorblind-friendly palette (green/red alternatives with icons/shapes for correct/incorrect feedback).
  - Optional high-contrast mode and reduced motion mode for photosensitive users.
  - Screen reader announcements for real-time typing feedback, combo triggers, and damage dealt.

- **Performance**:
  - Input latency <50ms between keystroke and visual feedback.
  - Smooth 60 FPS animations for damage numbers, HP bar transitions, and character highlighting.
  - Game fully functional offline; sync queue activates on reconnection.
  - Bundle size <500KB for typing engine components (lazy-loaded on hub route access).

- **Non-Goals for MVP**:
  - Advanced sentence generation via LLM (static database only).
  - Multiplayer typing races (future feature).
  - Leaderboard system (deferred to post-MVP).
  - Voice narration of sentences (accessibility enhancement for later phase).

## Dependencies

- Backend services: QES, RCS, DOS, ATS, CLS (Phase 0 alignment).
- **CareQuest Hub**: Typing engine utilities (`typingEngine.ts`, `sentenceSelector.ts`), sentence database JSON, backend wellness API endpoint (`PATCH /state/update`).
- Frontend components: Next.js counselor/student portals, MapLibre map, CareQuest Hub route (`/carequest/(hub)`).
- External approvals: Counseling team sign-off on sentence content, compliance sign-off, OJK sandbox consultation, security review.
- **New Approval Required**: Counseling team review of mental health sentence database for therapeutic appropriateness and cultural sensitivity.

## Non-Goals

- CARE token mainnet deployment and liquidity pools (Phase 3+).
- Full Gloom Encounter orchestration (Phase 4).
- Marketplace, seasonal festivals, guild governance (beyond MVP scope).
- Live peer-to-peer chat (placeholder only).
- **CareQuest Hub Deferred Features**: Monster sprite artwork (text placeholders acceptable for MVP), background illustrations (solid gradients acceptable), sound effects, advanced particle animations, prestige/ascension mechanics.

## Risks & Mitigations

| Risk | Impact | Mitigation | Owner |
| --- | --- | --- | --- |
| AI dialogue misstep | High | Safety filters, human review, fallback scripts | AI Lead |
| Quest overload causing fatigue | Medium | Compassion Mode, telemetry monitoring, user feedback loop | Product Lead |
| Counselor availability | Medium | Async attestation tooling, pilot scheduling, backup mentors | Counseling Lead |
| Sepolia downtime / gas spikes | Low | Batch submissions, retry queue, fall back to off-chain ledger | Blockchain Lead |
| Compliance audit failure | High | Early policy review, OJK liaison, logging tests | Compliance Lead |
| **Typing game becomes addictive/excessive** | Medium | Session time warnings after 30 minutes, daily cap of 2 hours with gentle lockout, usage analytics monitored by counselors | Product Lead |
| **Sentence content triggers distress** | High | All sentences reviewed by licensed counselors, trigger warnings for sensitive topics, skip button always available without penalty | Counseling Lead |
| **Input latency on low-end devices** | Medium | Performance profiling on target device range (Android 8+, iOS 12+), debouncing optimizations, graceful degradation for <30 FPS | Frontend Lead |
| **Sync conflicts between hub and main quest** | Low | Server-authoritative design, last-write-wins with client reconciliation, delta-based updates prevent overwrite | Backend Lead |

## Rollout Plan

- Feature flags: `feat.qes.m1`, `feat.rcs.m1`, `feat.dos.m1`, `feat.ats.m1`, `feat.cls.m1`, **`feat.carequest_hub.m1`** toggled per environment.
- Staging plan: Deploy to staging cluster with seeded test users; run integration suite; conduct counselor dry run; **CareQuest Hub isolated testing with 10 student volunteers for typing mechanics validation**.
- Pilot rollout: Invite 50 students, 5 counselors; monitor KPIs weekly; **CareQuest Hub metrics include average session duration, WPM progression, sentence completion rate, and correlation with main quest engagement**.
- Communication: Weekly update to stakeholders; in-app onboarding walkthrough; Slack announcements (#aicare-quest); **dedicated tutorial video for CareQuest Hub typing mechanics**.

## Open Questions

- What is the final SLA expectation for counselor attestation signing?
- Do we require language toggle at MVP or can we deliver bilingual copy sequentially?
- Should Compassion Mode trigger notifications to counselors by default?
- What legal disclaimers must appear before blockchain interactions (CARE pending)?
- **CareQuest Hub Specific**:
  - Should typing metrics (WPM, accuracy) be visible to counselors in student progress dashboards?
  - What is acceptable session time limit before suggesting break? (Current: 30 min warning, 2 hr soft cap)
  - Should sentence database include content warnings for sensitive topics (e.g., suicidal ideation references)?
  - Language toggle: Default to Indonesian for UGM students or let users choose on first launch?
