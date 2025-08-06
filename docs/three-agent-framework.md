# Three-Agent Framework Architecture

## Overview

The UGM-AICare system implements a sophisticated three-agent architecture designed to provide comprehensive, proactive mental health support for university students. Each agent has distinct responsibilities and operates at different temporal scales to ensure complete coverage of student mental health needs.

## Agent Detailed Specifications

### 🤖 Analytics Agent

#### Core Functionality

- **Data Sources**: Anonymized conversation logs, user interaction patterns, journal entries, system usage metrics
- **Analysis Algorithms**:
  - Sentiment trend analysis over time periods
  - Topic clustering to identify emerging themes
  - Temporal pattern recognition (seasonal, weekly, daily trends)
  - Anomaly detection for sudden changes in user behavior
  - Correlation analysis between external events and mental health patterns

#### Technical Implementation

```python
class AnalyticsAgent:
    def __init__(self):
        self.data_processor = DataProcessor()
        self.trend_analyzer = TrendAnalyzer()
        self.report_generator = ReportGenerator()
        
    async def weekly_analysis(self):
        # Fetch and process data
        raw_data = await self.data_processor.fetch_weekly_data()
        
        # Perform analysis
        trends = self.trend_analyzer.identify_trends(raw_data)
        patterns = self.trend_analyzer.detect_patterns(raw_data)
        
        # Generate insights
        insights = self.generate_insights(trends, patterns)
        
        # Create report
        report = self.report_generator.create_report(insights)
        
        # Trigger interventions if needed
        await self.trigger_interventions(insights)
```

#### Output Format

- **Weekly Reports**: Comprehensive analysis with visualizations
- **Alert Triggers**: Immediate notifications for significant pattern changes
- **Trend Predictions**: Forecasting based on historical data
- **Intervention Recommendations**: Specific actions based on identified patterns

### 📢 Intervention Agent

#### Core Functionality

- **Campaign Types**:
  - Preventive education campaigns
  - Resource distribution
  - Targeted support outreach
  - Crisis prevention initiatives
  - Community building activities

#### Trigger Mechanisms

```python
class InterventionAgent:
    def __init__(self):
        self.campaign_manager = CampaignManager()
        self.email_service = EmailService()
        self.n8n_client = N8NClient()
        
    async def process_analytics_insight(self, insight):
        # Determine intervention type
        intervention_type = self.classify_intervention(insight)
        
        # Select target audience
        target_group = self.identify_target_group(insight)
        
        # Generate campaign content
        campaign = self.campaign_manager.create_campaign(
            intervention_type, 
            target_group, 
            insight
        )
        
        # Execute via n8n workflows
        await self.n8n_client.execute_campaign(campaign)
```

#### Campaign Execution Workflow

1. **Insight Reception**: Receives insights from Analytics Agent
2. **Impact Assessment**: Evaluates severity and scope of identified issues
3. **Campaign Design**: Creates targeted intervention strategies
4. **Content Generation**: Develops personalized messaging and resources
5. **Delivery Coordination**: Manages multi-channel campaign execution
6. **Effectiveness Tracking**: Monitors campaign performance and engagement

### 🩺 Triage Agent

#### Core Functionality

- **Real-time Classification**:
  - Crisis detection (suicide risk, self-harm indicators)
  - Severity assessment (low, medium, high priority)
  - Support level recommendation
  - Resource matching based on specific needs

#### Classification Algorithm

```python
class TriageAgent:
    def __init__(self):
        self.crisis_detector = CrisisDetector()
        self.severity_classifier = SeverityClassifier()
        self.resource_matcher = ResourceMatcher()
        
    async def analyze_conversation(self, conversation_context):
        # Crisis detection
        crisis_level = self.crisis_detector.assess(conversation_context)
        
        if crisis_level == "HIGH":
            return self.emergency_protocol(conversation_context)
        
        # Severity classification
        severity = self.severity_classifier.classify(conversation_context)
        
        # Resource recommendation
        resources = self.resource_matcher.find_resources(
            conversation_context, 
            severity
        )
        
        return {
            "severity": severity,
            "recommended_resources": resources,
            "intervention_type": self.determine_intervention(severity),
            "urgency_level": self.calculate_urgency(conversation_context)
        }
```

#### Response Categories

- **Immediate Crisis**: Emergency contact information, crisis hotlines
- **High Priority**: Counseling appointment scheduling, professional referral
- **Medium Priority**: Self-help resources, guided exercises, peer support
- **Low Priority**: Educational content, general wellness tips, community resources

## Inter-Agent Communication

### Data Flow Architecture

```
Analytics Agent → Weekly Insights → Intervention Agent
     ↓                                    ↓
Database Storage ← Performance Metrics ← Campaign Execution
     ↓
Real-time Data → Triage Agent → Immediate Responses
```

### Communication Protocols

#### Analytics to Intervention

- **Weekly Reports**: Structured JSON with trend analysis and recommendations
- **Alert Messages**: Immediate notifications for urgent patterns
- **Historical Context**: Long-term trend data for campaign planning

#### Triage to System

- **Real-time Classifications**: Immediate severity and resource recommendations
- **Escalation Triggers**: Automatic alerts for crisis situations
- **Performance Feedback**: Classification accuracy and response effectiveness

## Integration Points

### Database Schema

```sql
-- Agent analytics storage
CREATE TABLE agent_analytics (
    id SERIAL PRIMARY KEY,
    agent_type VARCHAR(50),
    execution_timestamp TIMESTAMP,
    analysis_data JSONB,
    insights JSONB,
    actions_triggered JSONB
);

-- Intervention campaigns
CREATE TABLE intervention_campaigns (
    id SERIAL PRIMARY KEY,
    triggered_by_insight_id INTEGER,
    campaign_type VARCHAR(100),
    target_criteria JSONB,
    content JSONB,
    execution_status VARCHAR(50),
    effectiveness_metrics JSONB
);

-- Triage classifications
CREATE TABLE triage_classifications (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER,
    classification_timestamp TIMESTAMP,
    severity_level VARCHAR(20),
    crisis_indicators JSONB,
    recommended_resources JSONB,
    follow_up_required BOOLEAN
);
```

### API Endpoints

```python
# Analytics Agent endpoints
@app.post("/api/analytics/trigger-analysis")
async def trigger_weekly_analysis():
    """Manually trigger analytics agent execution"""

@app.get("/api/analytics/reports")
async def get_analytics_reports(date_range: str):
    """Retrieve analytics reports for specified period"""

# Intervention Agent endpoints
@app.post("/api/intervention/execute-campaign")
async def execute_intervention_campaign(campaign_data: dict):
    """Execute intervention campaign based on insights"""

@app.get("/api/intervention/campaign-status/{campaign_id}")
async def get_campaign_status(campaign_id: int):
    """Get status and metrics for specific campaign"""

# Triage Agent endpoints
@app.post("/api/triage/classify")
async def classify_conversation(conversation_data: dict):
    """Real-time conversation classification"""

@app.get("/api/triage/classifications")
async def get_triage_history(user_id: int, limit: int = 50):
    """Retrieve triage classification history"""
```

## Performance Metrics

### Analytics Agent KPIs

- **Prediction Accuracy**: How well trends predict actual outcomes
- **Pattern Detection Rate**: Percentage of significant patterns identified
- **False Positive Rate**: Incorrect trend identifications
- **Processing Time**: Time required for weekly analysis completion

### Intervention Agent KPIs

- **Campaign Effectiveness**: Engagement rates and behavioral changes
- **Response Time**: Time from insight to campaign execution
- **Resource Utilization**: How well campaigns direct users to appropriate resources
- **Follow-up Success**: Sustained engagement after intervention

### Triage Agent KPIs

- **Classification Accuracy**: Correct severity assessment percentage
- **Crisis Detection Rate**: Successful identification of emergency situations
- **Response Time**: Time from message to classification
- **Escalation Appropriateness**: Correct routing to professional help

## Monitoring and Alerting

### System Health Monitoring

- **Agent Availability**: Continuous monitoring of agent responsiveness
- **Processing Delays**: Alert if analysis or classification times exceed thresholds
- **Data Quality**: Monitoring for incomplete or corrupted data inputs
- **Integration Status**: Verify communication between agents and external systems

### Performance Alerting

- **Trend Anomalies**: Unusual patterns requiring immediate attention
- **Crisis Volume**: Sudden increases in high-priority classifications
- **Campaign Failures**: Non-executing or low-performing interventions
- **System Overload**: Resource utilization approaching capacity limits

---

*This architecture ensures comprehensive mental health support through intelligent automation while maintaining human oversight and professional integration.*
