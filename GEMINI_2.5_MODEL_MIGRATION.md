# Gemini 2.5 Model Migration

## Overview
This document tracks the migration from Gemini 2.0 models to Gemini 2.5 models across the UGM-AICare platform.

## Model Assignments

### Gemini 2.5 Model Names (Official)
- **Gemini 2.5 Flash Lite**: `gemini-2.5-flash-lite` (stable)
  - Best for: High-volume, cost-efficient, latency-sensitive tasks
  - Use case: Conversational messages, translation, classification
  
- **Gemini 2.5 Flash**: `gemini-2.5-flash` (stable)
  - Best for: Balanced performance and speed
  - Use case: Agent operations requiring good reasoning
  
- **Gemini 2.5 Pro**: `gemini-2.5-pro` (stable)
  - Best for: Advanced reasoning, complex analysis
  - Use case: Insights generation, complex analytics

## Implementation Strategy

### 1. Core Configuration (`backend/app/core/llm.py`)
**Status**: ✅ Updated

Added model-specific constants:
```python
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"  # Default for general use
GEMINI_LITE_MODEL = "gemini-2.5-flash-lite"  # For high-volume conversational
GEMINI_FLASH_MODEL = "gemini-2.5-flash"  # For STA and SCA agents
GEMINI_PRO_MODEL = "gemini-2.5-pro"  # For Insights Agent (advanced reasoning)
```

### 2. Agent-Specific Updates

#### Aika Meta-Agent
**Status**: ✅ Updated  
**Model**: Gemini 2.5 Flash Lite (`gemini-2.5-flash-lite`)  
**Rationale**: Aika handles high-volume conversational messages when not delegating to specialist agents. Flash Lite provides optimal cost-efficiency and latency for this use case.

**Files Updated**:
- `backend/app/agents/aika/orchestrator.py` (3 locations)
- `backend/app/agents/aika/agent_adapters.py`
- `backend/app/domains/mental_health/routes/chat.py`

#### Safety Triage Agent (STA)
**Status**: ✅ Updated  
**Model**: Gemini 2.5 Flash (`gemini-2.5-flash`)  
**Rationale**: STA performs critical risk classification requiring reliable reasoning while maintaining response speed.

**Files Updated**:
- `backend/app/agents/sta/gemini_classifier.py`
- Uses `model="gemini_google"` which resolves to `DEFAULT_GEMINI_MODEL` (now `gemini-2.5-flash`)

#### Support Coach Agent (SCA)
**Status**: ✅ Updated  
**Model**: Gemini 2.5 Flash (`gemini-2.5-flash`)  
**Rationale**: SCA delivers CBT-informed interventions requiring good reasoning and empathy generation.

**Files Updated**:
- `backend/app/agents/sca/gemini_plan_generator.py`

#### Insights Agent (IA)
**Status**: ℹ️ Not applicable  
**Notes**: The Insights Agent currently uses SQL queries for analytics rather than LLM generation. If future features require LLM-based insights generation, use Gemini 2.5 Pro (`gemini-2.5-pro`).

**Reserved Configuration**:
- `GEMINI_PRO_MODEL = "gemini-2.5-pro"` available in `llm.py`

### 3. Supporting Services

#### Tool Calling Service
**Status**: ✅ Updated  
**File**: `backend/app/domains/mental_health/services/tool_calling.py`  
**Change**: Now uses `GEMINI_FLASH_MODEL` instead of hardcoded `gemini-2.0-flash`

#### AI Campaign Generator
**Status**: ✅ Updated  
**File**: `backend/app/domains/mental_health/services/ai_campaign_generator.py`  
**Change**: Updated to `gemini-2.5-flash` for campaign config generation

### 4. Monitoring and Metrics
**Status**: ⚠️ Needs Review

The following files contain hardcoded model names in decorators:
- `backend/app/core/langfuse_config.py` - Line 88: `@trace_llm_call("gemini-2.0-flash")`
- `backend/app/core/metrics.py` - Line 499: `@track_llm_metrics("gemini-2.0-flash")`

**Recommendation**: Update these to dynamically reference the model being used, or update to reflect the new default.

## Performance Expectations

### Gemini 2.5 Flash Lite (Aika Conversational)
- **Latency**: 20-40% faster than 2.0 Flash
- **Cost**: ~50% cheaper than 2.5 Flash
- **Quality**: Improved reasoning with thinking mode support
- **Context**: 1M+ token context window

### Gemini 2.5 Flash (STA & SCA)
- **Latency**: Similar to 2.0 Flash, with better accuracy
- **Quality**: Significantly improved reasoning and instruction following
- **Features**: Tool use, code execution, structured outputs
- **Context**: 1M+ token context window

### Gemini 2.5 Pro (Reserved for IA)
- **Reasoning**: Best-in-class for complex analytical tasks
- **Use case**: Multi-step reasoning, complex data analysis
- **Context**: 1M+ token context window

## Testing Checklist

- [ ] Test Aika conversational responses (should use Flash Lite)
- [ ] Test STA crisis classification accuracy
- [ ] Test SCA intervention plan generation
- [ ] Verify tool calling works with new models
- [ ] Check latency improvements
- [ ] Monitor cost changes
- [ ] Validate context window handling (especially for long conversations)
- [ ] Test error handling with new models

## Rollback Plan

If issues arise, revert by changing constants in `backend/app/core/llm.py`:
```python
DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"  # Rollback
GEMINI_LITE_MODEL = "gemini-2.0-flash"  # Rollback
GEMINI_FLASH_MODEL = "gemini-2.0-flash"  # Rollback
```

## Migration Date
**Date**: November 13, 2025  
**Migrated by**: Automated via Copilot  
**Testing Status**: Pending

## Additional Notes

1. **Model Aliases**: The codebase still uses `model="gemini_google"` in many places, which resolves to the appropriate constant via `llm.py`
2. **API Compatibility**: All Gemini 2.5 models are compatible with the new `google-genai` SDK already in use
3. **Context Windows**: All models support 1M+ token context, enabling longer conversation histories
4. **Thinking Mode**: Available on all 2.5 models for improved reasoning (can be enabled via thinking budgets)

## References
- [Gemini 2.5 Official Announcement](https://cloud.google.com/blog/products/ai-machine-learning/gemini-2-5-flash-lite-flash-pro-ga-vertex-ai)
- [Gemini Models Documentation](https://ai.google.dev/gemini-api/docs/models)
- [Gemini 2.5 Flash Lite Overview](https://deepmind.google/models/gemini/flash-lite/)
