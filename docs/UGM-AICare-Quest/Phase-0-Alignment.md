# Phase 0 Alignment & Guardrails

## Cross-Disciplinary Summit
- **Participants**: Product lead, gameplay design, counseling lead, compliance officer, blockchain engineer, art director, live ops lead.
- **Agenda**:
  1. Review GDD high-level vision, KPIs, and success metrics.
  2. Confirm therapist/counselor involvement model and escalation policy.
  3. Validate blockchain scope with compliance (OJK considerations, user onboarding flow).
  4. Ratify feature taxonomy & naming conventions (Appendix 16.6) and agree on communication protocols.
  5. Map dependencies and team ownership per module.
  6. Approve MVP scope boundaries and defer non-critical features.

## Program Charter
- **Objective Statement**: Deliver UGM-AICare Quest MVP (Quest Engine, Rewards, Dialogue, Attestation, Compliance) with safety and regulatory guardrails by end of Phase 3.
- **KPIs (Phase 3 End)**:
  - 60% daily quest completion rate in closed pilot.
  - <5% quest failure due to system issues.
  - 100% of counselor actions logged with audit visibility.
  - Zero critical compliance or security breaches in audits.
- **Constraints**:
  - Maintain adherence to UU PDP and OJK digital finance guidelines.
  - All AI touchpoints undergo human-in-loop review before expansion.
  - Blockchain interactions limited to Sepolia until audit completion.

## PRD & Acceptance Templates
- Establish `docs/UGM-AICare-Quest/templates/PRD-template.md` (see Templates doc).
- Acceptance criteria format: Given/When/Then + safety checks + accessibility acceptance.
- Feature tracking via Linear/Jira with consistent labels (e.g., `module:QES`, `risk:compliance`).

## Repo & Environment Setup
- **Repo structure**:
  - `/docs/UGM-AICare-Quest` – documentation hub.
  - `/services/{qes,rcs,dos,ats,cls,sgs,nls,mss,ais}` – backend modules.
  - `/frontend` – Next.js app.
  - `/infra` – IaC (Terraform/Helm).
- **Branching**: trunk-based with feature branches, mandatory code reviews, security lint.
- **CI/CD Baseline**:
  - Build & unit test pipelines per service.
  - Static analysis (ESLint, mypy, bandit, solidity lint).
  - Secret scanning (gitleaks).
  - Deploy previews to staging cluster.
- **Observability**:
  - Standardized logging format (`timestamp level module message context`).
  - OpenTelemetry instrumentation scaffolding.
  - Initial dashboards: quest issuance, reward latency, dialogue errors.

## Security & Compliance Foundations
- Draft threat model outlining PII flows, quest exploitation risks, blockchain attack surface.
- Define data classification matrix (PII, PHI, gameplay data, on-chain data).
- Establish DPA/consent policy documentation; create consent forms for counselors and students.
- Configure access controls: SSO for staff, scoped service accounts, least privilege policies.
- Schedule external security audit booking (Phase 4).
- Incident response checklist (detection, severity classification, communication plan).

## Communication Plan
- Weekly cross-team sync with rotating facilitation.
- Daily async standup in shared channel (#aicare-quest).
- Decision log maintained in `/docs/UGM-AICare-Quest/decision-log.md` (template included).
- Quarterly steering committee review with university stakeholders.

## Risk Register (Initial)
| Risk | Impact | Mitigation | Owner |
| --- | --- | --- | --- |
| Regulatory delay | High | Early engagement with OJK legal team; sandbox participation | Compliance Lead |
| Counselor bandwidth | Medium | Asynchronous tooling, staggered pilot, recruit trainee counselors | Counseling Lead |
| LLM safety lapse | High | Human review queue, fine-tuned safety prompts, rate limiting | AI Lead |
| Blockchain volatility | Medium | Testnet-only until launch, treasury buffer, hedging policy | Blockchain Lead |
| Player attrition | Medium | Robust Compassion Mode, dynamic quests, weekly retention metrics | Product Lead |

