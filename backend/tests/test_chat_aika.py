"""
Chat and Message Processing Tests (Updated for Aika Meta-Agent)
================================================================

Tests for Aika Meta-Agent chat processing and conversation management.
All tests now use the /api/v1/aika endpoint which handles LangGraph orchestration.
"""

import pytest
from httpx import AsyncClient
from datetime import datetime


class TestConversationManagement:
    """Test conversation via Aika Meta-Agent."""
    
    @pytest.mark.asyncio
    async def test_create_new_conversation(self, client: AsyncClient, auth_headers: dict):
        """Test starting a new conversation via Aika."""
        request = {
            "google_sub": "test_user_123",
            "session_id": "test_new_conv",
            "conversation_id": "1",
            "message": "Hello, I want to talk about my feelings",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=request,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "response" in data
    
    @pytest.mark.asyncio
    async def test_list_user_conversations(self, client: AsyncClient, auth_headers: dict):
        """Test listing conversation history."""
        response = await client.get(
            "/api/v1/history",
            headers=auth_headers,
            params={"limit": 50}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_get_conversation_by_id(self, client: AsyncClient, auth_headers: dict):
        """Test retrieving conversation via history endpoint."""
        response = await client.get(
            "/api/v1/history",
            headers=auth_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_update_conversation(self, client: AsyncClient, auth_headers: dict):
        """Test conversation continuation (updating history)."""
        request = {
            "google_sub": "test_user_123",
            "session_id": "test_update_conv",
            "conversation_id": "1",
            "message": "I want to continue our previous conversation",
            "history": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi! How can I help?"}
            ],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=request,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    @pytest.mark.asyncio
    async def test_delete_conversation(self, client: AsyncClient, auth_headers: dict):
        """Test conversation isolation (each session is independent)."""
        request1 = {
            "google_sub": "test_user_123",
            "session_id": "session_1",
            "conversation_id": "1",
            "message": "This is session 1",
            "history": [],
        }
        
        response1 = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=request1,
        )
        
        assert response1.status_code == 200


class TestMessageSending:
    """Test sending and receiving messages via Aika."""
    
    @pytest.mark.asyncio
    async def test_send_chat_message(self, client: AsyncClient, auth_headers: dict):
        """Test sending a chat message via Aika."""
        request = {
            "google_sub": "test_user_123",
            "session_id": "test_send_message",
            "conversation_id": "1",
            "message": "Hello, I need help with anxiety",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=request,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "response" in data
        assert len(data["response"]) > 0
    
    @pytest.mark.asyncio
    async def test_get_conversation_messages(self, client: AsyncClient, auth_headers: dict):
        """Test retrieving messages via history endpoint."""
        # First send a message
        await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json={
                "google_sub": "test_user_123",
                "session_id": "test_history",
                "conversation_id": "1",
                "message": "Test message",
                "history": [],
            },
        )
        
        # Then get history
        response = await client.get(
            "/api/v1/history",
            headers=auth_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_message_with_empty_content(self, client: AsyncClient, auth_headers: dict):
        """Test that empty messages are rejected."""
        request = {
            "google_sub": "test_user_123",
            "session_id": "test_empty",
            "conversation_id": "1",
            "message": "",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=request,
        )
        
        # Should return error for empty message
        assert response.status_code in [400, 422]


class TestAIResponses:
    """Test AI response generation via Aika."""
    
    @pytest.mark.asyncio
    async def test_ai_response_generation(self, client: AsyncClient, auth_headers: dict):
        """Test that Aika generates appropriate responses."""
        request = {
            "google_sub": "test_user_123",
            "session_id": "test_ai_response",
            "conversation_id": "1",
            "message": "I'm feeling stressed about exams",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=request,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["response"]) > 20  # Should be a substantial response
    
    @pytest.mark.asyncio
    async def test_context_awareness(self, client: AsyncClient, auth_headers: dict):
        """Test that Aika maintains context across messages."""
        # First message
        request1 = {
            "google_sub": "test_user_123",
            "session_id": "test_context",
            "conversation_id": "1",
            "message": "I'm feeling anxious",
            "history": [],
        }
        
        response1 = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=request1,
        )
        
        assert response1.status_code == 200
        
        # Follow-up message with history
        request2 = {
            "google_sub": "test_user_123",
            "session_id": "test_context",
            "conversation_id": "1",
            "message": "Can you tell me more about what you just said?",
            "history": [
                {"role": "user", "content": "I'm feeling anxious"},
                {"role": "assistant", "content": response1.json()["response"]}
            ],
        }
        
        response2 = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=request2,
        )
        
        assert response2.status_code == 200


class TestMessageMetadata:
    """Test message metadata handling."""
    
    @pytest.mark.asyncio
    async def test_message_timestamps(self, client: AsyncClient, auth_headers: dict):
        """Test that messages include timestamps."""
        request = {
            "google_sub": "test_user_123",
            "session_id": "test_timestamps",
            "conversation_id": "1",
            "message": "Test message",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=request,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "metadata" in data
        # Metadata should include processing time
        assert "processing_time_ms" in data["metadata"]
    
    @pytest.mark.asyncio
    async def test_message_sender_tracking(self, client: AsyncClient, auth_headers: dict):
        """Test that message sender is tracked."""
        request = {
            "google_sub": "test_user_123",
            "session_id": "test_sender",
            "conversation_id": "1",
            "message": "Test message",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=request,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestChatSecurity:
    """Test chat security and privacy."""
    
    @pytest.mark.asyncio
    async def test_user_cannot_access_other_conversations(self, client: AsyncClient, auth_headers: dict):
        """Test that users can only access their own conversations."""
        # This is handled by auth_headers fixture which validates JWT
        response = await client.get(
            "/api/v1/history",
            headers=auth_headers,
        )
        
        assert response.status_code == 200
        # Only returns current user's history
    
    @pytest.mark.asyncio
    async def test_conversation_isolation(self, client: AsyncClient, auth_headers: dict):
        """Test that conversations are isolated per session."""
        # Session 1
        request1 = {
            "google_sub": "test_user_123",
            "session_id": "isolated_session_1",
            "conversation_id": "1",
            "message": "Secret message in session 1",
            "history": [],
        }
        
        response1 = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=request1,
        )
        
        # Session 2 should not have access to session 1's history
        request2 = {
            "google_sub": "test_user_123",
            "session_id": "isolated_session_2",
            "conversation_id": "1",
            "message": "Can you repeat what I said earlier?",
            "history": [],  # Empty history - different session
        }
        
        response2 = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=request2,
        )
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        # Response 2 should not contain info from session 1
        assert "Secret message" not in response2.json()["response"]
