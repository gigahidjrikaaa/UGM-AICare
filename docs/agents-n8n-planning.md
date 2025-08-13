# Agent Implementation Plan: N8N

This document outlines the strategic plan for implementing the three-agent framework (Triage, Analytics, Intervention) using N8N for orchestration and automation, with direct calls to LLM APIs for AI logic.

## Guiding Principles

1. **Build Incrementally:** Start with the simplest, most self-contained agent to build momentum.
2. **Test at Each Stage:** Ensure each component is robust before integrating it with others.
3. **Leverage Your Design:** The plan directly maps to the components defined in `single-source-of-truth.md` and `technical-specifications.md`.
4. **Separate Concerns:** The backend (FastAPI) provides data and endpoints, while N8N handles the "thinking" (LLM logic) and the "doing" (scheduling, external actions).

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

### 1. N8N Workflow (Classification)

* **Workflow Name:** "Triage Message Classifier"
* **Node 1: Webhook Trigger.** This provides a URL for the backend to send new messages to.
* **Node 2: LLM Node (e.g., OpenAI, Google Generative AI).**
  * **Prompt:** Instruct the LLM to analyze the conversation and return a structured JSON object with fields like `severity`, `detected_keywords`, and `suggested_action`.
  * **Input:** The message content from the webhook.
* **Node 3: HTTP Request Node.**
  * **URL:** `POST /api/v1/agents/triage/log-classification`
  * **Body:** The JSON output from the LLM node.

### 2. Backend (API Endpoint)

* **File:** `backend/app/routes/agents.py`
* **Endpoint:** `POST /api/v1/agents/triage/log-classification`
* **Function:** This endpoint will receive the classification result from N8N and save it to the `triage_logs` table.

### 3. Testing

* Use a tool like Postman to send a mock message to the N8N webhook URL.
* Verify the LLM node correctly classifies the message.
* Verify that a new record is created in the `triage_logs` table.

---

## Phase 3: Implement the Analytics Agent (The Strategist)

This agent is asynchronous and data-intensive, designed to run on a schedule.

### 1. N8N Workflow (Scheduling & Analysis)

* **Workflow Name:** "Weekly Analytics Trigger"
* **Node 1: Cron Trigger.** Configure to run on a schedule (e.g., every Monday at 3 AM).
* **Node 2: HTTP Request Node.**
  * **URL:** `GET /api/v1/agents/analytics/get-weekly-data`
  * **Function:** This endpoint will query the database for anonymized `messages` and `journal_entries` from the last 7 days and return the data.
* **Node 3: LLM Node (e.g., OpenAI, Google Generative AI).**
  * **Prompt:** Instruct the LLM to perform a summarization and analysis of the weekly data, extracting key themes, sentiment trends, and topics.
  * **Input:** The data from the previous HTTP request.
* **Node 4: HTTP Request Node.**
  * **URL:** `POST /api/v1/agents/analytics/save-report`
  * **Body:** The JSON report from the LLM node.

### 2. Backend (API Endpoints)

* **File:** `backend/app/routes/agents.py`
* **Endpoint 1:** `GET /api/v1/agents/analytics/get-weekly-data`
  * **Function:** Queries the database for the last 7 days of data.
* **Endpoint 2:** `POST /api/v1/agents/analytics/save-report`
  * **Function:** Saves the generated report to the `analytics_reports` table.

### 3. Testing

* Manually run the N8N workflow.
* Verify that the workflow successfully retrieves data from the backend.
* Verify that a new report is created in the `analytics_reports` table.

---

## Phase 4: Implement the Intervention Agent (The Outreach Coordinator)

This final phase connects analytics insights to real-world actions via N8N.

### 1. N8N Workflow (Campaign Execution)

* **Workflow Name:** "Intervention Campaign Handler"
* **Node 1: Webhook Trigger.** This provides a URL for the analytics workflow to call when an intervention is needed.
* **Node 2: Switch Node.** Routes the workflow based on the `type` of insight received (e.g., "exam_stress" path, "social_anxiety" path).
* **Path-Specific Nodes:**
  * **Postgres Node:** Query the `users` table to get the list of students to target for the campaign.
  * **Function / LLM Node:** Generate dynamic email content based on the insight details.
  * **Gmail / SMTP Node:** Loop through the target users and send the generated email.
  * **HTTP Request Node:** Call back to a new backend endpoint (e.g., `POST /api/v1/agents/intervention/log-campaign`) to record the campaign's execution in the `intervention_campaigns` table.

### 2. Backend (API Endpoint)

* **File:** `backend/app/routes/agents.py`
* **Endpoint:** `POST /api/v1/agents/intervention/log-campaign`
* **Function:** Records the campaign's execution in the `intervention_campaigns` table.

### 3. Testing

* Use a tool like Postman to send a mock insight payload to the N8N webhook URL.
* Verify the correct path is taken in the Switch node.
* Check a test email account to confirm receipt of the intervention email.
* Confirm a new entry is created in the `intervention_campaigns` table.