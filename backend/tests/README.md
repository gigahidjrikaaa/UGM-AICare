# UGM-AICare Backend Test Suite

Comprehensive test suite for the UGM-AICare mental health platform backend.

## � Test Organization

### tests/ (Root Level)
Core functionality tests that are run as part of CI/CD:
- **test_database.py** - Database models and CRUD operations
- **test_api_endpoints.py** - API endpoint integration tests
- **test_auth.py** - Authentication and authorization
- **test_chat.py** - Chat and messaging functionality
- **test_chat_aika.py** - Aika chatbot integration
- **test_journal.py** - Journal entries and mood tracking
- **test_agents.py** - Overall agent orchestration tests
- **test_activity_logging.py** - Real-time activity logging system

### tests/agents/
Agent-specific unit and integration tests:
- **test_gemini_sta.py** - Safety Triage Agent (STA) with Gemini classifier
  - Crisis detection (English + Indonesian)
  - Rule-based pre-screening tests
  - Gemini chain-of-thought assessment tests
  - Efficiency and caching tests
- **test_intervention_plans.py** - Intervention plan generation and management
- **test_support_coach_plan_flag.py** - Support Coach Agent (SCA) features

### tests/integration/
End-to-end integration tests (may require external services):
- **test_aika.py** - Aika orchestrator integration tests
- **test_aika_api.py** - Aika API endpoint tests
- **test_aika_validate.py** - Aika validation and error handling

### tests/legacy/
Archived tests for historical reference (not actively maintained):
- Migration tests (domain, LLM, tool calling)
- One-time infrastructure tests
- Deprecated feature tests
- See `legacy/README.md` for details

### Test Configuration
- **conftest.py** - Shared fixtures and test setup
- **__init__.py** - Test package initialization

## 🚀 Running Tests

### Run All Tests
```bash
cd backend
pytest
```

### Run Specific Test File
```bash
pytest tests/test_auth.py
```

### Run Tests by Category
```bash
# Agent-specific tests
pytest tests/agents/

# Integration tests (may require external services)
pytest tests/integration/

# Core functionality tests
pytest tests/test_*.py -k "not agents and not integration"
```

### Run Specific Test Class
```bash
pytest tests/test_auth.py::TestJWTTokens
```

### Run Specific Test
```bash
pytest tests/test_auth.py::TestJWTTokens::test_create_access_token
```

### Run with Coverage
```bash
pytest --cov=app --cov-report=html
```

### Run with Verbose Output
```bash
pytest -v
```

### Run Tests in Parallel
```bash
pytest -n auto
```

### Skip Integration Tests
```bash
pytest -m "not integration"
```

## 📊 Test Structure

```
tests/
├── __init__.py                    # Package initialization
├── conftest.py                    # Shared fixtures and configuration
├── README.md                      # This file
│
├── test_auth.py                   # Authentication tests
├── test_api_endpoints.py          # API integration tests
├── test_database.py               # Database model tests
├── test_chat.py                   # Chat functionality tests
├── test_chat_aika.py              # Aika chatbot tests
├── test_journal.py                # Journal entry tests
├── test_agents.py                 # Overall agent orchestration
├── test_activity_logging.py       # Activity logging system
│
├── agents/                        # Agent-specific tests
│   ├── __init__.py
│   ├── test_gemini_sta.py         # Safety Triage Agent (Gemini-based)
│   ├── test_intervention_plans.py # Intervention plan generation
│   └── test_support_coach_plan_flag.py  # Support Coach features
│
├── integration/                   # End-to-end integration tests
│   ├── __init__.py
│   ├── test_aika.py               # Aika orchestrator integration
│   ├── test_aika_api.py           # Aika API endpoints
│   └── test_aika_validate.py      # Aika validation flows
│
└── legacy/                        # Archived tests (not maintained)
    ├── README.md                  # Legacy test documentation
    ├── test_migration.py          # Domain migration tests
    ├── test_llm_migration.py      # LLM migration tests
    └── ... (see legacy/README.md for full list)
```

## 🔧 Test Fixtures

### Database Fixtures
- `db_engine` - Test database engine (SQLite in-memory)
- `db_session` - Async database session
- `client` - FastAPI test client

### User Fixtures
- `test_user` - Student user for testing
- `admin_user` - Admin user for testing
- `counselor_user` - Counselor user for testing

### Authentication Fixtures
- `test_token` - JWT token for test user
- `admin_token` - JWT token for admin user
- `counselor_token` - JWT token for counselor user
- `auth_headers` - Authorization headers with test token
- `admin_headers` - Authorization headers with admin token
- `counselor_headers` - Authorization headers with counselor token

## ⚙️ Test Environment

Tests use an isolated environment with:
- **Database**: SQLite in-memory (fast, isolated)
- **JWT Secret**: Test-only secret key
- **Encryption Key**: Test-only encryption key
- **API Keys**: Test-only internal API key

## 📝 Writing New Tests

### Basic Test Structure
```python
import pytest
from httpx import AsyncClient

class TestMyFeature:
    """Test description."""
    
    @pytest.mark.asyncio
    async def test_something(self, client: AsyncClient, auth_headers: dict):
        """Test specific functionality."""
        response = await client.get("/api/endpoint", headers=auth_headers)
        assert response.status_code == 200
```

### Using Database Session
```python
@pytest.mark.asyncio
async def test_database_operation(self, db_session: AsyncSession):
    """Test database operation."""
    from app.models.user import User
    
    user = User(email="test@example.com", name="Test")
    db_session.add(user)
    await db_session.commit()
    
    assert user.id is not None
```

## 🎯 Test Categories

### Unit Tests
Test individual functions and methods in isolation.
- Located in: Root tests/, tests/agents/
- Fast execution, no external dependencies
- Example: `tests/test_database.py`, `tests/agents/test_gemini_sta.py`

### Integration Tests
Test API endpoints and their interactions with the database and external services.
- Located in: tests/integration/
- May require external services (Gemini API, Redis)
- Marked with `@pytest.mark.integration`
- Example: `tests/integration/test_aika_api.py`

### End-to-End Tests
Test complete user workflows across multiple components.
- Located in: Root tests/, tests/integration/
- Full stack testing with database, API, and agents
- Example: `tests/test_chat_aika.py`

### Legacy Tests
Archived tests for historical reference (not actively maintained).
- Located in: tests/legacy/
- One-time migration tests, deprecated features
- Not run in CI/CD
- See `tests/legacy/README.md` for details

## 🏷️ Test Markers

### Available Markers
```python
@pytest.mark.integration  # Integration tests (may be slow, require external services)
@pytest.mark.asyncio      # Async tests (required for async functions)
@pytest.mark.slow         # Slow tests (skip with -m "not slow")
```

### Using Markers
```bash
# Run only integration tests
pytest -m integration

# Skip integration tests
pytest -m "not integration"

# Run specific marked tests
pytest -m "asyncio and not slow"
```

### Registering New Markers
Add to `pytest.ini` in backend root:
```ini
[pytest]
markers =
    integration: Integration tests with external services
    slow: Slow tests that take > 1 second
```

## 🔒 Security Testing

Tests include:
- Authentication and authorization checks
- Role-based access control
- Data isolation between users
- Privacy settings enforcement
- PII redaction verification

## 🏥 Mental Health Safeguards

Agent tests verify:
- Crisis detection accuracy
- Appropriate intervention recommendations
- Emergency resource provision
- Consent management
- Data privacy (differential privacy, k-anonymity)

## 📈 Test Metrics

Target coverage: **80%+**

Current coverage areas:
- ✅ Authentication and authorization
- ✅ User profile management
- ✅ Chat and messaging
- ✅ Journal entries
- ✅ Database models
- ✅ API endpoints
- ✅ Safety Agent Suite
- ⏳ CBT modules (in progress)
- ⏳ Blockchain integration (in progress)

## 🐛 Debugging Tests

### Run with Debug Output
```bash
pytest -s  # Show print statements
pytest -v  # Verbose output
pytest --pdb  # Drop into debugger on failure
```

### Run Failed Tests Only
```bash
pytest --lf  # Run last failed
pytest --ff  # Run failed first
```

## 🔄 Continuous Integration

Tests run automatically on:
- Every push to `main` branch
- Every pull request
- Manual workflow dispatch

CI/CD configuration: `.github/workflows/ci.yml`

## 📚 Additional Resources

- [pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [httpx AsyncClient](https://www.python-httpx.org/async/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites)

## ✅ Test Checklist

Before committing:
- [ ] All tests pass locally
- [ ] New features have tests
- [ ] Tests cover edge cases
- [ ] Tests are well-documented
- [ ] No hardcoded credentials
- [ ] Tests clean up after themselves

## 🤝 Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure tests pass
3. Update this README if needed
4. Check coverage with `pytest --cov`

---

**Note**: Tests use mock data and do not affect production databases or external services.
