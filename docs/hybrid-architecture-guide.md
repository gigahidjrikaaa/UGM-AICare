# Hybrid Architecture Guide: LangGraph and N8N

This document outlines the hybrid architectural strategy for the UGM-AICare project, leveraging LangGraph for the core conversational agent and N8N for peripheral automation.

## Guiding Principles

1. **Core vs. Periphery:** LangGraph forms the "Central Nervous System" for stateful, complex conversational logic. N8N handles "Peripheral" stateless tasks and third-party integrations.
2. **Right Tool for the Job:** We use LangGraph's expressive, code-native power for the agent's core reasoning and N8N's low-code speed for simpler, external workflows.
3. **Clear Separation of Concerns:** The FastAPI backend, with its integrated LangGraph agent, manages the user-facing conversation. It triggers N8N workflows via webhooks for background tasks.

---

## LangGraph: The Core Conversational Agent

LangGraph is responsible for the entire lifecycle of a user conversation.

### 1. Implementation within FastAPI

* The LangGraph agent is defined and executed directly within our Python-based FastAPI backend.
* It is instantiated as part of the application's startup lifecycle.
* This tight integration allows for seamless access to our existing database models, services, and authentication layers.

### 2. Key Responsibilities

* **Stateful Conversation Management:** Manages the graph's state, which includes conversation history, user context, and intermediate results from tool calls.
* **Dynamic Tool Use:** Implements the "reasoning, acting, observing" loop. The agent can decide which internal tools (e.g., database lookups) or external tools (via N8N webhooks) to call.
* **Safety and Guardrails:** Enforces safety protocols, checks for harmful content, and manages human-in-the-loop escalations.
* **Agent Orchestration:** The Triage, Analytics, and Intervention agent logic is implemented as nodes and edges within the LangGraph structure.

---

## N8N: Peripheral Automation Workflows

N8N is repurposed for stateless, asynchronous tasks that do not require the full context of the conversational state.

### 1. Triggering N8N Workflows

* The LangGraph agent triggers N8N workflows by making HTTP requests to N8N webhook URLs.
* Payloads sent to N8N are self-contained and provide all necessary data for the workflow to execute.

### 2. Example Use Cases

* **Google Calendar Integration:** An N8N workflow, triggered by the agent, could schedule a counseling appointment. The agent passes the user's availability and contact details in the webhook payload.
* **Email Notifications:** Sending a confirmation email after a user completes a journaling session.
* **Nightly Reports:** A cron-triggered N8N workflow that queries the database (or an API endpoint) to generate and email anonymized usage reports to administrators.

---

## Updated Workflow Example: Triage and Scheduling

1. A user's message comes into the FastAPI backend.
2. The LangGraph agent processes the conversation. The Triage Agent logic within the graph classifies the message as requiring a follow-up appointment.
3. The graph transitions to a state that requires scheduling. It collects the user's availability.
4. The LangGraph agent calls an internal tool that makes an HTTP POST request to an N8N webhook URL (`/n8n/schedule-appointment`). The payload contains the user's ID and requested time slots.
5. The N8N workflow receives the data, connects to the Google Calendar API, finds an available slot, and books the appointment.
6. N8N can optionally call back to a FastAPI endpoint to confirm that the appointment has been booked, updating the application's database.
