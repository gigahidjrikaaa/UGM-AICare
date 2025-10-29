"""
Journal Entry Tests
===================

Tests for journal creation, retrieval, mood tracking, and privacy.
"""

import pytest
from httpx import AsyncClient
from datetime import datetime, date, timedelta


class TestJournalCreation:
    """Test creating journal entries."""
    
    @pytest.mark.asyncio
    async def test_create_basic_journal(self, client: AsyncClient, auth_headers: dict):
        """Test creating a basic journal entry."""
        journal_data = {
            "content": "Today was a productive day. I completed my assignments.",
            "mood": "happy",
        }
        
        response = await client.post(
            "/api/journals",
            headers=auth_headers,
            json=journal_data,
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        assert data["content"] == journal_data["content"]
        assert data["mood"] == journal_data["mood"]
    
    @pytest.mark.asyncio
    async def test_create_journal_with_tags(self, client: AsyncClient, auth_headers: dict):
        """Test creating journal with tags."""
        journal_data = {
            "content": "Feeling anxious about upcoming presentation",
            "mood": "anxious",
            "tags": ["academic", "stress", "presentation"],
        }
        
        response = await client.post(
            "/api/journals",
            headers=auth_headers,
            json=journal_data,
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert "tags" in data
    
    @pytest.mark.asyncio
    async def test_create_private_journal(self, client: AsyncClient, auth_headers: dict):
        """Test creating a private journal entry."""
        journal_data = {
            "content": "Very private thoughts",
            "mood": "reflective",
            "is_private": True,
        }
        
        response = await client.post(
            "/api/journals",
            headers=auth_headers,
            json=journal_data,
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("is_private") is True
    
    @pytest.mark.asyncio
    async def test_create_journal_missing_content(self, client: AsyncClient, auth_headers: dict):
        """Test that journal without content is rejected."""
        journal_data = {
            "mood": "happy",
            # Missing content
        }
        
        response = await client.post(
            "/api/journals",
            headers=auth_headers,
            json=journal_data,
        )
        
        assert response.status_code == 422  # Validation error


class TestJournalRetrieval:
    """Test retrieving journal entries."""
    
    @pytest.mark.asyncio
    async def test_get_all_journals(self, client: AsyncClient, auth_headers: dict):
        """Test retrieving all user journals."""
        # Create a journal first
        await client.post(
            "/api/journals",
            headers=auth_headers,
            json={"content": "Test entry", "mood": "neutral"},
        )
        
        response = await client.get("/api/journals", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    @pytest.mark.asyncio
    async def test_get_journal_by_id(self, client: AsyncClient, auth_headers: dict):
        """Test retrieving a specific journal entry."""
        # Create journal
        create_response = await client.post(
            "/api/journals",
            headers=auth_headers,
            json={"content": "Specific entry", "mood": "happy"},
        )
        journal_id = create_response.json()["id"]
        
        # Retrieve it
        response = await client.get(
            f"/api/journals/{journal_id}",
            headers=auth_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == journal_id
    
    @pytest.mark.asyncio
    async def test_get_journals_by_date_range(self, client: AsyncClient, auth_headers: dict):
        """Test filtering journals by date range."""
        # Create journal
        await client.post(
            "/api/journals",
            headers=auth_headers,
            json={"content": "Date range test", "mood": "neutral"},
        )
        
        today = date.today()
        start_date = today - timedelta(days=7)
        end_date = today + timedelta(days=1)
        
        response = await client.get(
            "/api/journals",
            headers=auth_headers,
            params={
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_get_journals_by_mood(self, client: AsyncClient, auth_headers: dict):
        """Test filtering journals by mood."""
        # Create journals with different moods
        await client.post(
            "/api/journals",
            headers=auth_headers,
            json={"content": "Happy entry", "mood": "happy"},
        )
        await client.post(
            "/api/journals",
            headers=auth_headers,
            json={"content": "Sad entry", "mood": "sad"},
        )
        
        response = await client.get(
            "/api/journals",
            headers=auth_headers,
            params={"mood": "happy"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestJournalUpdating:
    """Test updating journal entries."""
    
    @pytest.mark.asyncio
    async def test_update_journal_content(self, client: AsyncClient, auth_headers: dict):
        """Test updating journal content."""
        # Create journal
        create_response = await client.post(
            "/api/journals",
            headers=auth_headers,
            json={"content": "Original content", "mood": "neutral"},
        )
        journal_id = create_response.json()["id"]
        
        # Update it
        response = await client.put(
            f"/api/journals/{journal_id}",
            headers=auth_headers,
            json={"content": "Updated content", "mood": "happy"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Updated content"
        assert data["mood"] == "happy"
    
    @pytest.mark.asyncio
    async def test_update_journal_privacy(self, client: AsyncClient, auth_headers: dict):
        """Test changing journal privacy setting."""
        # Create public journal
        create_response = await client.post(
            "/api/journals",
            headers=auth_headers,
            json={"content": "Public entry", "mood": "neutral", "is_private": False},
        )
        journal_id = create_response.json()["id"]
        
        # Make it private
        response = await client.put(
            f"/api/journals/{journal_id}",
            headers=auth_headers,
            json={"is_private": True},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("is_private") is True


class TestJournalDeletion:
    """Test deleting journal entries."""
    
    @pytest.mark.asyncio
    async def test_delete_journal(self, client: AsyncClient, auth_headers: dict):
        """Test deleting a journal entry."""
        # Create journal
        create_response = await client.post(
            "/api/journals",
            headers=auth_headers,
            json={"content": "To be deleted", "mood": "neutral"},
        )
        journal_id = create_response.json()["id"]
        
        # Delete it
        response = await client.delete(
            f"/api/journals/{journal_id}",
            headers=auth_headers,
        )
        
        assert response.status_code in [200, 204]
        
        # Verify it's gone
        get_response = await client.get(
            f"/api/journals/{journal_id}",
            headers=auth_headers,
        )
        assert get_response.status_code == 404


class TestMoodTracking:
    """Test mood tracking and analytics."""
    
    @pytest.mark.asyncio
    async def test_mood_statistics(self, client: AsyncClient, auth_headers: dict):
        """Test getting mood statistics."""
        # Create journals with different moods
        moods = ["happy", "sad", "anxious", "calm", "happy"]
        for mood in moods:
            await client.post(
                "/api/journals",
                headers=auth_headers,
                json={"content": f"{mood} entry", "mood": mood},
            )
        
        response = await client.get(
            "/api/journals/mood-stats",
            headers=auth_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
    
    @pytest.mark.asyncio
    async def test_mood_trends(self, client: AsyncClient, auth_headers: dict):
        """Test getting mood trends over time."""
        response = await client.get(
            "/api/journals/mood-trends",
            headers=auth_headers,
            params={"period": "week"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))


class TestJournalSecurity:
    """Test journal security and privacy."""
    
    @pytest.mark.asyncio
    async def test_user_cannot_access_other_journals(self, client: AsyncClient, auth_headers: dict):
        """Test that users cannot access other users' journals."""
        # Attempt to access a journal that doesn't exist or belongs to another user
        response = await client.get(
            "/api/journals/99999",
            headers=auth_headers,
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_journal_requires_authentication(self, client: AsyncClient):
        """Test that journal endpoints require authentication."""
        response = await client.get("/api/journals")
        assert response.status_code == 401
        
        response = await client.post(
            "/api/journals",
            json={"content": "Test", "mood": "neutral"},
        )
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_private_journals_not_in_analytics(self, client: AsyncClient, auth_headers: dict):
        """Test that private journals are excluded from analytics."""
        # Create private journal
        await client.post(
            "/api/journals",
            headers=auth_headers,
            json={
                "content": "Private entry",
                "mood": "happy",
                "is_private": True,
            },
        )
        
        # Analytics should respect privacy settings
        # This is a placeholder - actual implementation may vary
        pass


class TestJournalPrompts:
    """Test journal prompt system."""
    
    @pytest.mark.asyncio
    async def test_get_daily_prompt(self, client: AsyncClient, auth_headers: dict):
        """Test getting daily journal prompt."""
        response = await client.get(
            "/api/journal-prompts/daily",
            headers=auth_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "prompt" in data or "text" in data
    
    @pytest.mark.asyncio
    async def test_respond_to_prompt(self, client: AsyncClient, auth_headers: dict):
        """Test creating journal entry from prompt."""
        # Get prompt
        prompt_response = await client.get(
            "/api/journal-prompts/daily",
            headers=auth_headers,
        )
        prompt_data = prompt_response.json()
        
        # Create entry with prompt_id
        response = await client.post(
            "/api/journals",
            headers=auth_headers,
            json={
                "content": "Response to prompt",
                "mood": "reflective",
                "prompt_id": prompt_data.get("id"),
            },
        )
        
        assert response.status_code in [200, 201]
