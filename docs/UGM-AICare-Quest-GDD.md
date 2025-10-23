# UGM-AICare Quest – Game Design Document (GDD)

*Version:* 0.9  
*Date:* 23 October 2025  
*Authors:* UGM-AICare Hackathon Team (Product, Design, Engineering)  
*Project Codename:* “UGM-AICare Quest”  
*Target Hackathon:* Infinity Hackathon OJK – Ekraf (Game-Fi Subtheme)  

---

## 1. Executive Summary

| Item | Description |
| --- | --- |
| **Elevator Pitch** | UGM students enter a narrative-driven wellness RPG that blends counseling milestones with Game-Fi rewards. Players collaborate with Aika (AI mentor), human counselors, and community allies to restore “Harmony Nodes” across a stylized digital twin of the UGM campus. |
| **Genre** | Social RPG / Wellbeing Game-Fi Hybrid |
| **Platforms** | Responsive Web (desktop/mobile), PWA-ready |
| **Core Loop** | Complete wellness quests → earn XP/`JOY` → restore campus nodes → unlock narrative arcs, NFT avatars, DeFi rewards. |
| **Target Audience** | UGM undergrads & alumni (18–30), counselor cohort, community sponsors. |
| **Business Model** | Institutional sponsorship, DeFi staking, optional cosmetic passes, NFT royalties. |
| **Regulatory Context** | Align with OJK digital finance policies, Indonesian data protection (UU PDP), campus ethics. |

---

## 2. Design Pillars

1. **Care x Play Integration** – Wellness tasks are reframed as heroic quests with immediate, meaningful feedback.
2. **Collaborative Empathy** – Guild systems and counselor “boss battles” require multi-role cooperation, not competition.
3. **Transparent Impact** – Blockchain-backed rewards and funding pools show clear benefit to campus mental health.
4. **Safe & Inclusive** – AI moderation, privacy-aware data flows, and culturally-resonant storytelling ensure trust.

---

## 3. Audience & Personas

| Persona | Profile | Motivation | Game Hooks |
| --- | --- | --- | --- |
| **Nadia – Anxious Freshman** | 19 y/o, entering UGM, overwhelmed | Build routines, feel supported anonymously | Daily quests, Aika dialogues, streak rewards |
| **Rafi – Social Connector** | 22 y/o, final year student, hostel leader | Support peers, organize events | Guild raids, community buffs, leaderboards |
| **Dr. Sari – Counselor** | Licensed psychologist | Engage students, track progress | Mentor badges, live “boss fight” sessions |
| **Ekraf Sponsor** | Corporate/NGO sponsor | Visible impact, compliance assurance | Wellness pool dashboards, branded quests |

Accessibility: Provide Bahasa Indonesia & English localization, colorblind-friendly palette, screen-reader support, variable text size, optional low-stimulus UI.

---

## 4. Narrative & World

### 4.1 Setting

- Stylized digital twin of Universitas Gadjah Mada.
- “Harmony Nodes” represent key areas (Academics, Community, Resilience, Identity, Purpose).
- “Gloom” manifestations (stress, burnout) threaten nodes; players cleanse through wellness actions.

### 4.2 Story Arc

1. **Act I – Awakening:** Dorm disturbances introduce Aika; players discover latent Harmony Nodes and learn routine-based quests. Boss Encounter: *Midnight Panic* (anxiety manifestation) dispelled via breathing exercises and peer check-ins.
2. **Act II – Campus Bonds:** Faculties face escalating Gloom storms tied to exams and social pressure. Guild alliances form; faculty-specific storylines unlock. Boss Encounter: *Storm of Deadlines* requiring collective time management rituals and counselor workshops.
3. **Act III – Eclipse Trials:** Campus-wide cooperative event where the Harmony Core destabilizes. Players coordinate large-scale rituals—hybrid IRL/virtual—to stabilize energy. Boss Encounter: *Shadow of Burnout*, a multi-phase battle balancing self-care, peer support, and counselor interventions.
4. **Act IV – Resonance Beyond** (Post-launch): UGM links with external communities (alumni, partner universities). Players open Resonance Gates, exporting best practices and earning cross-campus rewards.

### 4.3 Characters & Development

- **Aika**: Adaptive AI mentor; dialogue evolves with player choices and streak history.
- **Counselor Mentors**: Licensed professionals via Soulbound NFTs; issue high-tier quests, validate therapy milestones.
- **Guildmates**: Player cohorts (dorms, faculties) enabling cooperative mechanics with optional anonymity.
- **Gloom Entities**: Abstract stressor manifestations escalating per act.
- **Supporting Cast**:
  - **Bumi** – Earth sciences student; guides exploration quests and environmental wellness wisdom.
  - **Rara** – Arts faculty creative; unlocks expressive therapy quests and cosmetic crafting.
  - **Arif** – Engineering senior balancing heavy workload; introduces productivity-focused nodes.
  - Characters receive personal questlines, evolving dialogue, and shared events as acts progress.

### 4.4 Story Progression & Feature Unlocks

| Stage | Requirements | Narrative Beat | Features Unlocked |
| --- | --- | --- | --- |
| **Initiate** | Complete onboarding + first daily quest | Meet Aika, learn about Gloom | Basic quests, profile customization, `JOY` tracking |
| **Harmony Seeker (Level 5)** | Maintain 3-day streak, attend intro workshop | Discover first Harmony Node | Campus map view, node purification mini-games, guild invitations |
| **Guild Envoy (Level 10)** | Join guild, contribute to raid | Alliance between dorms/faculties | Guild chat, resource sharing, guild buffs, Lightstorm meter |
| **Mentor Ally (Level 15)** | Finish counselor questline, earn trust badge | Face *Storm of Deadlines* with mentors | Advanced rituals, Lightstorm abilities, Wellness Pool staking |
| **Guardian of Resonance (Level 20)** | Stabilize 3 nodes, Harmony Score ≥ 80 | Access Act III: Eclipse Trials | Cross-node raids, rare relic crafting, DAO proposal voting |
| **Campus Luminary (Post-Launch)** | Participate in Act IV content, governance votes | Open Resonance Gates beyond UGM | Inter-campus quests, partner rewards, advanced governance tools |

---

## 5. Gameplay Overview

### 5.1 Core Loop

1. Receive contextual quests from Aika / counselors.
2. Complete actions (journaling, session attendance, peer support).
3. Earn XP, `JOY`, Harmony score.
4. Spend on upgrades, unlock narrative chapters, contribute to Wellness Pools.
5. Progress nodes, trigger campus-wide events.

#### 5.1.1 Core Loop Step-by-Step Breakdown

**1. Quest Surface & Contextualization**

- Triggers: daily reset, event notifications, counselor overrides, or player-requested support.
- Data Inputs: player mood trends, Harmony Score, guild status, academic calendar, safety flags.
- UX Elements: Quest HUD notification, Aika dialogue snippet framing the objective, difficulty tags, estimated time commitment, suggested companions (guildmates, mentors).
- Personalization: Aika references recent behavior (“You’ve been acing your journaling streak—ready to try a reflection quest tied to exam prep?”). Quests dynamically adapt (lighter tasks if streak broken, optional intensifiers for high Harmony players).
- Safety Layer: Content filtered through sentiment analysis; high-risk players receive supportive quests with counselor awareness.

**2. Action Execution & Support**

- Interaction Types:
  - In-app forms (mood logs, gratitude entries with journaling templates).
  - Guided experiences (breathing timers, CBT flashcards).
  - External verification (attend booked session → counselor confirms).
  - Social engagement (respond to peer post, join guild chat check-in).
- Assistive Features: Contextual tips, quick links to relevant resources, option to request live support. Timer/scheduler for longer tasks; progress saved mid-quest.
- Multiplayer Hooks: Shared tasks show live progress bars; guildmates can send boosts (e.g., encouragement emotes unlocking small `JOY` bonus).
- Accessibility: Multi-language content, audio narration toggle, low-stimulus mode for sensitive exercises.

**3. Reward Calculation & Feedback**

- Backend Flow: Quest service validates completion criteria → emits event to Rewards Calculator → applies multipliers (streak bonuses, guild buffs, sponsor boosts) → writes outcome to player profile and ledger.
- Reward Types:
  - XP for avatar level progression and skill unlocks.
  - `JOY` for cosmetic purchases and mini-games.
  - Harmony Score adjustments affecting narrative gating and guild rankings.
  - Potential `CARE` drops for high-impact or counselor-signed tasks.
- Feedback UI: Animated HUD update, toast notification with flavor text, audio chime tuned to quest category, optional share-to-guild button. Aika sends follow-up reflection or next-step suggestion.
- Transparency: Reward breakdown panel shows base reward vs. multipliers, with link to blockchain attestation when applicable.

**4. Resource Allocation & Upgrade Decisions**

- Player Choices:
  - Spend `JOY` on avatar cosmetics, temporary buffs, or mini-game entries.
  - Allocate `CARE` to Wellness Pools, guild upgrades, or governance staking.
  - Invest Harmony Score thresholds into unlocking story chapters or mentor workshops.
- UI Elements: Resource dashboard with projections (e.g., staking yield estimates), “Recommended next spend” tips, comparison view of guild upgrade benefits.
- Strategic Layer: Limited-time offers during events, diminishing returns for hoarding, opportunity cost prompts (“Contribute `CARE` to dorm pool to unlock shared resilience aura?”).

**5. World Impact & Escalation**

- Node Progression: Harmony energy deposited into targeted campus nodes; visual changes on digital twin map (color shifts, particle effects).
- Event Triggers: Reaching thresholds spawns Gloom encounters, unlocks cooperative raids, or activates seasonal content.
- Narrative Advancement: New dialogue, cutscenes, or branching choices appear; supporting characters reveal personal questlines.
- Social Feedback: Guild leaderboards updated, community announcements broadcast, sponsors receive engagement analytics.
- Loop Closure: Aika summarizes impact (“Your dorm’s Harmony Node is now stable—ready to tackle the faculty-wide challenge?”) and seeds next quest cycle based on emerging needs.

### 5.2 Secondary Loops

- **Weekly Guild Raids:** Collective goals (e.g., “1,000 mindful minutes”).
- **Seasonal Festivals:** Limited-time events, sponsor booths.
- **Live Sessions:** Counselors host synchronous group quests.
- **Marketplace:** Trade cosmetic NFT relics, allocate `CARE`.

#### 5.2.1 Weekly Guild Raids

- **Structure**: Weekly cadence with themes (e.g., “Exam Calm Week”). Quests distributed across difficulty tiers; guild leaders assign members to roles (Supporter, Strategist, Scout).
- **Progress Measurement**: Live progress bar combining contribution metrics (minutes of mindfulness, peer encouragement count). Includes streak multiplier for guilds maintaining consecutive completions.
- **Rewards**: Guild-wide buffs (increased Harmony gains), `CARE` shards, exclusive relic crafting materials. Top-performing guilds gain ceremonial banners on campus map.
- **Social Dynamics**: Internal leaderboards, shout-out feed for standout contributors, ability to gift “Light Sparks” to under-contributing members to encourage participation.
- **Failure Handling**: Partial rewards if minimum threshold met; Aika provides retrospective analysis and suggested training quests for improvement.

#### 5.2.2 Seasonal Festivals

- **Timeline**: 8-week seasons with mid-season “Harmony Fair” weekend. Includes sponsor booths and hybrid IRL/virtual events.
- **Activities**: Limited-time mini-games (e.g., rhythm breathing game), scavenger hunts across digital twin, collaborative art walls, panel sessions with counselors.
- **Economy Impact**: Festival tokens earned can be exchanged for cosmetics, Stark drop NFTs, or converted into `JOY`. Sponsors may match contributions to Wellness Pools during festival windows.
- **Narrative Integration**: Seasonal storylines introduce unique Gloom variants and supporting characters; festival completions influence next season’s theme via governance vote.
- **Operations**: Live Ops dashboards monitor participation peaks, allow push notifications, and adjust difficulty in real-time.

#### 5.2.3 Live Sessions

- **Format**: Real-time group sessions led by counselors or trained peer facilitators; capped attendance for intimacy, with waitlist system.
- **Session Types**: Guided meditation, CBT skill drills, open support circles, exam prep clinics. Each session mapped to quest mechanics (e.g., “Defeat Gloom by practicing grounding exercise together”).
- **Tech Stack**: Embedded video/voice (WebRTC) with chat moderation, interactive polls, and collaborative journaling board.
- **Rewards**: Attendance yields rare skill cards, counselor badges, high-tier `CARE` drops when session outcomes verified. Bonus for completing post-session reflection forms.
- **Safety & Compliance**: Real-time moderation tools, escalation workflow for distress signals, consent reminders. Sessions recorded (audio summary) for counselor review only, stored per privacy policies.

#### 5.2.4 Marketplace & Economy Loop

- **Offerings**: Avatar skins, node decorations, music packs, light trails. Rotating inventory per season, limited editions for festival participants.
- **Pricing**: `JOY` for everyday items; `CARE` or relic trade-ins for premium. Supports bundle discounts, flash sales tied to node health events.
- **Player-to-Player Trading**: Auction house for tradable relics with anti-fraud protections; royalties flow to community treasury.
- **DeFi Tie-in**: Marketplace fees partly burned, partly funneled into Wellness Pools. On-chain receipts displayed in impact dashboard.
- **UX Enhancements**: Wishlists, preview functionality, AR try-on for mobile users, accessible layout for screen readers.

### 5.3 Player Agency

- Dialogue choices with Aika affect supportive tone and quest difficulty.
- Guild governance via `CARE` voting (e.g., next Harmony Node focus).
- Opt-in toggles for public/anonymous contributions.

#### 5.3.1 Dialogue & Narrative Influence

- **Branching System**: Player responses categorized (Reflective, Action-Oriented, Lighthearted) influencing Aika’s future tone and quest difficulty.
- **Memory Mechanics**: Key choices stored as “Echoes” used to unlock personalized storylets, impact character relationships, and trigger hidden quests.
- **Emotional Safety**: Options allow players to skip sensitive topics; fallback scripts ensure supportive messaging. Negative choices never punish, instead redirect to supportive resources.
- **Localization & Culture**: Dialogue respects Indonesian cultural nuances; offers language toggles mid-conversation.

#### 5.3.2 Governance & Social Agency

- **Voting Mechanisms**: `CARE` token holders partake in proposals (next Harmony Node priority, budget allocations, festival themes). Quadratic voting considered to prevent plutocracy.
- **Guild Autonomy**: Guild councils can set internal quest rotations, manage treasury contributions, and nominate mentor-apprentice pairs.
- **Player-Created Quests**: High reputation players can submit quest ideas; require counselor approval. Rewards include recognition, limited `CARE` bounties.
- **Transparency**: Governance outcomes displayed in dashboard; Aika summarizes decisions.

#### 5.3.3 Privacy & Control

- **Visibility Toggles**: Players choose what actions are public (anonymous option for sensitive quests), can opt out of leaderboards.
- **Data Rights**: In-app data export, deletion request flow, consent history view.
- **Safety Modes**: “Quiet Mode” limits social notifications; “Support Mode” signals counselors/guildmates that player seeks assistance.

#### 5.3.4 Progression Flexibility

- **Path Selection**: Players choose specialization paths (Seer, Resonator, Pathfinder) influencing skill unlocks, quest focus, and narrative arcs.
- **Difficulty Modulation**: Manual adjustment for quest intensity, enabling slower pacing without losing streaks.
- **Cross-Platform Choice**: Seamless continue on mobile/desktop; offline journaling mode syncs later to support low-connectivity users.

---

## 6. Systems & Mechanics

### 6.1 Quests

| Quest Type | Description | Trigger | Reward Bias |
| --- | --- | --- | --- |
| **Daily Solo** | Journaling, gratitude, sleep check-ins | Time-based, AI prompts | XP, `JOY` |
| **Structured Therapy** | Session attendance, CBT homework | Counselor schedule | XP, `CARE`, Mentor badge upgrade |
| **Peer Support** | Encourage guildmate, share resource | Social feeds, event | Harmony score, guild buffs |
| **Exploration** | AR campus scavenger, story nodes | Geo-tagged hints | Cosmetic NFTs, lore fragments |
| **Emergency Support** | Crisis plan review, hotline contact | Safety flag, counselor | Shield booster, relapse vault bonus |

#### 6.1.1 Quest Lifecycle

- **Generation**: Quest Engine composes bundles using player personas, current Harmony Node status, calendar entries (exam periods, holidays), counselor directives, and safety overrides. Weighted randomization balances novelty with wellness adherence; duplication guard prevents repeated tasks within 72 hours.
- **Presentation**: Each quest payload includes objective description, rationale, estimated effort, sensitivity rating, recommended companions, and adaptive hints. Payloads are signed to prevent tampering and cached for offline initiation.
- **Execution Tracking**: Client emits progress telemetry (start, pause, resume, completion) with device metadata. Long-duration quests send heartbeat pings every 5 minutes; missing heartbeats triggers gentle reminders rather than failure.
- **Validation**: Submission validators confirm schema, rate limits, and contextual proof:
  - Structured data (journals) scanned for toxicity and minimal length.
  - Attendance quests require counselor confirmation or integration with scheduling system.
  - Peer support tasks cross-check moderator approvals to avoid reward farming.
- **Post-Processing**: Validated completions publish events to Rewards Calculator, update streak services, notify Dialogue Orchestrator, and append to analytics pipelines.

#### 6.1.2 Dynamic Difficulty & Personalization

- **Adaptive Profiles**: Difficulty score recalculated daily based on streak length, mood volatility, self-reported stress, counselor feedback, and time availability. Players can opt in/out of challenge tiers.
- **Quest Chains**: Multi-step arcs unlock when prerequisites met. Branches alter subsequent objectives—e.g., failing a stress-management quest pivots to supportive reflection before reattempt.
- **Mentor Overrides**: Counselors/guild leaders can pin mandatory quests (e.g., crisis response) with player consent. Overrides expire after completion or 48 hours to avoid overload.
- **Safety Guardrails**: High-sensitivity quests allow snooze/skip without penalty, surface hotline buttons, and send silent alerts to counselors if declined repeatedly.

### 6.2 Progression & Stats

- **Avatar Level** = XP from quests; unlocks skills (e.g., Calm Burst).
- **Harmony Score** = Weighted average of quest consistency, peer support.
- **Mood Attributes** (Calm, Focus, Connection, Resilience) tracked via check-ins; affect quest success probability.
- **Guild Rank** = Aggregated Harmony Score + event contributions.

#### 6.2.1 Progression Formulas

- **XP Curve**: Required XP per level = `base_xp * level^1.2`. Weekly booster adds 10% bonus for first 5 quests to encourage early engagement; cap prevents exceeding 3 levels/week.
- **Harmony Score Calculation**:
  - 40% quest completion ratio (weighted by difficulty & therapeutic value).
  - 30% social contribution index (peer support validated by positive sentiment).
  - 20% streak consistency (normalized).
  - 10% counselor feedback (manual or automated).
  Score decays 5% weekly when inactive; Compassion Mode can freeze decay once per month.
- **Mood Attribute Influence**: Each quest requires minimum mood thresholds; failing threshold reduces reward multiplier but unlocks restorative quests. Attributes regenerate via targeted tasks and counselor interventions.
- **Skill Trees**: Archetype-specific trees (Seer, Resonator, Pathfinder) with passive (e.g., +5% Harmony from reflective quests) and active abilities (Lightstorm boosts). Unlock via level milestones and special achievements.

### 6.3 Combat Analogue - "Gloom Encounters"

1. Node enters Gloom state (e.g., exam stress week).
2. Players contribute actions (breathing exercises, group study sessions).
3. Each action charges "Lightstorm." When threshold met, boss shield breaks.
4. Final counselor-led event resolves encounter, distributes rare drops.

#### 6.3.1 Encounter Phases

- **Calibration Phase**: Upon activation, encounter engine estimates participant volume, average Harmony Score, and risk indicators to scale boss HP, shield layers, and required action mix.
- **Shield Phase**: Diversified objectives—e.g., 40% wellness routines, 30% peer support, 30% learning activities—to prevent single-strategy exploits. Live dashboards show real-time progress by category.
- **Core Exposure Phase**: Triggered during scheduled live session. Interactive polls, reflective prompts, or guided breathing reduce core stability. Counselors adapt prompts based on sentiment feedback.
- **Recovery Phase**: Post-event reflective quests, gratitude walls, and communal celebrations ensure psychological closure. Rewards distributed via fairness algorithm (participation threshold + contribution weighting + anti-bot heuristics).

### 6.4 Failure & Support

- Missing streak triggers "Compassion Mode": lower quest intensity, supportive messages, option to request counselor outreach.
- "Relapse Protection Vault" offers financial and in-game safety net (see economy).

#### 6.4.1 Intervention Mechanics

- **Compassion Mode**: Activates automatically after two consecutive missed dailies or manual request. Reduces daily quest load by 40%, increases supportive narrative prompts, pauses Harmony decay. Exits after completion of a reset quest or counselor override.
- **Relapse Vault Workflow**: Players stake `CARE`; if streak drops below threshold, portion of stake redirected to emergency support while player receives stipend (`JOY`, therapy voucher). DAO defines parameters to deter exploitation.
- **Counselor Escalation**: High-risk signals create high-priority tickets. Counselors view synthesized dossier (latest mood logs, quest history) before outreach; all access logged for compliance.
- **Analytics Feedback**: Failure events aggregated for Live Ops dashboards to adjust quest difficulty/time windows rapidly; A/B tests evaluate effectiveness of Compassion Mode tweaks.

---

## 7. Economy & Blockchain

### 7.1 Currency Model

- **`JOY` (Soft Currency)**: Off-chain, earned from routine quests, spent on cosmetics, mini-games.
- **`CARE` (Utility/Governance Token)**: On-chain ERC-20; distributions from staking, guild events, counselor quests. Used for:
  - Voting on guild priorities
  - Unlocking premium quest arcs
  - Staking in Wellness Pools
- **`Harmony Score`**: Non-tradable metric for reputation, gating story arcs.

### 7.1.1 `CARE` Tokenomics

| Component | Allocation | Vesting / Release | Notes |
| --- | --- | --- | --- |
| **Community Rewards** | 35% | Linear over 36 months with weekly emissions | Earned via quests, guild raids, campus events. |
| **Wellness Incentive Pool** | 20% | Managed via DAO-controlled smart contract | Funds therapy subsidies, relapse vault coverage. |
| **Founding Team & Counselors** | 15% | 12-month cliff, 24-month linear vest | Incentivizes stewardship and counselor participation. |
| **University & Strategic Partners** | 10% | 6-month cliff, 18-month linear vest | Aligns campus administration and sponsors. |
| **Sustainability Treasury** | 10% | Unlocked; governed by multisig & DAO | Supports audits, security, marketing. |
| **Liquidity & Market Making** | 5% | At TGE (Token Generation Event), replenished as needed | Establishes trading pools (DEX/CEX). |
| **Reserve (Future Grants)** | 5% | Locked for 24 months | Grants, accelerator programs, contingency. |

#### Emission Mechanics

- Emissions handled by configurable `Caretaker` smart contract; adjustable via governance.
- Seasonal quest multipliers boost rewards during awareness campaigns.
- Staking yields scale with node health; cap APR to prevent runaway inflation.
- Treasury buyback-and-burn executes when treasury runway exceeds 18 months.

#### Utility Summary

- Governance voting on quests, seasonal themes, treasury allocations.
- Unlocks premium features (advanced analytics, custom avatar slots, counselor masterclasses).
- Required collateral for Wellness Pools, Relapse Vault participation.
- Escrowed for counselor commitments; slashed if service levels unmet.

#### Token Roadmap

| Phase | Timeline | Milestone | Description |
| --- | --- | --- | --- |
| **Phase 0 – Testnet** | Q4 2025 | Sepolia deployment | Launch `CARE` test token, stress-test staking & quest rewards. |
| **Phase 1 – Controlled TGE** | Q1 2026 | Invite-only release | Distribute to pilot cohorts, counselors, sponsors; open governance portal. |
| **Phase 2 – Liquidity Expansion** | Q2 2026 | DEX listings | Add liquidity pools, fiat on-ramp, campus cross-promo. |
| **Phase 3 – DAO Evolution** | Q3 2026 | Delegated governance | Transition treasury decisions to token-weighted/quadratic voting. |
| **Phase 4 – Cross-Ecosystem Partnerships** | Q4 2026+ | External quests | Integrate `CARE` into partner dApps (edtech, wellness), expand to other universities. |

### 7.2 NFTs & Tokens

- **Care Avatars (ERC-6551)**: Dynamic NFTs representing player identity; embedded wallet for equipment.
- **Soulbound Credentials**: Counselors and verified mentors receive non-transferable badges.
- **Relic NFTs**: Limited event drops, tradeable; royalties routed to community treasury.
- **Campus Node NFTs**: Governance tokens representing contributions to specific nodes.

### 7.3 DeFi Integrations

- **Wellness Pools**:
  - Players & sponsors stake `CARE`.
  - Yield funds subsidized therapy sessions.
  - Smart contracts release funds when milestones verified.
- **Relapse Protection Vault**:
  - Optional `CARE` staking with social insurance mechanics.
  - Failing streak triggers partial slashing redirected to emergency support; players receive reflective support quest.
- **Transparent Dashboards**:
  - On-chain data visualized in-app (fund inflows/outflows, beneficiary count).
  - Align with OJK compliance; integrate audit logs.

### 7.4 Regulatory Safeguards

- Contracts audited, upgradeable behind multisig with compliance oversight.
- Data privacy preserved via:
  - Off-chain personal data.
  - Hash-based proofs & ZK attestations for sensitive achievements.
  - Consent flows recorded on-chain (soulbound consent tokens).

---

## 8. User Experience & UI

### 8.1 UX Flow

1. **Onboarding**: Students meet Aika, select avatar archetype, consent to data sharing.
2. **Dashboard**: Harmony summary, quests, streak meters.
3. **Quest Map**: Campus twin with nodes, events, guild territories.
4. **Dialogue Overlay**: RPG-style interactions with Aika; branching choices.
5. **Marketplace**: Equip avatar, view NFT gallery, stake in pools.
6. **Counselor Hub**: Mentor dashboards for issuing quests, reviewing outcomes.

### 8.2 UI Components

- **HUD Overlay** (integrated into `AppLayout`):
  - XP bar, `JOY`, `CARE`, status effects.
  - Quick quest tracker with timers.
- **Quest Cards**: Framer Motion animations, color-coded difficulty.
- **Notifications**: Toaster prompts for quest updates, pool payouts.
- **Accessibility Toggles**: High contrast, minimal animation mode, screen reader labels.

### 8.3 UX Metrics

- Session length, quest completion, streak retention.
- Drop-off analysis by quest category, accessibility preference usage.

---

## 9. Content & Live Ops

### 9.1 Seasonal Structure

- **Season Length**: 8 weeks.
- **Season Themes**: e.g., “New Semester Balance,” “Exam Resilience,” “Community Care Fest.”
- **Deliverables per Season**:
  - 3–4 story chapters.
  - 1 guild raid.
  - 2 live counselor events.
  - Limited-time cosmetics & NFT relics.

### 9.2 Content Pipeline

- Narrative team authors quest scripts and branching dialogues (managed via CMS).
- Counselors curate support tips and validations.
- AI moderation tools review user-generated support messages pre-posting.

### 9.3 Live Ops Tools

- Web console for quest configuration, rewards tuning, emergency broadcasts.
- Analytics dashboards: engagement, counselor response times, DeFi metrics.
- Incident management: escalate flagged content, triage mental health emergencies.

---

## 10. Technical Architecture

### 10.1 Overall Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | Next.js (App Router), TypeScript, TailwindCSS, Framer Motion, MapLibre GL / Three.js |
| **State & Data** | React Query, Zustand for HUD, WebSocket/SSE for live updates |
| **Backend** | FastAPI microservices (Quest Engine, Rewards Service, Dialogue Orchestrator, Attestation Service) |
| **Database** | PostgreSQL (primary), Redis (caching/queues), ElasticSearch (logs) |
| **Blockchain** | Solidity (ERC-20 `CARE`, ERC-6551 Avatars, quest contracts), deployed on Sepolia testnet; Chainlink Functions or Gelato for automation |
| **AI Components** | Hosted LLM with guardrails (e.g., Vertex AI + safety filters), custom prompt layers for Aika dialogue; sentiment detection service |
| **Infra & DevOps** | Docker, Kubernetes (optional), CI/CD (GitHub Actions), Monitoring (Prometheus, Grafana) |

### 10.2 Service Modules

  1. **Quest Engine Service**
     - **Responsibilities**: Quest generation, lifecycle management (available → in-progress → completed/expired), streak updates, Compassion Mode triggers.
     - **Interfaces**: REST (`/quests`, `/quests/{id}`), GraphQL resolver for quest feed, gRPC endpoint for counselor overrides, message bus topics for quest status.
     - **Data Stores**: `quests`, `quest_instances`, `player_progress`, `streaks` (Postgres); Redis cache for active quests and cooldown timers.
     - **Scaling & Resilience**: Auto-scaled pods with circuit breakers; per-user rate limiting; scheduled workers for midnight quest rotation; reconciliation job for offline completions.
     - **Observability**: OpenTelemetry traces, Prometheus metrics (issue rate, failure rate, latency), structured logs keyed by quest IDs.
  
  2. **Rewards Calculator**
     - **Input**: Quest completion events via Kafka/SQS; manual adjustments from admin console.
     - **Processing**: Applies reward formulas (XP, `JOY`, Harmony, `CARE`) with streak multipliers, sponsor boosts, anti-abuse heuristics.
     - **Blockchain Integration**: Calls Smart Contract API to mint `CARE`, update Avatar NFTs, adjust staking balances; maintains retry queue for failed transactions.
     - **Data Stores**: `reward_events`, `player_balances`, `token_claims`; append-only ledger for audit; cached on-chain transaction receipts.
     - **Transparency & Safety**: Reward breakdown API, CSV export, anomaly alerts when reward spikes detected.
  
  3. **Dialogue Orchestrator**
     - **Responsibilities**: Manages Aika sessions, prompt construction, memory retrieval (“Echoes”), fallback scripting.
     - **Integrations**: LLM provider (Vertex/OpenAI) with guarded client, toxicity classifier, translation service, personalization vector DB.
     - **Runtime**: Supports streaming responses, caches common prompts, gracefully degrades to scripted dialogue when LLM unavailable.
     - **Safety**: Content filter pipeline, escalation to human queue, conversation redaction and retention policies.
  
  4. **Attestation Service**
     - **Workflow**: Ingests signed proofs (counselor attestations, third-party integrations), validates signatures/schemas, standardizes records.
     - **Blockchain Output**: Batches hashed attestations, submits via relayer to QuestFactory contract; optional zk-proof generation for privacy-sensitive completions.
     - **Interfaces**: REST/webhooks for partner systems, admin console for audit review, monitoring endpoints for on-chain status.
     - **Reliability**: Transaction tracking with exponential backoff retries; alerts on backlog or failed submissions.
  
  5. **Compliance Layer**
     - **Policy Enforcement**: Open Policy Agent sidecar evaluates context-aware access rules (role, purpose, location, time).
     - **Audit Trail**: Immutable log store capturing all sensitive operations; regulator export tooling.
     - **Consent & Rights**: APIs for consent capture, revocation propagation, data export/delete workflows with counselor approval gates.
     - **Reporting**: Compliance dashboards, incident response tooling, periodic attestation generation.
  
  6. **Social & Guild Service**
     - **Scope**: Guild membership, role assignments, chat channels, Lightstorm meters, reputation scoring, guild quest coordination.
     - **Tech**: WebSocket gateway/PubSub for live chat; Postgres + Redis for guild/leaderboard data; integrates with moderation service.
     - **Governance**: Facilitates guild proposals/voting; writes outcomes to governance ledger; enforces quorum and cooldown rules.
  
  7. **Notification & Live Ops Service**
     - **Delivery**: Multi-channel (push, email, SMS optional, in-app banners) respecting quiet hours and player preferences.
     - **Scheduling**: Priority queue handles reminders, event broadcasts, personalized nudges with regional cron schedules.
     - **Experimentation**: Segmentation, A/B testing, analytics feedback loops to optimize messaging.
     - **Failover**: Falls back to in-app notifications when external providers fail; deduplicates to prevent spam.
  
  8. **Moderation & Safety Service**
     - **Pipelines**: NLP classifiers + rule engines monitor journals, chat, community posts; integrates human-in-the-loop workflows.
     - **Escalation**: Severity-based routing to counselors/moderators with contextual snapshots and suggested responses.
     - **Tooling**: Review console, redaction tools, annotation for model retraining; decision logs retained for auditing.
  
  9. **Analytics & Insights Service**
     - **Data Flow**: Event ingestion (Kafka) → ETL (dbt/Beam) → warehouse (BigQuery/Snowflake) → BI dashboards.
     - **Outputs**: Product analytics, counselor insights, tokenomics monitoring, A/B experiment reports.
     - **Privacy**: Applies anonymization, differential privacy where necessary; enforces retention and access policies.

### 10.3 Data Protection

- PII stored encrypted at rest; separate schema from gameplay data.
- Access logs enforced with ABAC (role + contextual rules).
- Sensitive operations require counselor/admin MFA.
- Disaster recovery with daily snapshots.

### 10.4 Integration with Current Codebase

- **Frontend**:
  - Extend `frontend/src/app/(main)` with `/quests`, `/map`, overlays.
  - Reuse `AppLayout` to inject quest HUD.
  - Add React Query hooks (`useQuestProgress`, `useGuildData`).
- **Backend**:
  - Add FastAPI routes under `/api/v1/quests`, `/api/v1/harmony`.
  - Integrate with existing authentication (NextAuth tokens).
  - Event bus integration (existing `event_bus.py`) to emit quest events.
- **Blockchain**:
  - Wrapper service for interacting with smart contracts using Web3.py.
  - Maintain contract ABIs and addresses in config.

---

## 11. Art Direction & Asset Pipeline

### 11.1 Visual Style

- “Cozy Cyberpunk Batik” – blend warm gradients (gold, midnight blue) with Indonesian motifs.
- Particle effects & neon glows highlight Harmony energy.
- Low-poly stylized campus environment with holographic UI overlays.

### 11.2 Asset Strategy

- **Key Buildings**: Low-poly models crafted in Blender/SketchUp, exported to glTF; textures generated via AI then refined manually.
- **Sprites & Illustrations**: AI-generated base (Stable Diffusion / Midjourney), upscaled & edited to ensure consistency.
- **UI Elements**: Vector-based (Figma → React components), consistent glow effects.

### 11.3 AI Art Prompt Template

```
[Subject] in a stylized cozy cyberpunk batik aesthetic, illuminated by warm golden ambient light and deep midnight blue shadows, subtle Indonesian batik patterns integrated into clothing and environment, semi-flat shading with soft gradients, clean line work, minimal noise, 3/4 perspective, hero pose, high detail focus on emotional expression, concept art, artstation trending, 8k
```

#### Usage Guidelines

- Replace `[Subject]` with specific asset (e.g., “Aika AI mentor”, “UGM Rectorate building”).
- Maintain consistent color palette (Hex: #001D58, #0A2A6E, #FFCA40, #FFD55C, accent #5EEAD4).
- After generation, apply post-processing: adjust saturation, remove artifacts, ensure brand icons preserved.
- Store prompt variants in `docs/art-style-guide.md` for future artists.

---

## 12. Audio Direction

- Ambient soundtrack blending gamelan motifs with synth pads.
- Adaptive layers: calm state, intense Gloom encounter, celebratory events.
- Sound FX: soft chimes for quest completion, heartbeat for high-stress warnings.
- Voice: Optional AI-generated voice lines for Aika (Bahasa & English), pre-reviewed for tone.
- Ensure low-volume defaults for study environments; provide dynamic volume controls.

---

## 13. Compliance & Ethics

| Area | Strategy |
| --- | --- |
| **Mental Health Safety** | Crisis escalation flows, human counselor override, disclaimers. |
| **Data Privacy (UU PDP)** | Explicit consent management, data minimization, audit logs. |
| **Blockchain Regulations (OJK)** | Map token utility to permitted use; maintain transaction logs; pre-launch legal review. |
| **AI Ethics** | Safety filters, manual review for sensitive dialogues, transparent AI usage statement. |
| **Accessibility** | WCAG 2.1 AA compliance goals, inclusive design testing. |

---

## 14. Production Plan

### 14.1 Milestones (Hackathon + Beyond)

| Phase | Duration | Key Deliverables |
| --- | --- | --- |
| **Discovery / Prototype** | 4 weeks | Quest engine MVP, HUD overlay, mock data. |
| **Alpha** | 6–8 weeks | Map visualization, DeFi testnet integration, counselor tools prototype. |
| **Beta** | 8–10 weeks | Content expansions, safety review, compliance checklist, closed cohort test. |
| **Launch Prep** | 4 weeks | Marketing assets, pitch deck, audit reports, bug fixing. |
| **Live Ops (Season 1)** | 8 weeks | Post-launch support, guild events, sponsor integration. |

### 14.2 Team Roles

- **Product Lead**: Vision, roadmap, stakeholder coordination.
- **Game Designer**: Quest design, economy balancing.
- **Narrative Designer**: Dialogue scripts, seasonal stories.
- **Frontend Engineers**: Next.js quest pages, HUD, map integration.
- **Backend Engineers**: Quest services, blockchain integration.
- **Smart Contract Developer**: Solidity contracts, audits liaison.
- **Data/AI Engineer**: Dialogue orchestrator, analytics pipeline.
- **Counselor Liaison**: Content review, safety oversight.
- **Art & UX**: Asset generation, UI design, style governance.
- **Community & Live Ops**: Player engagement, feedback loops.

### 14.3 Tooling & Workflow

- **Source Control**: GitHub (branch strategy: `main`, `develop`, feature branches).
- **Project Management**: Linear/Notion, sprint cadence 2 weeks.
- **Design**: Figma, Miro, Blender.
- **Testing**: Cypress/Playwright (frontend), PyTest (backend), Hardhat/Foundry (smart contracts).
- **CI/CD**: Automated lint/test, container builds, staging deployments.

### 14.4 Risk & Mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| AI dialogue miscues | User distrust | Human-in-loop review, fallback scripts, safety filters |
| Blockchain compliance | Regulatory hurdles | Legal consultation, adjustable tokenomics, OJK sandbox engagement |
| Counselor bandwidth | Content bottleneck | Async content tooling, scheduling, volunteer mentorship |
| Data breach | High | Encryption, pen tests, security audits |
| Player drop-off | Engagement loss | Dynamic quests, social nudges, diversified content |

---

## 15. Success Metrics

### 15.1 Player KPIs

- D1/D7 retention, average quests per day, streak retention >7 days.
- % of players joining guilds, participating in Gloom encounters.
- Self-reported wellbeing improvement (survey).
- Counselor session conversion rate from in-game prompts.

### 15.2 Economic KPIs

- `CARE` staking volume, Wellness Pool subsidies distributed.
- Marketplace GMV (cosmetics, NFTs).
- Sponsor ROI metrics (quest completion tied to sponsor nodes).

### 15.3 Compliance KPIs

- Zero major incidents or policy violations.
- Timely audit completions, positive regulator feedback.

---

## 16. Appendices

### 16.1 Reference Links

- [Project Single Source of Truth](../PROJECT_SINGLE_SOURCE_OF_TRUTH.md)
- [Existing Counselor Portal Documentation](../docs/TODO/ADMIN_DASHBOARD_IMPLEMENTATION_PLAN.md)
- Hackathon brief summary (this document builds on it).

### 16.2 Glossary

- **Harmony Node**: Campus area representing wellbeing dimension.
- **Gloom**: Metaphorical adversary tied to stressors.
- **Lightstorm**: Guild-generated energy that clears Gloom.
- **Wellness Pool**: Staking contract funding therapy subsidies.
- **Relapse Protection Vault**: Social insurance staking mechanic.

### 16.3 Sample Quest Flow (Sequence Diagram)

```
Player -> Frontend: Complete quest action
Frontend -> Quest API: POST /quests/{id}/complete
Quest API -> Rewards Service: emit QuestCompletedEvent
Rewards Service -> Blockchain Relayer: Mint CARE, update NFT
Blockchain Relayer -> Smart Contract: execute tx (mint, update)
Quest API -> Frontend: respond with updated XP, rewards
Frontend -> Player: HUD update, celebration animation
```

### 16.4 Sample Dialogue Prompt (Aika)

```
System: You are Aika, a compassionate AI mentor for UGM-AICare Quest.
Context: Player missed a daily quest for journaling, current streak 3 days, mood: anxious.
User message: "I couldn't finish the journal. Exams got in the way."
Assistant style: supportive, reflective, 1 actionable tip, option to reschedule quest.
```

### 16.5 Smart Contract Overview

- `CareToken.sol` – ERC-20 with staking rewards.
- `QuestFactory.sol` – Manages quest ID to reward mapping; interacts with Attestation service.
- `AvatarNFT.sol` – ERC-6551 with upgradeable metadata.
- `WellnessVault.sol` – Allows staking/unstaking `CARE`, tracks subsidy disbursements.
- `Governance.sol` – Optional lazy governance for guild proposals (snapshot-based).

### 16.6 Feature Taxonomy & Naming Conventions

| Feature / Module | Abbrev | Description | Primary Owner | Acceptable Synonyms | Terms to Avoid |
| --- | --- | --- | --- | --- | --- |
| Quest Engine Service | QES | Generates and manages quest lifecycle, streak logic | Backend (Gameplay) | “Quest Engine”, “Quest Service” | “Mission generator”, “Quest manager bot” |
| Rewards Calculator Service | RCS | Calculates XP/`JOY`/`CARE`, posts on-chain updates | Backend (Economy) | “Reward Engine” | “Loot distributor”, “Payout daemon” |
| Dialogue Orchestrator Service | DOS | Handles Aika conversations, prompt assembly | AI Team | “Dialogue Engine”, “Aika Orchestrator” | “Chatbot brain”, “LLM bot” |
| Attestation Service | ATS | Validates proofs, writes on-chain attestations | Blockchain Team | “Attestation Layer” | “Badge writer”, “Proof bot” |
| Compliance Layer Service | CLS | Policy enforcement, audit logging, consent | Compliance | “Compliance Layer” | “Policy bot” |
| Social & Guild Service | SGS | Guild membership, chat, Lightstorm tracking | Social Systems | “Guild Service”, “Social Layer” | “Clan service” |
| Notification & Live Ops Service | NLS | Push/email/in-app messaging & experiments | Live Ops | “Notification Service” | “Ping engine”, “Spam service” |
| Moderation & Safety Service | MSS | Automated & human moderation workflows | Safety Ops | “Moderation Service” | “Censor bot” |
| Analytics & Insights Service | AIS | Data pipeline, dashboards, tokenomics KPIs | Data Team | “Analytics Service” | “BI layer” |
| Harmony Node | HND | Geographic wellness anchor on the map | Game Design | “Node”, “Harmony Zone” | “Beacon”, “POI” |
| Gloom Encounter | GLE | Cooperative boss battle event | Game Design | “Gloom Battle” | “Raid boss” |
| Lightstorm Meter | LSM | Collective progress bar during encounters | Game Design | “Lightstorm Gauge” | “Energy bar”, “Combo meter” |
| Compassion Mode | CMO | Reduced-intensity quest state | Game Design | “Compassion Mode” | “Easy mode”, “Casual mode” |
| Wellness Pool | WPS | DeFi staking pool for subsidies | Blockchain / Economy | “Wellness Pool” | “Liquidity mining”, “Yield farm” |
| Relapse Protection Vault | RPV | Insurance-like staking vault | Blockchain / Economy | “Relapse Vault” | “Slashing vault” |
| Daily Solo Quest | DSQ | Default daily personal quest type | Game Design | “Daily Solo”, “Daily Quest” | “Daily chore” |

**Naming Standards**

- **Source files**: `feature-context_suffix.ext` (e.g., `quests_engine_service.py`, `quests-engine.service.ts`).
- **API endpoints**: `/api/v1/{domain}/{resource}` with kebab-case (`/api/v1/quests/in-progress`).
- **Database tables**: snake_case plural (`player_progress`, `quest_instances`).
- **Smart contracts**: PascalCase suffixed with role (`QuestFactory.sol`).
- **Commits**: `[MODULE] action summary` (e.g., `[QES] implement adaptive difficulty`).
- **Telemetry events**: `module.event.action` (e.g., `quests.completion.success`).
- **UI IDs**: `ui-{screen}-{component}` (e.g., `ui-dashboard-lightstorm-meter`).

### Naming Usage Rules

- Always reference modules using abbreviations in engineering discussions after first mention.
- Player-facing copy must never expose internal abbreviations (`Harmony Node`, not `HND`).
- When multiple modules appear in one document, list them in execution order (QES → RCS → DOS).
- Feature flags follow `feat.{module}.{slug}` (e.g., `feat.qes.chain-difficulty`).

### 16.7 Narrative Tone & Style Guide

**Voice & Mood**

- Core tone: empathetic, hopeful, collaborative. Aim for “supportive mentor + campus ally”.
- Default tense: present. Default POV: second person when addressing players; first-person plural for guild/community messaging.
- Language: professional yet warm; integrate Bahasa Indonesia terms sparingly (e.g., “semangat”, “gotong royong”) with contextual translations.

**Aika’s Voice**

- Traits: compassionate, concise, actionable. Avoid sarcasm or rigid formal speech.
- Sentence structure: short to medium length, inclusive language (“Let’s try…”, “We can…”).
- Provide one actionable tip per dialogue turn, offer opt-out phrase (“If today feels heavy, we can pause.”).

**Counselor & Mentor Voice**

- Professional, reassuring, grounded in therapeutic practice. Use evidence-based phrasing (“Try a 4-7-8 breathing cycle.”).
- Avoid guarantees (“This will fix…”)—use invitations (“Consider exploring…”).

**Narrative Copy Rules**

- Avoid stigmatizing terms (“crazy”, “insane”). Prefer neutral descriptors (“intense stress”, “overwhelmed”).
- Highlight collective effort (“Your guild rallied…”).
- Keep quest descriptions under 120 words, include:
  1. **Context** (why it matters),
  2. **Action** (what to do),
  3. **Reflection** (optional journaling prompt).
- Example Quest Template:

  ```
  Title: Calm the Library Courtyard
  Context: “The courtyard has felt tense since midterms started.”
  Action: “Spend 10 minutes practicing your chosen breathing technique. Log how your body feels after.”
  Reflection: “What changed in your focus during the exercise?”
  Reward Callout: “Earn +25 Harmony and a Serenity Spark for your guild.”
  ```

**Forbidden Constructions**

- No gendered assumptions or heteronormative framing.
- No age-based diminutives (“kids”, “grown-ups”). Refer to “students”, “players”, “counselors”.
- Avoid imperative commands without softeners (“You must”). Use supportive invitations (“Let’s try”, “Consider”).

**Localization Tips**

- Provide bilingual subtitles for story cinematics (English + Bahasa Indonesia).
- Use metric units (minutes, kilometers) and regional time/date formats (dd MMM yyyy, 24-hour clock).
- Cultural references should align with Indonesian context (Ramadan, exam weeks, student organizations).

### 16.8 Art & Asset Brief Expansion

**Visual DNA**

- **Primary Palette**: Midnight Blue `#001D58`, Deep Indigo `#0A2A6E`, Harmony Teal `#3BA7B5`, Golden Aura `#FFCA40`, Dawn Gold `#FFD55C`, Accent Mint `#5EEAD4`.
- **Gradient Recipes**: `linear-gradient(140deg, #001D58 0%, #0A2A6E 45%, #173A7A 100%)`; button hover overlay `rgba(255, 202, 64, 0.18)`.
- **Typography**:
  - Display: `Poppins SemiBold` (titles, 32/40/44 pt).
  - Body: `Inter Regular` (14/16/18 pt).
  - Fallback stack: `Inter, Poppins, "Helvetica Neue", Arial, sans-serif`.
- **Iconography**: Thin 1.5px stroke, rounded corners, 45° diagonal highlights. Icons exported as 48x48 SVG with naming `ic-{category}-{name}.svg`.

**UI Layout Standards**

- Grid: 8px base spacing; major sections snap to 128px multiples.
- Card layout: 24px padding, 12px corner radius, background `rgba(255,255,255,0.06)`, border `1px solid rgba(255,255,255,0.10)`.
- Status colors:
  - Success `#34D399`,
  - Warning `#FBBF24`,
  - Critical `#F87171`,
  - Neutral `#A5B4FC`.
- Animation: Use cubic-bezier (.4, 0, .2, 1); default enter animation 250ms fade + 12px upward translate; micro-interactions <=180ms.

**Asset Production Pipeline**

- **2D Assets**: Generated via AI prompt template → curated in Photoshop → exported in PNG (UI) or SVG (icons). Maintain source PSD/AI in `/designs/source`.
- **3D Assets**: Modeled low-poly in Blender (LOD0 ≤ 8k tris). Provide LOD1 (~50% tri reduction) and LOD2 (~15%). Uses PBR materials; texture atlases 2048x2048 max.
- **Rendering Style**: Ambient occlusion baked subtle, emissive accents for Harmony energy, batik motifs projected via decals.
- **Sprite Sheets**: Animated sprites at 8 frames per loop, 320x320 frame size, naming `spr_{character}_{state}_v{version}.png`.
- **File Naming**:
  - Concept art: `concept_{subject}_{artistInitials}_{YYMMDD}.png`
  - Final UI asset: `ui_{screen}_{component}_{state}.svg`
  - 3D model: `mdl_{subject}_{lod}.glb`
  - Animation: `ani_{subject}_{action}_{fps}.json`
- **Versioning & Storage**: All final assets stored in `design-system/ugc-quest/` repository with Git LFS. Meta file `assets-manifest.json` tracks checksum, author, license.

**Accessibility Art Guidelines**

- Minimum contrast ratio 4.5:1 for text, 3:1 for iconography.
- Provide alt-text descriptions referencing mental wellness context (“Illustration of Aika offering a glowing Harmony orb”).
- Motion sensitivity: Provide toggle to disable particle overlays; ensure critical information not conveyed solely by color.

**Animation & VFX Standards**

- Particle systems limited to 300 particles/frame on mid-tier devices.
- Gloom effects use muted purple `#7C3AED` with opacity ≤60% to avoid eye strain.
- Avatar emotes 1.2s loop, easing in/out; Lightstorm charge effect 750ms ramp with subtle camera shake (amplitude ≤4px).

---

## 17. Conclusion

UGM-AICare Quest unites mental wellness, community collaboration, and transparent Game-Fi mechanics tailored to Indonesian regulation. This GDD details the experience from narrative foundations to technical architecture and art direction, equipping the hackathon team to prototype confidently while planning for long-term evolution.

> *Next Steps:* Align team on MVP scope, finalize smart contract architecture, and prepare demo storyboard for hackathon submission.
