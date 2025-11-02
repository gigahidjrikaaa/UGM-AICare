# Legacy Tests

These tests are kept for reference but are no longer actively maintained.
They were used for one-time migrations or testing deprecated features.

## Files

- `test_migration.py` - Domain migration backward compatibility test
- `test_llm_migration.py` - LLM migration test
- `test_tool_calling_migration.py` - Tool calling migration test
- `test_campaign_generator_migration.py` - Campaign generator migration test
- `test_import.py` - Simple import test
- `test_phase1_infra.py` - Phase 1 infrastructure test
- `test_tool_calling.py` - Old tool calling test (may reference deprecated ML)
- `test_activity_logger_simple.py` - Simple activity logger test
- `test_activity_logging.py` - Old activity logging test

## Note

These tests may not work with the current codebase and are kept only for
historical reference. They are not run as part of the regular test suite.
