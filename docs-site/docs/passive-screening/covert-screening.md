---
sidebar_position: 1
---

# Covert Screening System

UGM-AICare implements a continuous, covert mental health screening system that passively extracts psychological indicators from natural conversations. By evaluating users implicitly during normal interactions, the system mitigates social desirability bias and captures authentic emotional states.

---

## Methodology

The screening process is integrated directly into the Safety Triage Agent (STA) workflow. Every incoming user message undergoes a dual-analysis process: immediate risk assessment for safety, and longitudinal screening extraction.

```mermaid
graph TD
 A[Raw User Message] --> B[STA: PII Redaction]
 B --> C[Cleaned Message]
 
 C --> D{Parallel Analysis}
 
 D -->|Path 1: Safety| E[Crisis Keyword Regex]
 D -->|Path 2: Semantic| F[LLM Feature Extraction]
 
 E --> G[Immediate Risk Level]
 F --> H[Map to Validated Instruments]
 
 H --> I[PHQ-9 Domains]
 H --> J[GAD-7 Domains]
 H --> K[DASS-21 Domains]
 
 I --> L[Calculate Domain Scores]
 J --> L
 K --> L
 
 L --> M[Exponential Decay Update]
 M --> N[Updated Longitudinal Profile]
 
 classDef primary fill:#f9f9f9,stroke:#333,stroke-width:2px;
 class D,L,M primary;
```

---

## Screening Pipeline

The end-to-end pipeline covers everything from raw conversation messages through indicator extraction, score normalization, longitudinal profile updates, and dashboard visualization.

```mermaid
flowchart TD
    START([Student sends message]) --> MSG["Message stored in<br/>Conversation + Message tables"]
    MSG --> AIKA["Aika processes message<br/>Screening awareness module<br/>identifies potential indicators"]

    AIKA --> RESPONSE["Aika responds to student<br/>No screening delay"]
    AIKA -.-> |"async, non-blocking"| STA["STA Background Task<br/>triggered after conversation"]

    STA --> LOAD["Load full conversation<br/>transcript from DB"]
    LOAD --> REDACT["Apply PII Redaction<br/>Regex-based removal"]
    REDACT --> CLASSIFY["Gemini Deep Analysis<br/>Structured JSON output"]

    CLASSIFY --> RISK["Risk Assessment<br/>risk_level + risk_score + severity"]
    CLASSIFY --> EXTRACT["Indicator Extraction<br/>Map to instrument domains"]

    EXTRACT --> NORM["Score Normalization<br/>Raw indicators → 0-1 scale"]
    NORM --> BAND["Severity Banding<br/>None / Mild / Moderate /<br/>Severe / Critical"]
    BAND --> DECAY["Exponential Decay Update<br/>old_score × 0.95 + new × factor"]
    DECAY --> PROFILE["Update ScreeningProfile<br/>in PostgreSQL"]
    PROFILE --> DASHBOARD["Visible on Counselor<br/>Dashboard as trend chart"]

    RISK --> ASSESSMENT["Create<br/>ConversationRiskAssessment"]
    ASSESSMENT --> TRIGGER{Risk threshold<br/>exceeded?}
    TRIGGER --> |Yes| CASE["Trigger CMA<br/>case creation"]
    TRIGGER --> |No| MONITOR["Continue routine<br/>monitoring"]

    style STA fill:#868e96,color:#fff
    style DECAY fill:#a855f7,color:#fff
    style TRIGGER fill:#ff6b6b,color:#fff
```

### Indicator Extraction Detail

```mermaid
flowchart LR
    subgraph "Input: Redacted Message"
        MSG["'I've been sleeping<br/>terribly, can't focus<br/>on anything, feel<br/>like a failure'"]
    end

    subgraph "Gemini Extraction"
        LLM["Structured JSON:<br/>{<br/>  phq9: [concentration, worthlessness],<br/>  gad7: [],<br/>  dass21_stress: [overwhelm],<br/>  psqi: [sleep_quality, daytime_dysfunction],<br/>  rses: [self_worth]<br/>}"]
    end

    subgraph "Score Computation"
        SCORE["Per-instrument score:<br/>count(matched_items) / total_items<br/>→ normalized to 0-1"]
    end

    subgraph "Severity Banding"
        BAND["PHQ-9: 0.45 → Moderate<br/>PSQI: 0.62 → Severe<br/>RSES: 0.38 → Mild"]
    end

    MSG --> LLM --> SCORE --> BAND
```

---

## Validated Instruments

The system maps conversational features to domains established by scientifically validated clinical instruments:

| Instrument | Full Name | Domains | Items | Reference |
|------------|-----------|---------|-------|-----------|
| PHQ-9 | Patient Health Questionnaire-9 | Depression | 9 | Kroenke et al. (2001) |
| GAD-7 | Generalized Anxiety Disorder-7 | Anxiety | 7 | Spitzer et al. (2006) |
| DASS-21 | Depression Anxiety Stress Scales | Depression, Anxiety, Stress | 21 | Lovibond &amp; Lovibond (1995) |
| PSQI | Pittsburgh Sleep Quality Index | Sleep Quality | 19 (7 components) | Buysse et al. (1989) |
| UCLA-3 | UCLA Loneliness Scale v3 | Social Isolation | 20 | Russell (1996) |
| RSES | Rosenberg Self-Esteem Scale | Self-Esteem | 10 | Rosenberg (1965) |
| C-SSRS | Columbia Suicide Severity Rating | Suicidality | 6 | Posner et al. (2011) |
| AUDIT | Alcohol Use Disorders ID | Substance Use | 10 | Saunders et al. (1993) |
| SSI | Student Stress Inventory | Academic Stress | Adapted | Lakaev (2009) |

---

## Score Normalization &amp; Severity Bands

Each instrument uses specific thresholds normalized to a 0–1 scale:

```mermaid
flowchart LR
    subgraph "PHQ-9 (Depression)"
        P0["0.00 - 0.19<br/>None"]
        P1["0.19 - 0.37<br/>Mild"]
        P2["0.37 - 0.56<br/>Moderate"]
        P3["0.56 - 0.74<br/>Severe"]
        P4["0.74 - 1.00<br/>Critical"]
        P0 --> P1 --> P2 --> P3 --> P4
    end

    subgraph "GAD-7 (Anxiety)"
        G0["0.00 - 0.24<br/>None"]
        G1["0.24 - 0.48<br/>Mild"]
        G2["0.48 - 0.71<br/>Moderate"]
        G3["0.71 - 0.90<br/>Severe"]
        G4["0.90 - 1.00<br/>Critical"]
        G0 --> G1 --> G2 --> G3 --> G4
    end
```

| Instrument | None | Mild | Moderate | Severe | Critical |
|------------|------|------|----------|--------|----------|
| PHQ-9 | 0 – 0.19 | 0.19 – 0.37 | 0.37 – 0.56 | 0.56 – 0.74 | 0.74 – 1.0 |
| GAD-7 | 0 – 0.24 | 0.24 – 0.48 | 0.48 – 0.71 | 0.71 – 0.90 | 0.90 – 1.0 |
| DASS-21 Stress | 0 – 0.19 | 0.19 – 0.29 | 0.29 – 0.38 | 0.38 – 0.60 | 0.60 – 1.0 |
| PSQI | 0 – 0.20 | 0.20 – 0.40 | 0.40 – 0.60 | 0.60 – 0.80 | 0.80 – 1.0 |
| UCLA Loneliness | 0 – 0.20 | 0.20 – 0.40 | 0.40 – 0.60 | 0.60 – 0.80 | 0.80 – 1.0 |
| RSES | 0 – 0.20 | 0.20 – 0.40 | 0.40 – 0.60 | 0.60 – 0.80 | 0.80 – 1.0 |
| C-SSRS | 0 – 0.00 | N/A | N/A | 0.01 – 0.50 | 0.50 – 1.0 |

---

## Exponential Decay

The screening profile is updated with exponential decay to weight recent indicators more heavily:

```
new_score = old_score × decay_factor + extracted_weight × update_factor
```

```mermaid
flowchart LR
    subgraph "Decay Formula"
        EQ["decay_factor = 0.95 (default)<br/>update_factor = 0.50"]
    end

    subgraph "Example"
        OLD["Old PHQ-9: 0.35<br/>(Mild)"]
        NEW["Extracted: 0.55<br/>(Moderate)"]
        RESULT["New PHQ-9:<br/>0.35 × 0.95 + 0.55 × 0.50<br/>= 0.3325 + 0.275<br/>= 0.6075<br/>(Moderate → Severe)"]
        OLD --> RESULT
        NEW --> RESULT
    end
```

| Property | Value | Rationale |
|----------|-------|-----------|
| `decay_factor` | 0.95 | 5% decay per conversation — gradual forgetting |
| `update_factor` | 0.50 | New evidence has significant but not overwhelming weight |
| Minimum update interval | Per conversation | Prevents rapid oscillation |
| Score bounds | [0.0, 1.0] | Clamped to valid range |

---

## Data Safety &amp; PII Redaction

Given the highly sensitive nature of mental health conversations, the system guarantees that conversational data cannot be linked back to an individual student by unauthorized personnel.

### Privacy Shield Architecture

Before any user message is logged or passed to secondary analysis components, it passes through the "Privacy Shield" — an intermediate redaction layer designed to sanitize text.

```mermaid
graph LR
 A[User Message: "I am feeling stressed. My name is Budi and my number is 0812345678"] --> B(STA: PII Redaction Engine)
 B --> C{Rules & NLP Models}
 C -->|Regex| D[Remove Numbers & Emails]
 C -->|NER| E[Remove Names & Locations]
 D --> F
 E --> F[Sanitized Message]
 F --> G[Database]
 F --> H[Insights Agent]
 
 classDef safe fill:#d4edda,stroke:#333,stroke-width:2px;
 class F,G,H safe;
```

### Anonymization vs. Pseudonymization

- **Pseudonymization (Database Layer):** For clinical continuity, the backend maps conversations to a user ID. The actual identity is stored separately and is only accessible by authorized counselors through the CMA during a Level 3 escalation.
- **Anonymization (Analytics Layer):** The Insights Agent operates strictly on anonymized data. Any query aggregating data is subject to **k-anonymity** where *k ≥ 5*. Queries returning fewer than 5 records are rejected to prevent statistical deanonymization.

---

## Dashboard Visualization

```mermaid
flowchart TD
    subgraph "Data Source"
        SP["ScreeningProfile table<br/>One row per student<br/>9 instrument scores"]
    end

    subgraph "Counselor Dashboard"
        CHART1["📈 Trend Lines<br/>Score over time per instrument"]
        CHART2["🌡️ Risk Heatmap<br/>Current scores by instrument<br/>Color-coded severity bands"]
        CHART3["📊 Radar Chart<br/>Multi-dimensional profile"]
        CHART4["⚠️ Alerts<br/>Threshold breach notifications"]
    end

    SP --> CHART1 & CHART2 & CHART3 & CHART4

    subgraph "Admin Dashboard"
        POP1["Population Distribution<br/>Aggregated score distributions<br/>by faculty, semester"]
        POP2["Trend Analysis<br/>Average scores over time<br/>with k-anonymity"]
    end

    SP --> POP1 & POP2
```
