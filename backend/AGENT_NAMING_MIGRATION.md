# Agent Naming Migration - SCA/SDA to TCA/CMA

## Summary

This document explains the incomplete agent renaming migration and the backward compatibility solution implemented.

## Background

The project underwent an agent renaming initiative to better reflect their roles:
- **SCA** (Support Coach Agent) → **TCA** (Therapeutic Coach Agent)
- **SDA** (Service Desk Agent) → **CMA** (Case Management Agent)

## Problem

The migration was **partially completed**, causing import errors:

1. **State Types** - `graph_state.py` defined `TCAState` and `CMAState`, but files were importing `SCAState` and `SDAState`
2. **Schema Types** - `tca/schemas.py` had `TCAInterveneRequest` but files imported `SCAInterveneRequest`
3. **Graph Functions** - Files imported `create_sca_graph` and `create_sda_graph` but the actual functions were `create_tca_graph` and `create_cma_graph`

## Solution: Backward Compatibility Aliases

Instead of renaming all references throughout the codebase (high risk, time-consuming), we added **type aliases** for backward compatibility.

### Changes Made

#### 1. `backend/app/agents/graph_state.py`

Added aliases after the original definitions:

```python
class TCAState(SafetyAgentState):
    """TCA-specific state extension."""
    pass

# Backward compatibility alias
SCAState = TCAState
"""Alias for TCAState. Support Coach Agent (SCA) was renamed to Therapeutic Coach Agent (TCA)."""

class CMAState(SafetyAgentState):
    """CMA-specific state extension."""
    pass

# Backward compatibility alias
SDAState = CMAState
"""Alias for CMAState. Service Desk Agent (SDA) was renamed to Case Management Agent (CMA)."""
```

#### 2. `backend/app/agents/tca/schemas.py`

Added schema aliases after definitions:

```python
class TCAInterveneRequest(BaseModel):
    ...

class TCAInterveneResponse(BaseModel):
    ...

# Backward compatibility aliases
SCAInterveneRequest = TCAInterveneRequest
"""Alias for TCAInterveneRequest. Support Coach Agent (SCA) was renamed to Therapeutic Coach Agent (TCA)."""

SCAInterveneResponse = TCAInterveneResponse
"""Alias for TCAInterveneResponse. Support Coach Agent (SCA) was renamed to Therapeutic Coach Agent (TCA)."""
```

#### 3. Function Names

Updated all graph function references:
- `create_sca_graph` → `create_tca_graph` in `backend/app/agents/tca/tca_graph.py`
- `create_sda_graph` → `create_cma_graph` in `backend/app/agents/cma/cma_graph.py`

Updated imports in:
- `backend/app/agents/orchestrator_graph.py`
- `backend/app/agents/tca/tca_graph_service.py`
- `backend/app/agents/cma/cma_graph_service.py`
- `backend/app/agents/aika_orchestrator_graph.py`

## Current State

✅ **Working**: All imports now resolve correctly
- Files can import either `SCAState` or `TCAState` (they're the same)
- Files can import either `SDAState` or `CMAState` (they're the same)
- Files can import either `SCAInterveneRequest` or `TCAInterveneRequest` (they're the same)

## Why Not Complete the Migration?

1. **Risk**: Changing hundreds of references across the codebase increases risk of breaking changes
2. **Time**: Manual search-and-replace for all SCA/SDA references would take significant time
3. **Testing**: Would require comprehensive testing of all agent workflows
4. **Documentation**: All docs, comments, and user-facing strings would need updates

## Future Work (Optional)

If you want to complete the migration:

1. Search for all `SCA` references: `grep -r "SCA" backend/app/`
2. Search for all `SDA` references: `grep -r "SDA" backend/app/`
3. Update imports to use `TCA` and `CMA` naming
4. Update function/variable names
5. Update documentation and comments
6. Test all agent workflows thoroughly

## Files That Still Use Old Naming

Many files still use SCA/SDA naming in:
- Variable names (e.g., `sca_result`, `sda_graph`)
- Function parameters (e.g., `execute_sca_subgraph`)
- Comments and docstrings
- Route paths (e.g., `/api/agents/sca/intervene`)
- Frontend code (e.g., `useSCAData.ts`)

**These all work correctly** because of the aliases. No functionality is affected.

## Verification

Backend startup confirmed successful:
- No import errors
- All agent services initialized
- Health endpoint responding
- All 10 agent tools registered

## Recommendation

**Keep the current approach** - The aliases provide:
- ✅ Zero breaking changes
- ✅ Backward compatibility
- ✅ Gradual migration path if needed
- ✅ Clear documentation via type hints

Only complete the full migration if there's a strong business need or if the mixed naming causes confusion for new developers.
