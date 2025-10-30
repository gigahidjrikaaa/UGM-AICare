"""
API Endpoint Integration Tests
===============================

Tests for core API endpoints and request/response handling.
"""

import pytest
from httpx import AsyncClient


class TestHealthEndpoints:
    """Test health check and system status endpoints."""
    
    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        """Test basic health check endpoint."""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    @pytest.mark.asyncio
    async def test_root_endpoint(self, client: AsyncClient):
        """Test root endpoint."""
        response = await client.get("/")
        assert response.status_code == 200


class TestAuthEndpoints:
    """Test authentication endpoints."""
    
    @pytest.mark.asyncio
    async def test_auth_me_unauthorized(self, client: AsyncClient):
        """Test /api/auth/me without authentication."""
        response = await client.get("/api/auth/me")
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_auth_me_with_token(self, client: AsyncClient, auth_headers: dict):
        """Test /api/auth/me with valid token."""
        response = await client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert data["email"] == "test@ugm.ac.id"


class TestProfileEndpoints:
    """Test user profile endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_profile(self, client: AsyncClient, auth_headers: dict):
        """Test getting user profile."""
        response = await client.get("/api/v1/profile/overview", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "name" in data
    
    @pytest.mark.asyncio
    async def test_update_profile(self, client: AsyncClient, auth_headers: dict):
        """Test updating user profile."""
        update_data = {
            "name": "Updated Test User",
            "phone": "+628123456789",
            "city": "Yogyakarta",
        }
        response = await client.put(
            "/api/v1/profile/overview",
            headers=auth_headers,
            json=update_data,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Test User"
        assert data["phone"] == "+628123456789"
    
    @pytest.mark.asyncio
    async def test_profile_unauthorized(self, client: AsyncClient):
        """Test profile access without authentication."""
        response = await client.get("/api/v1/profile/overview")
        assert response.status_code == 401


class TestChatEndpoints:
    """Test chat and messaging endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_conversations(self, client: AsyncClient, auth_headers: dict):
        """Test getting user's conversations (admin endpoint)."""
        response = await client.get("/api/v1/admin/conversations", headers=auth_headers)
        # This requires admin role, so expect 403 for regular user
        assert response.status_code in [200, 403]
    
    @pytest.mark.asyncio
    async def test_send_message_unauthorized(self, client: AsyncClient):
        """Test sending message without authentication."""
        response = await client.post(
            "/api/v1/chat",
            json={"message": "Hello"},
        )
        assert response.status_code == 401


class TestJournalEndpoints:
    """Test journal entry endpoints."""
    
    @pytest.mark.asyncio
    async def test_create_journal_entry(self, client: AsyncClient, auth_headers: dict):
        """Test creating a journal entry."""
        journal_data = {
            "content": "Today I felt happy and productive.",
        }
        response = await client.post(
            "/api/v1/journal",
            headers=auth_headers,
            json=journal_data,
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        assert data["content"] == journal_data["content"]
    
    @pytest.mark.asyncio
    async def test_get_journal_entries(self, client: AsyncClient, auth_headers: dict):
        """Test getting user's journal entries."""
        response = await client.get("/api/v1/journal", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_journal_unauthorized(self, client: AsyncClient):
        """Test journal access without authentication."""
        response = await client.get("/api/v1/journal")
        assert response.status_code == 401


class TestAdminEndpoints:
    """Test admin-only endpoints."""
    
    @pytest.mark.asyncio
    async def test_admin_access_with_student(self, client: AsyncClient, auth_headers: dict):
        """Test admin endpoint access with student role."""
        response = await client.get("/api/v1/admin/users", headers=auth_headers)
        assert response.status_code in [401, 403]  # Unauthorized or Forbidden
    
    @pytest.mark.asyncio
    async def test_admin_access_with_admin(self, client: AsyncClient, admin_headers: dict):
        """Test admin endpoint access with admin role."""
        response = await client.get("/api/v1/admin/users", headers=admin_headers)
        assert response.status_code == 200


class TestRateLimiting:
    """Test rate limiting functionality."""
    
    @pytest.mark.asyncio
    async def test_rate_limit_not_triggered(self, client: AsyncClient, auth_headers: dict):
        """Test that normal usage doesn't trigger rate limit."""
        for _ in range(3):  # Make 3 requests (well under limit)
            response = await client.get("/api/v1/profile/overview", headers=auth_headers)
            assert response.status_code == 200


class TestErrorHandling:
    """Test error handling and validation."""
    
    @pytest.mark.asyncio
    async def test_404_not_found(self, client: AsyncClient):
        """Test 404 error for non-existent endpoint."""
        response = await client.get("/api/nonexistent")
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_invalid_json(self, client: AsyncClient, auth_headers: dict):
        """Test error handling for invalid JSON."""
        response = await client.post(
            "/api/v1/journal",
            headers=auth_headers,
            content="invalid json{",
        )
        assert response.status_code in [400, 422]  # Bad Request or Unprocessable Entity
    
    @pytest.mark.asyncio
    async def test_missing_required_fields(self, client: AsyncClient, auth_headers: dict):
        """Test validation for missing required fields."""
        response = await client.post(
            "/api/journals",
            headers=auth_headers,
            json={},  # Missing required 'content' field
        )
        assert response.status_code == 422  # Validation error
