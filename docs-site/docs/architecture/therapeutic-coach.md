---
id: therapeutic-coach-agent
title: Therapeutic Coach Agent
sidebar_position: 3
---

# Therapeutic Coach Agent
sidebar_position: 3
---

# TCA - Therapeutic Coach Agent

## What Is the TCA?

The Therapeutic Coach Agent (TCA) provides evidence-based support within the system. When the STA determines that a student requires more than empathetic conversation, the TCA delivers structured, clinically guided interventions. The TCA is grounded in Cognitive Behavioral Therapy (CBT), a validated psychological approach. CBT operates on the principle that thoughts, feelings, and behaviors are interconnected, and that addressing unhelpful thought patterns can effectively reduce emotional distress.

The TCA is grounded in **Cognitive Behavioural Therapy (CBT)** - one of the most empirically validated approaches in psychology. CBT works on the premise that thoughts, feelings, and behaviours are interconnected, and that changing unhelpful thought patterns can reduce emotional distress.

---

## When Is the TCA Invoked?

The TCA is called by the orchestrator under two conditions:

1. **Moderate risk** (`risk_level = 1`): The STA has detected distress signals that warrant structured support but not immediate clinical escalation.
2. **High/Critical risk** (`risk_level ≥ 2`): The TCA runs in **parallel** with the CMA. Both agents start simultaneously, and their outputs are merged in the synthesis node.

The TCA is *never* invoked for casual conversation or simple information queries - this preserves its clinical weight and avoids "therapy-washing" ordinary chat.

---

## What the TCA Produces

The TCA produces an intervention plan, which is a structured object integrated into Aika's response and maintained in the database. The personalization process is critical. The TCA reviews previously suggested coping strategies to avoid redundancy, ensuring the agent remains effective and engaging over long-term use.

```json
{
 "plan_id": "tcp_8f3a2c",
 "user_id": 1203,
 "category": "academic_stress",
 "coping_strategies": [
 "5-4-3-2-1 grounding technique for acute anxiety",
 "Pomodoro time-blocking for exam preparation",
 "Scheduled worry time (15 min/day, then redirect)"
 ],
 "psychoeducation": "Exam anxiety is a normal physiological response...",
 "homework": "Write down three thoughts about exams and identify the cognitive distortion in each.",
 "follow_up_trigger": "3 days",
 "evidence_base": "CBT for academic anxiety [Beck, 1979; Meichenbaum, 1985]"
}
```

---

## The Intervention Plan Generation Pipeline

```mermaid
flowchart TD
 A[Receive shared state\nrisk_level, intent, message] --> B{Intent Classification}
 B -- "Academic stress" --> C[Generate study skills\n+ anxiety management plan]
 B -- "Interpersonal conflict" --> D[Generate social skills\n+ assertiveness strategies]
 B -- "Low mood / depression" --> E[Generate behavioural activation\n+ thought record exercises]
 B -- "Panic / acute anxiety" --> F[Generate immediate\ngrounding techniques]
 C & D & E & F --> G[Fetch student history\nfrom intervention plan DB]
 G --> H[Personalise to student\navoid repeating used strategies]
 H --> I[Generate via Gemini Pro\nwith CBT framework prompt]
 I --> J[Write to SafetyAgentState\nintervention_plan field]
 J --> K[Persist to DB\nUserInterventionPlan table]
```

The personalization step is essential. The TCA monitors previously suggested coping strategies to avoid repetition, ensuring the agent remains engaging over extended periods.

---

## Wellness Activities Catalogue

Beyond the generated plan, the TCA has access to a curated catalogue of structured wellness activities. These are categorised by type and evidence base, and can be recommended directly in conversation:

| Category | Example Activities |
| --- | --- |
| **Breathing exercises** | Box breathing, 4-7-8 technique, diaphragmatic breathing |
| **Grounding techniques** | 5-4-3-2-1 sensory, cold water immersion, body scan |
| **CBT exercises** | Thought records, cognitive restructuring worksheets, behavioural experiments |
| **Psychoeducation** | Short explainers on anxiety, depression, stress physiology |
| **Lifestyle anchors** | Sleep hygiene, exercise scheduling, social connection |

---

## Journaling Integration

The TCA encourages students to maintain a digital journal within the platform. Journal entries serve as:

1. **Therapeutic homework** - completing assigned reflective exercises
2. **Longitudinal mood tracking** - the STA's background analysis can incorporate journal content for richer screening
3. **Conversation starters** - Aika can reference recent journal entries to make follow-up conversations feel continuous

---

## What the TCA Does Not Do

The TCA is deliberately scoped. It does **not**:

- Diagnose mental health conditions
- Prescribe or recommend medications
- Provide crisis counselling (that is the CMA's escalation path)
- Replace a human therapist

Every TCA-generated plan includes a disclaimer that it is supportive guidance, not clinical treatment, and that a trained counsellor is available if the student wants human support.
