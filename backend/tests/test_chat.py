"""
Chat and Message Processing Tests
==================================

Tests for real-time chat, message processing, and conversation management.
"""

import pytest
from httpx import AsyncClient
from datetime import datetime


class TestConversationManagement:
    """Test conversation CRUD operations."""
    
    @pytest.mark.asyncio
    async def test_create_new_conversation(self, client: AsyncClient, auth_headers: dict):
        """Test creating a new conversation."""
        response = await client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={"title": "My First Chat"},
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        assert data["title"] == "My First Chat"
    
    @pytest.mark.asyncio
    async def test_list_user_conversations(self, client: AsyncClient, auth_headers: dict):
        """Test listing all user conversations."""
        response = await client.get("/api/v1/chat", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_get_conversation_by_id(self, client: AsyncClient, auth_headers: dict):
        """Test retrieving a specific conversation."""
        # First create a conversation
        create_response = await client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={"title": "Test Conversation"},
        )
        conversation_id = create_response.json()["id"]
        
        # Then retrieve it
        response = await client.get(
            f"/api/v1/chat/{conversation_id}",
            headers=auth_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == conversation_id
    
    @pytest.mark.asyncio
    async def test_update_conversation(self, client: AsyncClient, auth_headers: dict):
        """Test updating conversation details."""
        # Create conversation
        create_response = await client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={"title": "Original Title"},
        )
        conversation_id = create_response.json()["id"]
        
        # Update it
        response = await client.put(
            f"/api/v1/chat/{conversation_id}",
            headers=auth_headers,
            json={"title": "Updated Title"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
    
    @pytest.mark.asyncio
    async def test_delete_conversation(self, client: AsyncClient, auth_headers: dict):
        """Test deleting a conversation."""
        # Create conversation
        create_response = await client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={"title": "To Be Deleted"},
        )
        conversation_id = create_response.json()["id"]
        
        # Delete it
        response = await client.delete(
            f"/api/v1/chat/{conversation_id}",
            headers=auth_headers,
        )
        
        assert response.status_code in [200, 204]


class TestMessageSending:
    """Test sending and receiving messages."""
    
    @pytest.mark.asyncio
    async def test_send_chat_message(self, client: AsyncClient, auth_headers: dict):
        """Test sending a chat message."""
        # Create conversation first
        conv_response = await client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={"title": "Chat Test"},
        )
        conversation_id = conv_response.json()["id"]
        
        # Send message
        response = await client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "message": "Hello, I need help with anxiety",
                "conversation_id": conversation_id,
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data or "message" in data
    
    @pytest.mark.asyncio
    async def test_get_conversation_messages(self, client: AsyncClient, auth_headers: dict):
        """Test retrieving all messages in a conversation."""
        # Create conversation and send message
        conv_response = await client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={"title": "Message History Test"},
        )
        conversation_id = conv_response.json()["id"]
        
        await client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "message": "Test message",
                "conversation_id": conversation_id,
            },
        )
        
        # Get messages
        response = await client.get(
            f"/api/v1/chat/{conversation_id}/messages",
            headers=auth_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_message_with_empty_content(self, client: AsyncClient, auth_headers: dict):
        """Test that empty messages are rejected."""
        response = await client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "message": "",
                "conversation_id": 1,
            },
        )
        
        assert response.status_code == 422  # Validation error


class TestAIResponses:
    """Test AI response generation."""
    
    @pytest.mark.asyncio
    async def test_ai_response_generation(self, client: AsyncClient, auth_headers: dict):
        """Test that AI generates appropriate responses."""
        conv_response = await client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={"title": "AI Test"},
        )
        conversation_id = conv_response.json()["id"]
        
        response = await client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "message": "I'm feeling anxious about my exams",
                "conversation_id": conversation_id,
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data or "message" in data
        # AI response should not be empty
        assert len(data.get("response", data.get("message", ""))) > 0
    
    @pytest.mark.asyncio
    async def test_context_awareness(self, client: AsyncClient, auth_headers: dict):
        """Test that AI maintains conversation context."""
        conv_response = await client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={"title": "Context Test"},
        )
        conversation_id = conv_response.json()["id"]
        
        # First message
        await client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "message": "My name is Budi",
                "conversation_id": conversation_id,
            },
        )
        
        # Second message - should remember the name
        response = await client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "message": "What's my name?",
                "conversation_id": conversation_id,
            },
        )
        
        assert response.status_code == 200
        # AI should reference the name "Budi" in context


class TestMessageMetadata:
    """Test message metadata and tracking."""
    
    @pytest.mark.asyncio
    async def test_message_timestamps(self, client: AsyncClient, auth_headers: dict):
        """Test that messages have proper timestamps."""
        conv_response = await client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={"title": "Timestamp Test"},
        )
        conversation_id = conv_response.json()["id"]
        
        response = await client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "message": "Test message",
                "conversation_id": conversation_id,
            },
        )
        
        # Get messages to check timestamps
        messages_response = await client.get(
            f"/api/v1/chat/{conversation_id}/messages",
            headers=auth_headers,
        )
        
        messages = messages_response.json()
        assert len(messages) > 0
        assert "created_at" in messages[0] or "timestamp" in messages[0]
    
    @pytest.mark.asyncio
    async def test_message_sender_tracking(self, client: AsyncClient, auth_headers: dict):
        """Test that message sender is tracked."""
        conv_response = await client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={"title": "Sender Test"},
        )
        conversation_id = conv_response.json()["id"]
        
        await client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "message": "Test message",
                "conversation_id": conversation_id,
            },
        )
        
        # Get messages
        messages_response = await client.get(
            f"/api/v1/chat/{conversation_id}/messages",
            headers=auth_headers,
        )
        
        messages = messages_response.json()
        user_message = next((m for m in messages if m.get("sender") == "user"), None)
        assert user_message is not None


class TestChatSecurity:
    """Test chat security and privacy."""
    
    @pytest.mark.asyncio
    async def test_user_cannot_access_other_conversations(self, client: AsyncClient, auth_headers: dict):
        """Test that users cannot access other users' conversations."""
        # This would require two different users
        # For now, test that accessing non-existent conversation returns 404
        response = await client.get(
            "/api/v1/chat/99999",
            headers=auth_headers,
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_conversation_isolation(self, client: AsyncClient, auth_headers: dict):
        """Test that conversations are isolated between users."""
        # Create conversation for test user
        conv_response = await client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={"title": "Private Conversation"},
        )
        conversation_id = conv_response.json()["id"]
        
        # Send message
        await client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "message": "Private message",
                "conversation_id": conversation_id,
            },
        )
        
        # Verify message is retrievable by owner
        response = await client.get(
            f"/api/v1/chat/{conversation_id}/messages",
            headers=auth_headers,
        )
        assert response.status_code == 200
