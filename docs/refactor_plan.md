# Safety Agent Refactor Plan

## Files/Directories To Remove Or Retire
- `backend/app/agents/triage_agent.py` -> replace with `agents/sta/*`
- `backend/app/agents/intervention_agent.py` -> replace with `agents/sca/*`
- `backend/app/agents/analytics_agent.py` -> replace with `agents/ia/*`
- `backend/app/routes/triage.py` and `backend/app/routes/admin/interventions.py` -> fold into new agent routers
- `backend/app/services/triage_metrics.py`, `analytics_service.py`, `analytics_insights.py`, `privacy_analytics.py`, `statistical_analysis.py` -> retire or wrap via new Insights Agent queries
- `backend/app/models/analytics.py`, `backend/app/models/clinical_analytics.py`, `backend/app/models/interventions.py`, `backend/app/models/agents.py` -> superseded by new `events/messages/cases/resources/consents`
- Alembic revisions specific to retired tables (keep history but mark as legacy in notes) - no deletion, but document superseded schema
- Frontend admin surfaces: `frontend/src/components/admin/triage`, `frontend/src/components/admin/interventions`, `frontend/src/components/admin/analytics`, and corresponding `frontend/src/app/admin/(protected)/(triage|interventions|analytics)` routes -> replace with Safety Desk + Insights
- User chat UI extras directly invoking legacy analytics/triage endpoints (search for `/triage`, `/analytics`, `/interventions`) -> update to new STA/SCA flows

## New Modules To Add
- `backend/app/agents/sta/{router.py,service.py,classifiers.py,schemas.py}`
- `backend/app/agents/sca/{router.py,service.py,modules/__init__.py,resources.py,schemas.py}`
- `backend/app/agents/sda/{router.py,service.py,sla.py,schemas.py}`
- `backend/app/agents/ia/{router.py,queries.py,schemas.py}`
- `backend/app/core/{db.py,rbac.py,redaction.py,policy.py,events.py,settings.py}` (reuse existing utilities where possible)
- `backend/app/models/{events.py,messages.py,consents.py,cases.py,resources.py,users.py}` with SQLAlchemy models aligned to new schema
- `backend/app/routes/agents/sta.py`, `sca.py`, `sda.py`, `ia.py` or consolidate under package router registration
- `backend/tests/agents/{test_sta.py,test_sca.py,test_sda.py,test_ia.py}` plus shared `tests/data/fakes.py`
- Frontend user experience components: `frontend/src/components/features/chat/{IntentChips.tsx,CrisisBanner.tsx,ActionCard.tsx,ConsentCard.tsx}` and wiring in `ChatInterface.tsx`
- Admin dashboard replacements: `frontend/src/app/admin/(protected)/safety-desk`, `frontend/src/app/admin/(protected)/insights`, and supporting components under `frontend/src/components/admin/{safety-desk,insights}`
- Documentation: `docs/agent_contracts.md`, `docs/privacy_safeguards.md`, `DEPRECATED.md`

## Alembic & Data Migration Steps
- Create revision `introduce_sda_ia_schema_and_events_overhaul` adding new tables (`events`, `messages`, `consents`, `cases`, `resources`, `users` minimal) with required indexes and enums
- Ensure downgrade drops new objects without disturbing legacy tables (document data loss implications)
- Implement backfill script to transform legacy event/message data into new structures with PII redaction before insert
- Update SQLAlchemy metadata bindings in `backend/app/database` (or new `core/db.py`) to include new models
- Verify `backend/alembic/env.py` target metadata picks up new models
- Add `scripts/run_migrations.sh` to orchestrate dump -> upgrade -> backfill -> report workflow
- Drafted revision stub: `backend/alembic/versions/9a5f9ae2bf74_introduce_sda_ia_schema_and_events_overhaul.py` (populate data transforms next)
- Added backfill routine `backend/scripts/backfill_agent_data.py` as migration dependency.

## Risk Areas & TODOs
- PII redaction: need deterministic hashing for `user_hash` and robust `prelog_redact`; validate against existing logging paths
- RBAC changes: ensure existing auth dependencies integrate with new `core/rbac.py` and do not break non-agent routes
- Feature flag enforcement: audit all experiment toggles to avoid crisis flow exposure
- Frontend regression: migrate all references to removed admin routes (triage/interventions/analytics) and ensure navigation updates do not break layout
- Backfill accuracy: confirm legacy data fields map cleanly to new schema; document gaps and fallback strategies
- Testing debt: expand unit/integration coverage for new agents, k-anonymity guard, SLA timers, and redaction routines
- Operational rollout: coordinate migration order (DB first, backend deployment, then frontend) and provide rollback guidance

## Next Steps
1. Scaffold new backend agent packages and core utilities while stubbing dependencies
2. Design SQLAlchemy models + alembic revision to support new data model
3. Implement redaction/policy utilities and integrate into agent services
4. Replace FastAPI routes with new agent endpoints behind RBAC guards
5. Ship frontend updates for chat and admin dashboards aligned with new APIs
6. Finalize tests, scripts, and documentation; prepare DEPRECATED mappings and migration report
