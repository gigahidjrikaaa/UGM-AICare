# Data and Analytics Strategy

This document outlines the data collection and analysis strategy for the UGM-AICare platform. The goal is to leverage data to provide personalized insights for users and actionable, anonymized analytics for university administrators.

---

## 1. Guiding Principles

- **User Privacy First:** All data analysis for administrative purposes must be aggregated and anonymized. Personal user data is for their private insights only.
- **Actionable Insights:** The goal of data analysis is to produce actionable insights that can lead to proactive interventions and better resource allocation.
- **Transparency:** The platform should be transparent with users about what data is collected and how it is used.

---

## 2. Data Collection Strategy

### 2.1. For the User (Personalized Insights)

The following data points will be collected on a per-user basis to power their private dashboard:

- **Conversation & Journal Content:** The raw text from user interactions.
- **Sentiment Analysis:** A sentiment score for each message and journal entry.
- **Topic Extraction:** Key topics and themes identified from the text.
- **Usage Patterns:** Frequency, time of day, and duration of user sessions.
- **Feature Engagement:** Tracking of which platform features are used.
- **User Feedback:** Explicit ratings and feedback on AI responses and resources.

### 2.2. For the Admin (Institutional Analytics)

The following data will be collected and aggregated across all users to provide a high-level view of campus mental health:

- **Aggregated Sentiment Trends:** The average sentiment score of the entire user base over time.
- **Trending Topics & Keywords:** The most common topics and keywords discussed on the platform.
- **Triage Agent Data:** Statistics on the severity of conversations as classified by the Triage Agent.
- **Usage Statistics:** Peak usage times and overall platform engagement metrics.
- **Resource Engagement:** Data on which help resources are most frequently accessed.
- **Anonymized Demographic Data:** (Requires strict ethical oversight and user consent) Anonymized data such as faculty or year of study to identify group-specific trends.

---

## 3. Analytics & Analysis Strategy

### 3.1. User-Facing Analytics

The following analytics will be provided to users in their private dashboard:

- **Personal Mood Trends:** A chart showing their sentiment trends over time.
- **Recurring Themes:** A word cloud or list of their most discussed topics.
- **Activity Summaries:** Gamified summaries to encourage engagement.
- **Positive Reinforcement:** Highlighting positive trends and progress.
- **Personalized Resource Recommendations:** Proactive suggestions for relevant help content.

### 3.2. Admin-Facing Analytics (The Analytics Agent)

The admin dashboard will feature the following analytics, powered by the Analytics Agent:

- **Real-time Mental Health Dashboard:** A high-level view of campus sentiment, trending topics, and conversation severity.
- **Automated Anomaly Detection:** The agent will automatically identify and alert admins to significant changes in the data (e.g., spikes in negative sentiment).
- **Intervention Campaign Effectiveness:** Analysis of how intervention campaigns impact user sentiment and behavior.
- **Resource Gap Analysis:** Identification of in-demand topics that lack sufficient help resources.
- **Predictive Insights:** (Long-term goal) Forecasting periods of high stress to enable preemptive interventions.
