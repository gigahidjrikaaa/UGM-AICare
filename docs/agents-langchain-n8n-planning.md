# Agent Implementation Plan: LangChain & N8N

This document outlines the strategic plan for implementing the three-agent framework (Triage, Analytics, Intervention) using LangChain for AI logic and N8N for orchestration and automation.

## Guiding Principles

1. **Build Incrementally:** Start with the simplest, most self-contained agent to build momentum.
2. **Test at Each Stage:** Ensure each component is robust before integrating it with others.
3. **Leverage Your Design:** The plan directly maps to the components defined in `single-source-of-truth.md` and `technical-specifications.md`.
4. **Separate Concerns:** The backend (FastAPI/LangChain) handles the "thinking" (LLM logic), while N8N handles the "doing" (scheduling, external actions).

---

## Phase 1: Foundational Agent Scaffolding

This phase establishes the basic code structure for all agents within the backend application.

1. **Create the Agent Directory:**
    * In `backend/app/`, create a new folder: `agents`.
    * Inside `backend/app/agents/`, create three files:
        * `triage_agent.py`
        * `analytics_agent.py`
        * `intervention_agent.py`

2. **Create the Agent API Router:**
    * In `backend/app/routes/`, create a new file: `agents.py`. This will house all API endpoints related to the agents.

3. **Integrate the New Router:**
    * Update `backend/app/main.py` to include the new `agents` router, making the endpoints available to the application.

```diff
--- a/backend/app/main.py
+++ b/backend/app/main.py
@@ -4,7 +4,7 @@
 from fastapi import FastAPI, Request as FastAPIRequest # type: ignore
 from datetime import datetime, timezone
 from app.database import init_db, close_db
-from sqlalchemy import text
-from app.routes import auth, email, chat, feedback, link_did, internal, journal, journal_prompts, summary, profile, session_events, appointments, admin
+from sqlalchemy import text # type: ignore
+from app.routes import auth, email, chat, feedback, link_did, internal, journal, journal_prompts, summary, profile, session_events, appointments, admin, agents
 from contextlib import asynccontextmanager
 from app.core.scheduler import start_scheduler, shutdown_scheduler
 from fastapi.middleware.cors import CORSMiddleware # type: ignore
@@ -102,6 +102,7 @@
 app.include_router(summary.user_data_router)  # This will have prefix /api/v1/user
 app.include_router(profile.router)
 app.include_router(admin.router)  # Admin endpoints
+app.include_router(agents.router, prefix="/api/v1/agents", tags=["Agents"]) # Agent endpoints
 app.include_router(appointments.router, prefix="/api/v1/appointments", tags=["Appointments"])
 # logger.info(f"List of routers (/api/v1): {app.routes}")
 logger.info(f"Allowed origins: {origins}")
```

---

## Phase 2: Implement the Triage Agent (The First Responder)

The Triage Agent is the best starting point as it's a real-time, synchronous process with clear inputs and outputs, and no dependencies on other agents.

### 1. Backend (FastAPI & LangChain)

* **File:** `backend/app/agents/triage_agent.py`
* **Logic:**
  * Create a `TriageAgent` class.
  * Define a method `classify_message(messages: list)`.
  * Use LangChain's `ChatPromptTemplate` to instruct the LLM to analyze a conversation and return a structured JSON object with fields like `severity`, `detected_keywords`, and `suggested_action`.
  * Use LangChain's `PydanticOutputParser` to enforce the JSON schema.
  * Call the appropriate LLM (likely Gemini for this complex task).
  * Save the classification result to the `triage_logs` table.

### 2. API Endpoint

* **File:** `backend/app/routes/agents.py`
* **Endpoint:** `POST /api/v1/agents/triage/classify-message`
* **Function:** This endpoint will receive conversation messages, instantiate the `TriageAgent`, call the `classify_message` method, and return the classification result.

### 3. Testing

* Use the FastAPI `/docs` page to test the endpoint with various conversation types (benign vs. crisis).
* Verify that new records are created in the `triage_logs` table with the correct classification.

---

## Phase 3: Implement the Analytics Agent (The Strategist)

This agent is asynchronous and data-intensive, designed to run on a schedule.

### 1. Backend (FastAPI & LangChain)

* **File:** `backend/app/agents/analytics_agent.py`
* **Logic:**
  * Create an `AnalyticsAgent` class.
  * Define a method `run_weekly_analysis()`.
  * This method will:
        1. Query the database for anonymized `messages` and `journal_entries` from the last 7 days.
        2. Use a LangChain summarization chain (e.g., `MapReduceDocumentsChain`) to process the text and extract key themes, sentiment trends, and topics.
        3. Use a final LLM call to synthesize findings into a structured report (JSON) matching the `analytics_reports` schema.
        4. Save the final report to the `analytics_reports` table.

### 2. API Endpoint

* **File:** `backend/app/routes/agents.py`
* **Endpoint:** `POST /api/v1/agents/analytics/trigger-analysis`
* **Function:** A simple endpoint that instantiates the `AnalyticsAgent` and calls `run_weekly_analysis()`. It is designed to be called by N8N.

### 3. N8N Workflow (Scheduling)

* **Workflow Name:** "Weekly Analytics Trigger"
* **Node 1: Cron Trigger.** Configure to run on a schedule (e.g., every Monday at 3 AM).
* **Node 2: HTTP Request Node.** Configure to make a `POST` request to the `/api/v1/agents/analytics/trigger-analysis` endpoint.

### 4. Testing

* Manually trigger the API endpoint via `/docs` and check for a new report in the `analytics_reports` table.
* Manually run the N8N workflow and verify it successfully calls the API.

---

## Phase 4: Implement the Intervention Agent (The Outreach Coordinator)

This final phase connects analytics insights to real-world actions via N8N.

### 1. Backend (Triggering N8N)

* **File:** `backend/app/agents/analytics_agent.py`
* **Modify `run_weekly_analysis()`:** After a report is saved, add logic to check if any insights require an intervention.
* If an intervention is needed, make an HTTP `POST` request from the backend to a **new N8N Webhook URL**. The request body should contain the insight data (e.g., `{ "type": "exam_stress", "severity": "high", ... }`).

### 2. N8N Workflow (Campaign Execution)

* **Workflow Name:** "Intervention Campaign Handler"
* **Node 1: Webhook Trigger.** This provides the URL for the backend to call and waits for insight data.
* **Node 2: Switch Node.** Routes the workflow based on the `type` of insight received (e.g., "exam_stress" path, "social_anxiety" path).
* **Path-Specific Nodes:**
  * **Postgres Node:** Query the `users` table to get the list of students to target for the campaign.
  * **Function / LLM Node:** Generate dynamic email content based on the insight details.
  * **Gmail / SMTP Node:** Loop through the target users and send the generated email.
  * **HTTP Request Node:** Call back to a new backend endpoint (e.g., `POST /api/v1/agents/intervention/log-campaign`) to record the campaign's execution in the `intervention_campaigns` table.

### 3. Testing

* Use a tool like Postman to send a mock insight payload to the N8N webhook URL.
* Verify the correct path is taken in the Switch node.
* Check a test email account to confirm receipt of the intervention email.
* Confirm a new entry is created in the `intervention_campaigns` table.
