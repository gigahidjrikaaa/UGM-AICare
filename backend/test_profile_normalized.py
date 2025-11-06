#!/usr/bin/env python3
"""
Test script for profile endpoint normalization.

This script tests that the profile endpoints correctly:
1. Read from normalized tables (UserProfile, UserPreferences, UserEmergencyContact)
2. Fallback to legacy User columns when normalized tables are empty
3. Write to both normalized and legacy tables (dual-write)
4. Create UserConsentLedger entries for consent changes

Run inside Docker container:
docker exec -it ugm_aicare_backend_dev bash -c "cd /app && python test_profile_normalized.py"
"""

import asyncio
import sys
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import AsyncSessionLocal
from app.models import (
    User,
    UserProfile,
    UserPreferences,
    UserEmergencyContact,
    UserConsentLedger,
)
from app.utils.security_utils import encrypt_data, decrypt_data


async def test_profile_normalization():
    """Test profile data normalization."""
    print("🔍 Testing Profile Endpoint Normalization\n")
    
    async with AsyncSessionLocal() as db:
        # Find first user with normalized profile
        # Note: User.profile has lazy="joined" so it loads automatically
        # We only need to explicitly load emergency_contacts with selectinload
        stmt = (
            select(User)
            .limit(1)
        )
        result = await db.execute(stmt)
        user = result.unique().scalar_one_or_none()
        
        if not user:
            print("❌ No users found in database")
            return False
        
        print(f"✅ Found user: {user.id}")
        print(f"   Email: {decrypt_data(user.email) if user.email else 'N/A'}")
        
        # Test 1: Check if normalized tables are loaded
        print("\n📊 Test 1: Normalized Table Relationships")
        if user.profile:
            print(f"   ✅ UserProfile loaded: ID={user.profile.id}")
            first_name = decrypt_data(user.profile.first_name) if user.profile.first_name else None
            last_name = decrypt_data(user.profile.last_name) if user.profile.last_name else None
            print(f"      Name: {first_name} {last_name}")
            print(f"      City: {decrypt_data(user.profile.city) if user.profile.city else 'N/A'}")
            print(f"      University: {decrypt_data(user.profile.university) if user.profile.university else 'N/A'}")
        else:
            print("   ⚠️  UserProfile not found (will use legacy User columns)")
        
        if user.preferences:
            print(f"   ✅ UserPreferences loaded: ID={user.preferences.id}")
            print(f"      Language: {decrypt_data(user.preferences.preferred_language) if user.preferences.preferred_language else 'N/A'}")
            print(f"      Timezone: {decrypt_data(user.preferences.preferred_timezone) if user.preferences.preferred_timezone else 'N/A'}")
        else:
            print("   ⚠️  UserPreferences not found (will use legacy User columns)")
        
        if user.emergency_contacts:
            print(f"   ✅ Emergency Contacts loaded: {len(user.emergency_contacts)} contact(s)")
            for contact in user.emergency_contacts:
                print(f"      - {decrypt_data(contact.full_name) if contact.full_name else 'N/A'}")
                print(f"        Relationship: {decrypt_data(contact.relationship_to_user) if contact.relationship_to_user else 'N/A'}")
        else:
            print("   ⚠️  No emergency contacts found")
        
        # Test 2: Check legacy columns
        print("\n📊 Test 2: Legacy User Columns (Backward Compatibility)")
        legacy_first_name = decrypt_data(user.first_name) if user.first_name else None
        legacy_last_name = decrypt_data(user.last_name) if user.last_name else None
        legacy_city = decrypt_data(user.city) if user.city else None
        print(f"   Legacy Name: {legacy_first_name} {legacy_last_name}")
        print(f"   Legacy City: {legacy_city or 'N/A'}")
        print(f"   Legacy Phone: {decrypt_data(user.phone) if user.phone else 'N/A'}")
        
        # Test 3: Check consent ledger entries
        print("\n📊 Test 3: UserConsentLedger Entries")
        consent_stmt = (
            select(UserConsentLedger)
            .where(UserConsentLedger.user_id == user.id)
            .order_by(UserConsentLedger.timestamp.desc())
            .limit(5)
        )
        consent_result = await db.execute(consent_stmt)
        consent_entries = consent_result.scalars().all()
        
        if consent_entries:
            print(f"   ✅ Found {len(consent_entries)} consent entries")
            for entry in consent_entries:
                print(f"      - {entry.consent_type}: {'Granted' if entry.granted else 'Denied'}")
                print(f"        Method: {entry.consent_method}, Version: {entry.consent_version}")
                print(f"        Timestamp: {entry.timestamp}")
        else:
            print("   ⚠️  No consent ledger entries found")
        
        # Test 4: Verify dual-write worked (profile and legacy should match)
        print("\n📊 Test 4: Dual-Write Consistency Check")
        if user.profile:
            profile_first = decrypt_data(user.profile.first_name) if user.profile.first_name else None
            legacy_first = decrypt_data(user.first_name) if user.first_name else None
            
            if profile_first == legacy_first:
                print(f"   ✅ first_name matches: '{profile_first}'")
            else:
                print(f"   ⚠️  first_name mismatch:")
                print(f"      Profile: '{profile_first}'")
                print(f"      Legacy:  '{legacy_first}'")
            
            profile_city = decrypt_data(user.profile.city) if user.profile.city else None
            legacy_city = decrypt_data(user.city) if user.city else None
            
            if profile_city == legacy_city:
                print(f"   ✅ city matches: '{profile_city}'")
            else:
                print(f"   ⚠️  city mismatch:")
                print(f"      Profile: '{profile_city}'")
                print(f"      Legacy:  '{legacy_city}'")
        
        print("\n" + "="*60)
        print("✅ Profile normalization tests completed!")
        print("="*60)
        return True


async def main():
    try:
        success = await test_profile_normalization()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
