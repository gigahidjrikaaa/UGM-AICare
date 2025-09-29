# Deprecated Documentation Index

The Safety Agent refactor (September 2025) supersedes several earlier documents that described the legacy analytics, intervention, and triage stacks. Those files have been retained only as historical stubs for commit history and should not be used for current development work.

| Legacy File | Status | Replacement |
|-------------|--------|-------------|
| `ai-integration-guide.md` | Deprecated | See `single-source-of-truth.md` (Safety Agent Architecture) and `refactor_plan.md` |
| `api-integration-reference.md` | Deprecated | Safety Desk / Insights API contracts will be published once the new routers are finalized |
| `authentication-system-update.md` | Deprecated | Authentication changes tracked in `/backend/app/routes/auth.py` and future `core/rbac.py` notes |
| `cbt-conversational-flows.md` | Deprecated | Safety Desk conversational intents live in the new STA module specs |
| `hybrid-architecture-guide.md` | Deprecated | Consolidated into the Safety Agent architecture summary |
| `implementation-guide.md` | Deprecated | Use `development-workflow.md` plus `refactor_plan.md` for execution guidance |
| `insight-foundations-plan.md` | Deprecated | Replaced by the Insights Agent data model defined in `refactor_plan.md` |
| `system-design.json` | Deprecated | Will be regenerated after the new events/messages schema stabilizes |
| `technical-implementation-guide.md` | Deprecated | Superseded by the Safety Agent refactor deliverables |
| `technical-specifications.md` | Deprecated | Awaiting rewrite for the Safety Agent suite |
| `three-agent-framework.md` | Deprecated | Replaced by the Safety Agent suite overview |
| `user-management-fixes.md` | Deprecated | All outstanding issues merged into the new RBAC initiative |

If you discover stray references to these legacy documents, update them to point at the new Safety Agent resources or open an issue so the documentation team can help.
