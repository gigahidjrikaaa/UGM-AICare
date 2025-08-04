# AI Integration Guide for UGM-AICare

## Overview

This guide provides comprehensive instructions for integrating AI services into the UGM-AICare platform, focusing on the dual LLM approach and agent framework integration.

## LLM Provider Configuration

### 1. Self-Hosted Gemma (INA17)

- **Endpoint**: `https://ina17.com/api/gemma`
- **Model**: `gemma-2b`
- **Authentication**: Bearer token (stored in `GEMMA_API_KEY`)
- **Rate Limits**: 100 requests/minute
- **Use Cases**:
  - Quick responses for greetings
  - Journal entry summaries
  - Simple Q&A
  - Cost-effective bulk operations

### 2. Google Gemini 2.0 Flash (Free Tier)

- **Endpoint**: Google AI API
- **Model**: `gemini-2.0-flash-latest`
- **Authentication**: API key (stored in `GOOGLE_GENAI_API_KEY`)
- **Rate Limits**: 60 requests/minute (free tier)
- **Use Cases**:
  - Complex therapeutic conversations
  - CBT module interactions
  - Crisis intervention
  - Detailed mental health guidance

## Implementation Pattern

### Backend LLM Router (`backend/app/core/llm.py`)

```python
class LLMRouter:
    def select_provider(self, context):
        # Decision logic based on:
        # - User tier (student/admin)
        # - Query complexity
        # - Rate limit status
        # - Cost optimization
        
        if context.is_simple_query:
            return "gemma"
        elif context.requires_therapeutic_expertise:
            return "gemini"
        else:
            return self.get_available_provider()
```

### N8N Workflow Integration

1. **Webhook Triggers**:
   - `/webhook/chat-analysis` - Analyze conversation sentiment
   - `/webhook/user-activity` - Track engagement patterns
   - `/webhook/crisis-detection` - Emergency keyword monitoring

2. **LangChain Agent Tools**:
   - Resource retrieval from knowledge base
   - Appointment scheduling integration
   - Mental health assessment scoring
   - Progress tracking and reporting

## Student vs Admin AI Features

### Student-Facing AI

- **Aika Chatbot**: Empathetic AI companion
- **Smart Journaling**: AI-powered prompts and insights
- **Progress Tracking**: Automated achievement detection
- **Resource Recommendations**: Personalized content

### Admin-Facing AI

- **Analytics Dashboard**:
  - Sentiment analysis trends
  - Engagement metrics
  - Risk assessment scores
- **Automated Reports**: Weekly/monthly summaries
- **Intervention Alerts**: Crisis detection system
- **Content Moderation**: Inappropriate content filtering

## Best Practices

1. Always fallback to Gemma for non-critical queries
2. Implement retry logic with exponential backoff
3. Cache common responses in Redis
4. Log all AI interactions for audit trail
5. Monitor token usage and costs
