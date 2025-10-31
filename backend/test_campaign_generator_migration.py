"""
Test script for AICampaignGenerator migration from google-generativeai to google-genai.

This script verifies that:
1. The new SDK imports work correctly
2. The AICampaignGenerator initializes with the client
3. The generate_campaign_config method works with the new SDK
"""

import asyncio
import logging
from app.domains.mental_health.services.ai_campaign_generator import AICampaignGenerator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_campaign_generator():
    """Test the migrated campaign generator."""
    
    logger.info("🧪 Testing AICampaignGenerator migration...")
    
    try:
        # Test 1: Initialize generator
        logger.info("\n1️⃣ Testing initialization...")
        generator = AICampaignGenerator()
        logger.info("✅ Generator initialized successfully")
        
        # Test 2: Generate campaign config
        logger.info("\n2️⃣ Testing campaign generation...")
        config = await generator.generate_campaign_config(
            campaign_name="Stress Management Week",
            campaign_description="Create a supportive campaign to help students manage exam stress and promote wellness resources."
        )
        
        logger.info("✅ Campaign config generated successfully")
        logger.info(f"\n📋 Generated Config:")
        logger.info(f"  - Target Audience: {config.get('target_audience')}")
        logger.info(f"  - Priority: {config.get('priority')}")
        logger.info(f"  - Message: {config.get('message_template', '')[:100]}...")
        logger.info(f"  - Triggers: {len(config.get('triggers', []))} trigger(s)")
        logger.info(f"  - AI Rationale: {config.get('ai_rationale', 'N/A')}")
        
        # Test 3: Verify config structure
        logger.info("\n3️⃣ Testing config validation...")
        assert 'target_audience' in config
        assert 'message_template' in config
        assert 'triggers' in config
        assert 'priority' in config
        logger.info("✅ Config structure validated")
        
        logger.info("\n🎉 All tests passed! Migration successful!")
        return True
        
    except Exception as e:
        logger.error(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_campaign_generator())
    exit(0 if success else 1)
