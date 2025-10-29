# UGM-AICare Backend Test Suite

Comprehensive test suite for the UGM-AICare mental health platform backend.

## 📋 Test Coverage

### Core Tests
- **test_database.py** - Database models and CRUD operations
- **test_api_endpoints.py** - API endpoint integration tests
- **test_auth.py** - Authentication and authorization
- **test_chat.py** - Chat and messaging functionality
- **test_journal.py** - Journal entries and mood tracking

### Agent Tests
- **test_agents.py** - Safety Agent Suite (STA/SCA/SDA/IA)
  - Safety Triage Agent (crisis detection)
  - Support Coach Agent (CBT interventions)
  - Service Desk Agent (case management)
  - Insights Agent (privacy-preserving analytics)

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

## 📊 Test Structure

```
tests/
├── __init__.py           # Package initialization
├── conftest.py           # Shared fixtures and configuration
├── test_auth.py          # Authentication tests
├── test_api_endpoints.py # API integration tests
├── test_database.py      # Database model tests
├── test_chat.py          # Chat functionality tests
├── test_journal.py       # Journal entry tests
└── test_agents.py        # Safety Agent Suite tests
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

### Integration Tests
Test API endpoints and their interactions with the database.

### End-to-End Tests
Test complete user workflows across multiple components.

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
