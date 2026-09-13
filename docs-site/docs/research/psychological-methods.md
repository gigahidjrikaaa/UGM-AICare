---
sidebar_position: 6
id: psychological-methods
title: Psychological Methods & Academic References
---

# Psychological Methods & Academic References

This document provides a comprehensive mapping of every psychological method employed by UGM-AICare, the academic references that ground each method, and the precise code sections that implement them. It is intended as a thesis-ready reference for the research evaluation chapter.

---

## 1. Covert (Passive) Mental Health Screening

### Method

UGM-AICare extracts psychological indicators from natural conversations without requiring students to complete formal questionnaires. Rather than administering structured clinical instruments directly, the system infers potential indicator scores from conversational content and maps them to validated instrument domains. This approach is termed *covert screening* — the student is never aware that clinical analysis is occurring.

### Academic Argument

Formal psychological assessments are susceptible to **social desirability bias** — the tendency of respondents to present themselves in a favorable light (Edwards, 1957; Crowne & Marlowe, 1960). In the context of university mental health, particularly within Indonesian culture where mental health stigma remains high, this bias is amplified. Students may underreport symptoms on formal questionnaires due to fear of judgment, academic repercussions, or cultural norms around emotional restraint.

Covert screening from natural conversation mitigates this bias by capturing **authentic emotional states** expressed in an unguarded context. The student is not primed to think clinically, reducing both impression management and self-deception tendencies. This is consistent with findings that indirect assessment methods yield more valid data in stigma-sensitive populations (Dodds, 2010; Henderson et al., 2013).

A critical caveat: covert screening is **indicative, not diagnostic**. The system's outputs are designed to assist counselors in prioritization and early identification — they do not replace formal clinical assessment.

### References

- Edwards, A. L. (1957). *The Social Desirability Variable in Personality Assessment and Research*. Dryden Press.
- Crowne, D. P., & Marlowe, D. (1960). A new scale of social desirability independent of psychopathology. *Journal of Consulting Psychology*, 24(4), 349–354.
- Dodds, C. (2010). *Social desirability*. In I. B. Weiner & W. E. Craighead (Eds.), The Corsini Encyclopedia of Psychology. John Wiley & Sons.

### Implementation

| Component | Code Location | Description |
|-----------|---------------|-------------|
| Screening dimension definitions | `screening/instruments.py:17–23` (`InstrumentDomain` dataclass) | Defines the data structure for each instrument domain with bilingual keywords and weights |
| LLM-based dual-purpose analysis | `sta/conversation_analyzer.py:69–186` (analysis prompt in `analyze_conversation_risk`) | Single LLM call performs both risk assessment and screening extraction, mapping to 9 dimensions |
| Screening extraction parsing | `sta/conversation_analyzer.py:220–236` (screening data parsing) | Parses structured screening JSON from the Gemini response into `ScreeningDimensionScore` objects |
| Natural conversational probes | `aika/screening_awareness.py:69–267` (`NATURAL_PROBES` list) | 10 natural probe templates mapped to instrument domains, designed to elicit indicators without clinical language |
| Gap analysis for probe selection | `aika/screening_awareness.py:300–451` (`analyze_screening_gaps`) | Identifies which dimensions lack data and selects the most contextually appropriate probe |
| Screening guidance injection | `aika/screening_awareness.py:522–585` (`generate_screening_guidance`) | Generates internal system prompt additions so Aika subtly steers conversation toward uncovered dimensions |

---

## 2. Validated Psychological Instruments

### Method

The system maps conversational features to the domains established by 9 scientifically validated clinical instruments. Each instrument operates on a unique scoring scale; the system normalizes all scores to a continuous 0.0–1.0 scale and applies instrument-specific severity thresholds.

### Instruments and References

#### 2.1 PHQ-9 — Patient Health Questionnaire-9 (Depression)

**Reference:** Kroenke, K., Spitzer, R. L., & Williams, J. B. W. (2001). The PHQ-9: Validity of a brief depression severity measure. *Journal of General Internal Medicine*, 16(9), 606–613.

**Domains assessed:** Anhedonia, depressed mood, sleep disturbance, fatigue, appetite change, worthlessness, concentration difficulty, psychomotor changes, suicidal ideation.

**Normalization:** Scores normalized from the original 0–27 scale to 0.0–1.0. Thresholds: Mild 0.19 (≈5/27), Moderate 0.37 (≈10/27), Severe 0.56 (≈15/27), Critical 0.74 (≈20/27).

| Code Location | Description |
|---------------|-------------|
| `screening/instruments.py:31–95` (`PHQ9_DOMAINS`) | 9 domains with English/Indonesian keywords and weights (suicidal_ideation weighted 2.0 as critical) |
| `screening/engine.py:77–81` (depression reference) | Instrument metadata with full academic reference |
| `screening/engine.py:138–143` (depression thresholds) | Normalized severity thresholds derived from PHQ-9 cutoffs |

#### 2.2 GAD-7 — Generalized Anxiety Disorder-7 (Anxiety)

**Reference:** Spitzer, R. L., Kroenke, K., Williams, J. B. W., & Löwe, B. (2006). A brief measure for assessing generalized anxiety disorder: The GAD-7. *Archives of Internal Medicine*, 166(10), 1092–1097.

**Domains assessed:** Nervousness, uncontrollable worry, excessive worry, trouble relaxing, restlessness, irritability, fear of awful outcomes.

| Code Location | Description |
|---------------|-------------|
| `screening/instruments.py:103–153` (`GAD7_DOMAINS`) | 7 domains with bilingual keywords; uncontrollable_worry weighted 1.2 as core symptom |
| `screening/engine.py:82–86` (anxiety reference) | Full instrument metadata |
| `screening/engine.py:144–149` (anxiety thresholds) | Normalized from 0–21 scale: Mild 0.24, Moderate 0.48, Severe 0.71, Critical 0.90 |

#### 2.3 DASS-21 — Depression Anxiety Stress Scales (Stress Subscale)

**Reference:** Lovibond, S. H., & Lovibond, P. F. (1995). The structure of the Depression Anxiety Stress Scales: A confirmatory factor analysis. *Behaviour Research and Therapy*, 33(3), 335–343.

**Domains assessed:** Difficulty relaxing, nervous energy, agitation, irritability, impatience, overwhelm, intolerance.

| Code Location | Description |
|---------------|-------------|
| `screening/instruments.py:161–211` (`DASS21_STRESS_DOMAINS`) | 7 domains; overwhelm weighted 1.2 as key indicator |
| `screening/engine.py:87–93` (stress reference) | Full instrument metadata |
| `screening/engine.py:150–155` (stress thresholds) | Normalized from 0–42 scale: Mild 0.19, Moderate 0.29, Severe 0.38, Critical 0.60 |

#### 2.4 PSQI — Pittsburgh Sleep Quality Index

**Reference:** Buysse, D. J., Reynolds, C. F., Monk, T. H., Berman, S. R., & Kupfer, D. J. (1989). The Pittsburgh Sleep Quality Index: A new instrument for psychiatric practice and research. *Psychiatry Research*, 28(2), 193–213.

**Domains assessed:** Sleep quality, sleep latency, sleep duration, sleep efficiency, sleep disturbances, sleep medication use, daytime dysfunction.

| Code Location | Description |
|---------------|-------------|
| `screening/instruments.py:219–269` (`PSQI_DOMAINS`) | 7 component domains with bilingual keywords |
| `screening/engine.py:94–99` (sleep reference) | Full instrument metadata |
| `screening/engine.py:156–161` (sleep thresholds) | Normalized severity bands |

#### 2.5 UCLA Loneliness Scale (Version 3)

**Reference:** Russell, D. W. (1996). UCLA Loneliness Scale (Version 3): Reliability, validity, and factor structure. *Journal of Personality Assessment*, 66(1), 20–40.

**Domains assessed:** Social loneliness, emotional loneliness, perceived isolation, social withdrawal, companionship (protective).

| Code Location | Description |
|---------------|-------------|
| `screening/instruments.py:277–313` (`UCLA_LONELINESS_DOMAINS`) | 5 domains; companionship tracked as protective factor |
| `screening/engine.py:100–105` (social reference) | Full instrument metadata |
| `screening/engine.py:162–167` (social thresholds) | Normalized severity bands |

#### 2.6 RSES — Rosenberg Self-Esteem Scale

**Reference:** Rosenberg, M. (1965). *Society and the Adolescent Self-Image*. Princeton University Press.

**Domains assessed:** Self-worth, self-acceptance, self-competence, comparative worth, self-respect.

| Code Location | Description |
|---------------|-------------|
| `screening/instruments.py:321–357` (`RSES_DOMAINS`) | 5 domains; self_worth weighted 1.2 as core indicator |
| `screening/engine.py:106–112` (self_worth reference) | Full instrument metadata |
| `screening/engine.py:168–173` (self_worth thresholds) | Normalized severity bands |

#### 2.7 C-SSRS — Columbia Suicide Severity Rating Scale

**Reference:** Posner, K., Brown, G. K., Stanley, B., et al. (2011). The Columbia-Suicide Severity Rating Scale: Initial validity and internal consistency findings from three multisite studies with adolescents and adults. *American Journal of Psychiatry*, 168(12), 1266–1277.

**Domains assessed:** Wish to be dead, suicidal thoughts, suicidal intent, suicidal plan, self-harm, preparatory behavior.

**Critical property:** Any positive finding on the C-SSRS domains triggers immediate escalation. Domain weights are the highest in the system (2.0–3.5) to ensure high sensitivity.

| Code Location | Description |
|---------------|-------------|
| `screening/instruments.py:402–445` (`CSSRS_DOMAINS`) | 6 domains with escalating weights (wish_to_be_dead: 2.0, suicidal_plan: 3.5) |
| `screening/engine.py:124–130` (crisis reference) | Full instrument metadata |
| `screening/engine.py:186–192` (crisis thresholds) | Any score > 0.01 triggers "Severe" classification |

#### 2.8 AUDIT — Alcohol Use Disorders Identification Test

**Reference:** Saunders, J. B., Aasland, O. G., Babor, T. F., de la Fuente, J. R., & Grant, M. (1993). Development of the Alcohol Use Disorders Identification Test (AUDIT): WHO Collaborative Project on Early Detection of Persons with Harmful Alcohol Consumption. *Addiction*, 88(6), 791–804.

**Domains assessed:** Hazardous use, dependence symptoms, harmful use, coping drinking.

| Code Location | Description |
|---------------|-------------|
| `screening/instruments.py:365–394` (`AUDIT_DOMAINS`) | 4 domains; dependence_symptoms weighted 1.3 |
| `screening/engine.py:118–123` (substance reference) | Full instrument metadata |
| `screening/engine.py:179–184` (substance thresholds) | Normalized from 0–40 scale |

#### 2.9 SSI — Student Stress Inventory (Adapted)

**Reference:** Lakaev, A. (2009). *Student Stress Inventory*. Adapted for Indonesian university context.

**Domains assessed:** Academic pressure, fear of failure, thesis stress, academic comparison, future anxiety.

| Code Location | Description |
|---------------|-------------|
| `screening/instruments.py:453–489` (`ACADEMIC_STRESS_DOMAINS`) | 5 university-specific domains; thesis_stress weighted 1.2 |
| `screening/engine.py:107–111` (academic reference) | Full instrument metadata |
| `screening/engine.py:168–173` (academic thresholds) | Normalized severity bands |

---

## 3. Cognitive Behavioral Therapy (CBT) Interventions

### Method

The Therapeutic Coach Agent (TCA) delivers structured, evidence-based interventions grounded in Cognitive Behavioral Therapy (CBT). CBT operates on the principle that thoughts, feelings, and behaviors are interconnected, and that addressing unhelpful thought patterns (cognitive distortions) can effectively reduce emotional distress (Beck, 1979). The system employs five distinct CBT sub-techniques, each selected based on the classified intent and severity of the student's distress.

### Sub-Techniques

#### 3.1 Grounding and Calming Techniques

**Psychological basis:** Grounding techniques interrupt the anxiety cycle by redirecting attention to the present moment, engaging the parasympathetic nervous system. The 5-4-3-2-1 sensory technique and box breathing are well-established panic and anxiety interventions (Meichenbaum, 1985; Clark, 1986).

**Trigger:** Acute anxiety, panic attacks, high arousal states.

| Code Location | Description |
|---------------|-------------|
| `tca/gemini_plan_generator.py:30–66` (`CALM_DOWN_SYSTEM_PROMPT`) | Gemini system prompt for generating grounding/calming plans with evidence-based techniques |
| `tca/tca_graph.py:77–132` (`determine_intervention_type_node`) | Maps `crisis`, `panic`, `anxiety`, `acute_stress` intents to `calm_down` plan type |
| `tca/tca_graph.py:136–227` (`generate_plan_node`) | Invokes Gemini-powered plan generation with STA context |

#### 3.2 Cognitive Restructuring

**Psychological basis:** Cognitive restructuring is a core CBT technique that involves identifying automatic negative thoughts, examining the evidence for and against them, and generating more balanced alternative thoughts. This process is central to Beck's cognitive model of depression (Beck, Rush, Shaw, & Emery, 1979) and is operationalized through structured thought records.

**Trigger:** Depression, negative thinking patterns, self-criticism.

| Code Location | Description |
|---------------|-------------|
| `tca/gemini_plan_generator.py:149–193` (`COGNITIVE_RESTRUCTURING_SYSTEM_PROMPT`) | 6-step CBT thought record template: Situation → Automatic Thought → Emotion → Evidence → Reframe → Re-assess |
| `tca/tca_graph.py:99–105` (intent mapping) | Routes `crisis` and `anxiety` intents to cognitive restructuring when appropriate |

#### 3.3 Behavioral Activation

**Psychological basis:** Behavioral activation addresses depression by breaking the cycle of inactivity and avoidance. It involves scheduling and completing meaningful activities aligned with personal values, based on the principle that action precedes motivation rather than the reverse (Jacobson et al., 2001; Martell, Dimidjian, & Herman-Dunn, 2010).

**Trigger:** Low mood, anhedonia, loss of motivation.

| Code Location | Description |
|---------------|-------------|
| `tca/gemini_plan_generator.py:195–237` (`BEHAVIORAL_ACTIVATION_SYSTEM_PROMPT`) | Structured activity scheduling plan with mood-before/mood-after rating |
| `tca/tca_graph.py:99–105` (intent mapping) | Routes depressive/cognitive intent to behavioral activation |

#### 3.4 Problem Decomposition

**Psychological basis:** Problem decomposition is a structured problem-solving technique derived from D'Zurilla and Nezu's (2007) social problem-solving model. It addresses the cognitive overwhelm that accompanies complex stressors by breaking them into manageable components.

**Trigger:** Academic stress, feeling overwhelmed, stuck, confused.

| Code Location | Description |
|---------------|-------------|
| `tca/gemini_plan_generator.py:68–108` (`BREAK_DOWN_PROBLEM_SYSTEM_PROMPT`) | Chunking-based plan with priority ranking |
| `tca/tca_graph.py:100–103` (intent mapping) | Maps `overwhelmed`, `stuck`, `confused`, `academic_stress` to `break_down_problem` |

#### 3.5 General Coping Strategies

**Psychological basis:** Combines problem-focused and emotion-focused coping strategies as defined by Lazarus and Folkman (1984). Includes psychoeducation, self-compassion exercises, and social support encouragement.

**Trigger:** General distress not matching specific sub-techniques.

| Code Location | Description |
|---------------|-------------|
| `tca/gemini_plan_generator.py:110–147` (`GENERAL_COPING_SYSTEM_PROMPT`) | Balanced coping plan with immediate relief and sustainable strategies |
| `tca/tca_graph.py:105` (default fallback) | Default intervention type when no specific intent match is found |

### Safety Review Gate

Every generated plan passes through a safety review that checks for: diagnostic language (removed), medication recommendations (removed), risk-level appropriateness (downgraded if mismatched), and presence of supportive disclaimer.

| Code Location | Description |
|---------------|-------------|
| `tca/tca_graph.py:231–282` (`safety_review_node`) | Validates plan safety; blocks solo TCA invocation for high/critical risk |
| `docs-site/docs/architecture/therapeutic-coach.md:62–85` | Safety review gate flowchart |

### References

- Beck, A. T. (1979). *Cognitive Therapy and the Emotional Disorders*. Penguin.
- Beck, A. T., Rush, A. J., Shaw, B. F., & Emery, G. (1979). *Cognitive Therapy of Depression*. Guilford Press.
- Clark, D. M. (1986). A cognitive approach to panic. *Behaviour Research and Therapy*, 24(4), 461–470.
- D'Zurilla, T. J., & Nezu, A. M. (2007). *Problem-Solving Therapy: A Positive Approach to Clinical Intervention* (3rd ed.). Springer.
- Jacobson, N. S., Martell, C. R., & Dimidjian, S. (2001). Behavioral activation treatment for depression: Returning to contextual roots. *Clinical Psychology: Science and Practice*, 8(3), 256–270.
- Lazarus, R. S., & Folkman, S. (1984). *Stress, Appraisal, and Coping*. Springer.
- Martell, C. R., Dimidjian, S., & Herman-Dunn, R. (2010). *Behavioral Activation for Depression: A Clinician's Guide*. Guilford Press.
- Meichenbaum, D. (1985). *Stress Inoculation Training*. Pergamon Press.

---

## 4. Belief-Desire-Intention (BDI) Agent Architecture

### Method

Each agent in UGM-AICare is designed around the **BDI cognitive architecture**, a framework from multi-agent systems theory that models rational agents as having mental states composed of beliefs, desires, and intentions (Rao & Georgeff, 1995). This architecture maps cleanly to how clinical decision-making works in practice.

### Academic Argument

The BDI model was chosen because it provides a principled framework for designing agents whose behavior is **predictable, auditable, and testable** — properties that are critical in clinical contexts. A clinician holds beliefs about a patient (history, risk level), desires certain outcomes (safety, reduced distress), and forms intentions (run triage, generate coping plan, open case). By mapping these concepts to computational constructs, the system's decision-making becomes transparent and reviewable.

### BDI Mapping in UGM-AICare

| BDI Component | Definition | Implementation |
|---------------|------------|----------------|
| **Belief** | What the agent knows about the world | `AikaOrchestratorState` — user profile, conversation history, risk level, screening scores |
| **Desire** | What the agent wants to achieve | Agent system prompts — ensure safety, reduce distress, facilitate professional support |
| **Intention** | The specific action the agent decides to take | Routing decisions — run crisis triage → generate coping plan → open case → schedule appointment |

### Implementation

| Code Location | Description |
|---------------|-------------|
| `agents/graph_state.py:104–127` (`SafetyAgentState`) | Shared state TypedDict representing agent Beliefs (user_id, message, risk_level, screening indicators) |
| `agents/aika/decision_node.py:880–1263` (`aika_decision_node`) | Central Belief update and Intention formation — classifies intent, assesses risk, decides routing |
| `agents/aika/routing.py:40–122` (`should_invoke_agents`) | Intention execution — maps decided intention to graph edge (TCA, CMA, IA, or direct response) |
| `agents/aika/decision_node.py:242–350` (`_compute_routing`) | Pure function deriving intentions from beliefs with safety-first overrides |

### Reference

- Rao, A. S., & Georgeff, M. P. (1995). BDI agents: From theory to practice. *Proceedings of the First International Conference on Multi-Agent Systems (ICMAS-95)*, 312–319.

---

## 5. PAD Affective Model and Discordance Detection

### Method

The system uses Mehrabian and Russell's (1974) **Pleasure-Arousal-Dominance (PAD)** emotional model to represent affective states as numerical coordinates in a 3D space. This enables computational comparison between self-reported emotional states (from journal entries) and AI-detected states (from conversation analysis). The delta between these two representations is termed **affective discordance**.

### Academic Argument

Affective discordance — a mismatch between what a person reports feeling and what they objectively express — is a clinically significant signal. High discordance may indicate **emotional masking** (concealing distress behind a positive facade), which is a known risk factor in populations with high mental health stigma (Fischer et al., 2010). In the university context, students may report feeling "fine" while their language, sleep patterns, and behavioral indicators suggest significant distress.

The PAD model was chosen because it provides a **dimensional** rather than categorical representation of emotion, enabling quantitative comparison on continuous scales. This is more computationally tractable than categorical emotion models for detecting subtle discrepancies.

### Discordance Scoring

```
discordance_score = (|journal_valence - assessment_pleasure| + |journal_arousal - assessment_arousal|) / 2
```

| Discordance Level | Score Threshold | System Response |
|-------------------|-----------------|-----------------|
| None | ≤ 0.2 | Normal conversation flow |
| Low | 0.2–0.4 | Slightly more supportive tone |
| Medium | 0.4–0.8 | Gentle inquiry — acknowledge stressors despite positive self-report |
| High | > 0.8 | Deep-probing questions; possible TCA escalation if concerning context present |

### Implementation

| Code Location | Description |
|---------------|-------------|
| `services/affective_discordance.py:19–65` (`compute_affective_discordance`) | Core function computing delta between journal self-report and STA PAD assessment |
| `aika/screening_awareness.py:330–365` (discordance analysis in `analyze_screening_gaps`) | Fetches latest journal and assessment, computes discordance level |
| `aika/screening_awareness.py:541–556` (discordance guidance) | Generates tiered strategy instructions based on discordance level |
| `aika/decision_node.py:375–431` (`_compute_high_discordance_routing_override`) | Deterministic routing override — escalates to TCA when high discordance co-occurs with concerning context |
| `aika/decision_node.py:673–740` (`_apply_screening_discordance_policy`) | Loads screening awareness, computes discordance, and applies override to state |
| `sta/conversation_analyzer.py:110–114` (PAD extraction prompt) | Instructs the LLM to extract pleasure, arousal, and dominance scores from conversation |

### References

- Mehrabian, A., & Russell, J. A. (1974). *An Approach to Environmental Psychology*. MIT Press.
- Fischer, A. H., Rodríguez Mosquera, P. M., van Vianen, A. E. M., & Manstead, A. S. R. (2010). Gender and culture differences in emotion. *Emotion*, 4(1), 87–94.

---

## 6. Longitudinal Exponential Decay Model

### Method

Mental health states fluctuate over time. Rather than relying solely on the most recent conversation, the screening engine maintains a **longitudinal profile** using an exponential decay formula that weights recent indicators more heavily than historical ones.

### Mathematical Formulation

```
new_score = (old_score × decay_factor) + (extracted_weight × update_factor)
```

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `decay_factor` | 0.95 | 5% decay per conversation — gradual forgetting of older data |
| `update_factor` | 0.30 | New evidence has significant but not overwhelming weight |

### Academic Argument

Exponential decay is a well-established method for modeling temporal relevance in longitudinal data (Box, Jenkins, & Reinsel, 2008). In the mental health context, it reflects the clinical reality that a student's current state is more informative than their state months ago, while still retaining historical context as a baseline. The 0.95 decay factor ensures that approximately 50% of the signal comes from the last 14 conversations (0.95^14 ≈ 0.49), providing a reasonable window of clinical relevance.

The system also tracks **protective factors** (good sleep, social support, positive self-worth) alongside risk indicators, and computes a net score that accounts for protective buffering.

### Severity Classification

Overall severity is computed as a **weighted average** across dimensions, with crisis and depression receiving the highest weights:

| Dimension | Weight | Rationale |
|-----------|--------|-----------|
| Crisis (C-SSRS) | 3.0 | Any positive finding is critical |
| Depression (PHQ-9) | 2.0 | Core mental health indicator |
| Anxiety (GAD-7) | 1.5 | Common comorbid condition |
| Self-Worth (RSES) | 1.5 | Key vulnerability factor |
| Stress, Sleep, Social | 1.0 | Standard indicators |
| Academic (SSI) | 0.8 | Context-specific, lower clinical weight |
| Substance (AUDIT) | 1.2 | Moderate clinical significance |

### Implementation

| Code Location | Description |
|---------------|-------------|
| `screening/engine.py:199–207` (`ExtractionResult`) | Data model for a single extraction result |
| `screening/engine.py:209–221` (`DimensionScore`) | Per-dimension score with current_score, protective_score, trend, and instrument metadata |
| `screening/engine.py:224–312` (`ScreeningProfile`) | Full longitudinal profile with weighted severity calculation |
| `screening/engine.py:253–297` (`get_severity`) | Weighted average computation with crisis-first check and protective factor buffering |
| `screening/engine.py:318–448` (`update_screening_profile`) | Core decay-and-update function — applies decay, integrates new indicators, persists to database |

### Reference

- Box, G. E. P., Jenkins, G. M., & Reinsel, G. C. (2008). *Time Series Analysis: Forecasting and Control* (4th ed.). Wiley.

---

## 7. Privacy-Preserving Analytics

### Method

The Insights Agent (IA) provides population-level mental health analytics to counselors and administrators. To prevent re-identification of individual students from aggregate data, the system employs two complementary privacy mechanisms.

#### 7.1 k-Anonymity

**Reference:** Sweeney, L. (2002). k-Anonymity: A model for protecting privacy. *International Journal of Uncertainty, Fuzziness and Knowledge-Based Systems*, 10(5), 557–570.

**Method:** Every analytics query enforces a minimum group size of k = 5. If a query would return a result representing fewer than 5 individuals, the result is suppressed or generalized. This prevents an administrator from reverse-engineering individual identities through hyper-specific queries.

| Code Location | Description |
|---------------|-------------|
| `ia/ia_graph.py` (`apply_k_anonymity_node`) | Enforces `GROUP BY` with `HAVING COUNT ≥ 5`; suppresses small cells |
| `docs-site/docs/architecture/insights-agent.md:23–36` | k-Anonymity description with examples |

#### 7.2 Differential Privacy

**Reference:** Dwork, C. (2006). Differential privacy. *Proceedings of the 33rd International Colloquium on Automata, Languages and Programming (ICALP)*, 1–12.

**Method:** For aggregate statistics (means, percentages, score distributions), the IA adds calibrated statistical noise drawn from a Laplace distribution before returning results. The noise magnitude is controlled by a privacy budget parameter (epsilon, ε). Smaller ε yields stronger privacy guarantees at the cost of slightly less precise statistics.

| Code Location | Description |
|---------------|-------------|
| `ia/ia_graph.py` (DP noise injection node) | Applies Laplace noise to aggregate query results |
| `docs-site/docs/architecture/insights-agent.md:37–51` | Differential privacy description with ε parameter |

### References

- Sweeney, L. (2002). k-Anonymity: A model for protecting privacy. *International Journal of Uncertainty, Fuzziness and Knowledge-Based Systems*, 10(5), 557–570.
- Dwork, C. (2006). Differential privacy. In M. Bugliesi et al. (Eds.), *ICALP 2006, LNCS 4052*, pp. 1–12. Springer.

---

## 8. Design Science Research (DSR) Methodology

### Method

The development of UGM-AICare follows the **Design Science Research (DSR)** methodology (Hevner et al., 2004), which is highly suited for software engineering and information systems research. DSR focuses on the creation and evaluation of innovative IT artifacts intended to solve complex, real-world problems.

### Academic Argument

DSR was selected because UGM-AICare is fundamentally an IT artifact — a multi-agent system — designed to address a specific real-world problem (the reactive capacity crisis in university mental health). DSR provides a rigorous framework for:

1. **Relevance Cycle:** Connecting the university campus environment to system requirements (scalable, low-stigma, proactive mental health support).
2. **Rigor Cycle:** Grounding the system in established scientific theories (BDI for agent design, CBT for therapeutic interventions, validated instruments for screening).
3. **Design Cycle:** Iterative building and evaluation of the artifact against measurable research questions.

### Three Research Questions

| RQ | Question | System Component | Evaluation Method |
|----|----------|-----------------|-------------------|
| RQ1 | Can an agentic system detect crisis signals with sensitivity > 90% and zero false negatives for severe ideation? | STA (Safety Triage Agent) | Ground truth dataset; sensitivity, specificity, precision, F1 |
| RQ2 | Can a LangGraph orchestrator reliably route intents without hallucinations? | Aika (Orchestrator) | Intent classification testing; routing accuracy ≥ 95% |
| RQ3 | Can the system generate clinically valid CBT responses while maintaining k-anonymity? | TCA + IA | Expert panel review; clinical validity ≥ 4.0/5.0; 100% k-anonymity compliance |

### Implementation

| Code Location | Description |
|---------------|-------------|
| `research_evaluation/research_eval_runner.py` | Main evaluation runner orchestrating RQ1–RQ3 experiments |
| `research_evaluation/rq1_crisis_detection/` | Crisis detection evaluation with ground truth scenarios |
| `research_evaluation/rq2_orchestration/` | Routing accuracy and intent classification evaluation |
| `research_evaluation/rq2b_coaching_quality/` | CBT plan quality evaluation |
| `docs-site/docs/research/evaluation-framework.md` | Full metrics dashboard with formulas and targets |

### Reference

- Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. *MIS Quarterly*, 28(1), 75–105.

---

## 9. Crisis Detection: Two-Tier Classifier

### Method

The Safety Triage Agent employs a two-tier classification approach for crisis detection, combining the speed and certainty of rule-based methods with the semantic understanding of large language models.

### Tier 1: Rule-Based Pre-Screen (< 5 ms)

Deterministic keyword and regex matching against a curated list of crisis terms in both English and Indonesian. If any keyword or pattern matches, the risk level is immediately elevated to HIGH or CRITICAL before any LLM call is made. This guarantees that the system **never underestimates a crisis** due to an LLM miscalibration.

### Tier 2: LLM Semantic Analysis (~200 ms)

For messages that do not trigger Tier 1, the system invokes Gemini for semantic analysis. The LLM classifies the message into risk levels and intents, and simultaneously extracts screening indicators mapped to the 9 validated instruments.

### Academic Argument

The two-tier approach combines the strengths of both paradigms. Rule-based systems offer perfect recall for known crisis expressions (the system's Tier 1 keyword list is designed for maximum sensitivity). However, they cannot capture novel expressions of distress, euphemisms, or contextual risk signals. LLMs excel at semantic understanding but may occasionally miss explicit crisis signals. By layering these approaches, the system achieves both the deterministic safety guarantee of rule-based methods and the semantic sensitivity of LLMs.

This hybrid approach is consistent with the clinical literature on suicide risk screening, which recommends combining structured screening tools with clinical judgment (Bryan & Rudd, 2018).

### Implementation

| Code Location | Description |
|---------------|-------------|
| `sta/classifiers.py:9–58` (`_CRISIS_KEYWORDS`) | Hardcoded crisis terms in English and Indonesian |
| `sta/classifiers.py:60–89` (`_HIGH_DISTRESS_KEYWORDS`) | Elevated distress indicators |
| `sta/classifiers.py:185–196` (`_CRISIS_PATTERNS`) | Regex patterns for crisis variations and misspellings |
| `sta/classifiers.py:202–214` (`_check_crisis_patterns`) | Regex matching function |
| `sta/classifiers.py:216–295` (`SafetyTriageClassifier.classify`) | Full classification pipeline — keyword check → pattern check → distress check → intent classification |
| `aika/message_classifier.py` (`detect_crisis_keywords`) | Aika's inline keyword scan running before the LLM call |

### Reference

- Bryan, C. J., & Rudd, M. D. (2018). *Brief Cognitive-Behavioral Therapy for Suicide Prevention*. Guilford Press.

---

## Summary Table: Methods, References, and Code

| # | Method | Primary Reference | Key Code Files |
|---|--------|-------------------|----------------|
| 1 | Covert Screening | Edwards (1957); Crowne & Marlowe (1960) | `screening/engine.py`, `aika/screening_awareness.py`, `sta/conversation_analyzer.py` |
| 2 | Validated Instruments (9) | Kroenke (2001); Spitzer (2006); Lovibond (1995); Buysse (1989); Russell (1996); Rosenberg (1965); Posner (2011); Saunders (1993); Lakaev (2009) | `screening/instruments.py`, `screening/engine.py` |
| 3 | CBT Interventions | Beck (1979); Meichenbaum (1985); Lazarus & Folkman (1984) | `tca/gemini_plan_generator.py`, `tca/tca_graph.py` |
| 4 | BDI Agent Architecture | Rao & Georgeff (1995) | `agents/graph_state.py`, `agents/aika/decision_node.py`, `agents/aika/routing.py` |
| 5 | PAD Affective Model | Mehrabian & Russell (1974) | `services/affective_discordance.py`, `aika/decision_node.py`, `aika/screening_awareness.py` |
| 6 | Exponential Decay Model | Box, Jenkins, & Reinsel (2008) | `screening/engine.py` |
| 7 | Privacy (k-Anonymity + DP) | Sweeney (2002); Dwork (2006) | `ia/ia_graph.py` |
| 8 | DSR Methodology | Hevner et al. (2004) | `research_evaluation/`, `docs-site/docs/research/` |
| 9 | Two-Tier Crisis Detection | Bryan & Rudd (2018) | `sta/classifiers.py`, `aika/message_classifier.py` |
