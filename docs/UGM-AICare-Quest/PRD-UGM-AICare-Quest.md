# UGM-AICare Quest MVP PRD

## Overview

- **Module**: Multi-module (QES, RCS, DOS, ATS, CLS, Frontend)
- **Owner**: Product Lead – UGM-AICare Quest
- **Goal / Problem Statement**: Deliver a gamified mental wellness experience for UGM students that transforms counseling milestones into cooperative quests, while ensuring regulatory compliance, counselor oversight, and transparent blockchain-based incentives.
- **Success Metrics**:
  - ≥60% of pilot users complete at least one daily quest per day during first 30 days.
  - ≥35% D7 retention among pilot cohort.
  - ≥90% of counselor-signed quests generate attestations within SLA (<10 min).
  - Zero P0/P1 security or compliance incidents during MVP trial.

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

## Dependencies

- Backend services: QES, RCS, DOS, ATS, CLS (Phase 0 alignment).
- Frontend components: Next.js counselor/student portals, MapLibre map.
- External approvals: Counseling team sign-off, compliance sign-off, OJK sandbox consultation, security review.

## Non-Goals

- CARE token mainnet deployment and liquidity pools (Phase 3+).
- Full Gloom Encounter orchestration (Phase 4).
- Marketplace, seasonal festivals, guild governance (beyond MVP scope).
- Live peer-to-peer chat (placeholder only).

## Risks & Mitigations

| Risk | Impact | Mitigation | Owner |
| --- | --- | --- | --- |
| AI dialogue misstep | High | Safety filters, human review, fallback scripts | AI Lead |
| Quest overload causing fatigue | Medium | Compassion Mode, telemetry monitoring, user feedback loop | Product Lead |
| Counselor availability | Medium | Async attestation tooling, pilot scheduling, backup mentors | Counseling Lead |
| Sepolia downtime / gas spikes | Low | Batch submissions, retry queue, fall back to off-chain ledger | Blockchain Lead |
| Compliance audit failure | High | Early policy review, OJK liaison, logging tests | Compliance Lead |

## Rollout Plan

- Feature flags: `feat.qes.m1`, `feat.rcs.m1`, `feat.dos.m1`, `feat.ats.m1`, `feat.cls.m1` toggled per environment.
- Staging plan: Deploy to staging cluster with seeded test users; run integration suite; conduct counselor dry run.
- Pilot rollout: Invite 50 students, 5 counselors; monitor KPIs weekly; gather qualitative feedback.
- Communication: Weekly update to stakeholders; in-app onboarding walkthrough; Slack announcements (#aicare-quest).

## Open Questions

- What is the final SLA expectation for counselor attestation signing?
- Do we require language toggle at MVP or can we deliver bilingual copy sequentially?
- Should Compassion Mode trigger notifications to counselors by default?
- What legal disclaimers must appear before blockchain interactions (CARE pending)?
