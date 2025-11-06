"""
Test Registration with Normalized User Tables

Tests the updated registration endpoint that creates entries in:
- users (core auth)
- user_profiles (demographics)
- user_preferences (settings)
- user_consent_ledger (GDPR/HIPAA compliance)
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, UserProfile, UserPreferences, UserConsentLedger


@pytest.mark.asyncio
async def test_register_creates_normalized_tables(
    client: AsyncClient,
    db_session: AsyncSession
):
    """Test that registration creates entries in all normalized tables."""
    
    # Registration payload
    registration_data = {
        "name": "John Doe",
        "email": "john.doe@ugm.ac.id",
        "password": "SecurePassword123!",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+62812345678",
        "dateOfBirth": "2000-01-15",
        "gender": "male",
        "city": "Yogyakarta",
        "university": "Universitas Gadjah Mada",
        "major": "Computer Science",
        "yearOfStudy": "3",
        "allowEmailCheckins": True,
    }
    
    # Call registration endpoint
    response = await client.post("/api/auth/register", json=registration_data)
    
    # Assert successful registration
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "User registered successfully"
    assert "user_id" in data
    
    user_id = data["user_id"]
    
    # =========================================================================
    # 1. Verify User (core auth) was created
    # =========================================================================
    result = await db_session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()
    
    assert user is not None
    assert user.role == "user"
    assert user.password_hash is not None
    assert user.check_in_code is not None
    
    # =========================================================================
    # 2. Verify UserProfile was created with demographic data
    # =========================================================================
    result = await db_session.execute(
        select(UserProfile).where(UserProfile.user_id == user_id)
    )
    profile = result.scalar_one()
    
    assert profile is not None
    # Note: Fields are encrypted, so we can't verify exact values
    # But we can verify the record exists and has data
    assert profile.city is not None  # Should be encrypted "Yogyakarta"
    assert profile.country == "Indonesia"  # Default for UGM
    assert profile.year_of_study == 3
    
    # =========================================================================
    # 3. Verify UserPreferences was created with defaults
    # =========================================================================
    result = await db_session.execute(
        select(UserPreferences).where(UserPreferences.user_id == user_id)
    )
    preferences = result.scalar_one()
    
    assert preferences is not None
    assert preferences.preferred_language == "id"  # Indonesian default
    assert preferences.preferred_timezone == "Asia/Jakarta"  # Indonesian timezone
    assert preferences.allow_email_checkins is True
    assert preferences.theme == "system"
    assert preferences.aika_personality == "empathetic"
    assert preferences.aika_response_length == "balanced"
    
    # =========================================================================
    # 4. Verify UserConsentLedger entries were created
    # =========================================================================
    result = await db_session.execute(
        select(UserConsentLedger).where(UserConsentLedger.user_id == user_id)
    )
    consent_entries = result.scalars().all()
    
    assert len(consent_entries) >= 2  # At least data_sharing and research
    
    consent_types = {entry.consent_type for entry in consent_entries}
    assert "data_sharing" in consent_types
    assert "research" in consent_types
    
    # Verify all consents default to not granted (opt-in model)
    for entry in consent_entries:
        assert entry.granted is False  # Default: not granted
        assert entry.consent_version == "v1.0"
        assert entry.consent_language == "id"
        assert entry.consent_method == "registration"


@pytest.mark.asyncio
async def test_register_with_minimal_data(
    client: AsyncClient,
    db_session: AsyncSession
):
    """Test registration with only required fields."""
    
    registration_data = {
        "name": "Jane Smith",
        "email": "jane.smith@ugm.ac.id",
        "password": "SecurePassword456!",
    }
    
    response = await client.post("/api/auth/register", json=registration_data)
    
    assert response.status_code == 200
    data = response.json()
    user_id = data["user_id"]
    
    # Verify UserProfile was created (even with minimal data)
    result = await db_session.execute(
        select(UserProfile).where(UserProfile.user_id == user_id)
    )
    profile = result.scalar_one()
    assert profile is not None
    assert profile.country == "Indonesia"  # Default
    
    # Verify UserPreferences was created with defaults
    result = await db_session.execute(
        select(UserPreferences).where(UserPreferences.user_id == user_id)
    )
    preferences = result.scalar_one()
    assert preferences is not None
    assert preferences.preferred_language == "id"


@pytest.mark.asyncio
async def test_register_duplicate_email_fails(client: AsyncClient):
    """Test that registering with duplicate email fails."""
    
    registration_data = {
        "name": "Test User",
        "email": "duplicate@ugm.ac.id",
        "password": "Password123!",
    }
    
    # First registration
    response1 = await client.post("/api/auth/register", json=registration_data)
    assert response1.status_code == 200
    
    # Second registration (should fail)
    response2 = await client.post("/api/auth/register", json=registration_data)
    assert response2.status_code == 400
    assert "already registered" in response2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_invalid_date_format_fails(client: AsyncClient):
    """Test that invalid date format returns 400."""
    
    registration_data = {
        "name": "Test User",
        "email": "test@ugm.ac.id",
        "password": "Password123!",
        "dateOfBirth": "15-01-2000",  # Wrong format (should be YYYY-MM-DD)
    }
    
    response = await client.post("/api/auth/register", json=registration_data)
    assert response.status_code == 400
    assert "Invalid date format" in response.json()["detail"]


if __name__ == "__main__":
    print("Run with: pytest backend/tests/test_registration_normalized.py -v")
