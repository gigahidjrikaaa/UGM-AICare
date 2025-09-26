"""System settings service for managing configuration."""

import logging
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.database import get_async_db

logger = logging.getLogger(__name__)

class SystemSettingsService:
    """Service for managing system-wide configuration settings."""
    
    def __init__(self):
        self._settings_cache: Dict[str, Any] = {}
        self._cache_valid = False
    
    async def get_theme_preferences(self, db: AsyncSession) -> Dict[str, Any]:
        """Get theme and appearance preferences."""
        return {
            "theme_mode": "dark",  # Default to dark theme
            "accent_color": "#FFCA40",  # UGM gold
            "density": "comfortable",  # Navigation density
            "animations_enabled": True,
            "glass_morphism": True
        }
    
    async def update_theme_preferences(
        self, 
        db: AsyncSession, 
        preferences: Dict[str, Any]
    ) -> bool:
        """Update theme and appearance preferences."""
        try:
            # In a real implementation, this would save to database
            # For now, we'll use cache
            valid_keys = {
                "theme_mode", "accent_color", "density", 
                "animations_enabled", "glass_morphism"
            }
            
            for key, value in preferences.items():
                if key in valid_keys:
                    self._settings_cache[key] = value
            
            logger.info(f"Updated theme preferences: {preferences}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating theme preferences: {e}")
            return False
    
    async def get_collaboration_settings(self, db: AsyncSession) -> Dict[str, Any]:
        """Get team collaboration settings."""
        return {
            "dual_approval_required": True,  # Require dual approval for interventions
            "notes_sharing": "counsellors",  # Who can see reviewer notes
            "escalation_enabled": True,  # Enable escalation workflows
            "review_timeout_hours": 24,  # Hours before auto-escalation
            "emergency_contacts": [],  # Emergency contact list
        }
    
    async def update_collaboration_settings(
        self, 
        db: AsyncSession, 
        settings: Dict[str, Any]
    ) -> bool:
        """Update collaboration settings."""
        try:
            valid_keys = {
                "dual_approval_required", "notes_sharing", "escalation_enabled",
                "review_timeout_hours", "emergency_contacts"
            }
            
            for key, value in settings.items():
                if key in valid_keys:
                    self._settings_cache[f"collab_{key}"] = value
            
            logger.info(f"Updated collaboration settings: {settings}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating collaboration settings: {e}")
            return False
    
    async def get_notification_settings(self, db: AsyncSession) -> Dict[str, Any]:
        """Get notification and alert settings."""
        return {
            "weekly_digest_enabled": True,  # Enable weekly wellbeing digest
            "email_alerts_enabled": True,  # Enable email alerts
            "sms_alerts_enabled": False,  # SMS alerts (requires configuration)
            "webhook_url": None,  # Webhook for external integrations
            "alert_thresholds": {
                "high_risk_users": 5,  # Alert when 5+ users flagged as high risk
                "system_load": 80,  # Alert at 80% system load
                "response_time": 5000,  # Alert if response time > 5 seconds
            },
            "quiet_hours": {
                "enabled": True,
                "start": "22:00",  # 10 PM
                "end": "08:00",    # 8 AM
            }
        }
    
    async def update_notification_settings(
        self, 
        db: AsyncSession, 
        settings: Dict[str, Any]
    ) -> bool:
        """Update notification settings."""
        try:
            valid_keys = {
                "weekly_digest_enabled", "email_alerts_enabled", 
                "sms_alerts_enabled", "webhook_url", "alert_thresholds",
                "quiet_hours"
            }
            
            for key, value in settings.items():
                if key in valid_keys:
                    self._settings_cache[f"notif_{key}"] = value
            
            logger.info(f"Updated notification settings: {settings}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating notification settings: {e}")
            return False
    
    async def get_security_settings(self, db: AsyncSession) -> Dict[str, Any]:
        """Get security and privacy settings."""
        return {
            "session_timeout_minutes": 1440,  # 24 hours
            "password_policy": {
                "min_length": 8,
                "require_uppercase": True,
                "require_lowercase": True,
                "require_numbers": True,
                "require_special_chars": False,
                "password_history": 5,  # Remember last 5 passwords
            },
            "two_factor_enabled": False,  # 2FA (future feature)
            "login_attempt_limit": 5,  # Max failed login attempts
            "account_lockout_minutes": 30,  # Lockout duration
            "data_retention_days": 365,  # How long to keep user data
            "anonymization_enabled": True,  # Auto-anonymize old data
        }
    
    async def update_security_settings(
        self, 
        db: AsyncSession, 
        settings: Dict[str, Any]
    ) -> bool:
        """Update security settings."""
        try:
            valid_keys = {
                "session_timeout_minutes", "password_policy", 
                "two_factor_enabled", "login_attempt_limit",
                "account_lockout_minutes", "data_retention_days",
                "anonymization_enabled"
            }
            
            for key, value in settings.items():
                if key in valid_keys:
                    self._settings_cache[f"security_{key}"] = value
            
            logger.info(f"Updated security settings: {settings}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating security settings: {e}")
            return False
    
    async def validate_settings(self, category: str, settings: Dict[str, Any]) -> Dict[str, str]:
        """Validate settings before saving."""
        errors = {}
        
        if category == "theme":
            if "accent_color" in settings:
                color = settings["accent_color"]
                if not color.startswith("#") or len(color) != 7:
                    errors["accent_color"] = "Must be a valid hex color code"
        
        elif category == "collaboration":
            if "review_timeout_hours" in settings:
                timeout = settings["review_timeout_hours"]
                if not isinstance(timeout, int) or timeout < 1 or timeout > 168:  # 1 week max
                    errors["review_timeout_hours"] = "Must be between 1 and 168 hours"
        
        elif category == "notifications":
            if "webhook_url" in settings and settings["webhook_url"]:
                url = settings["webhook_url"]
                if not url.startswith(("http://", "https://")):
                    errors["webhook_url"] = "Must be a valid HTTP/HTTPS URL"
        
        elif category == "security":
            if "session_timeout_minutes" in settings:
                timeout = settings["session_timeout_minutes"]
                if not isinstance(timeout, int) or timeout < 15 or timeout > 10080:  # 1 week max
                    errors["session_timeout_minutes"] = "Must be between 15 minutes and 1 week"
        
        return errors
    
    async def export_settings(self, db: AsyncSession) -> Dict[str, Any]:
        """Export all settings for backup or migration."""
        return {
            "theme": await self.get_theme_preferences(db),
            "collaboration": await self.get_collaboration_settings(db),
            "notifications": await self.get_notification_settings(db),
            "security": await self.get_security_settings(db),
            "exported_at": "2025-09-25T00:00:00Z",
            "version": "1.0"
        }
    
    async def import_settings(
        self, 
        db: AsyncSession, 
        settings_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Import settings from backup."""
        results = {"success": [], "errors": []}
        
        try:
            if "theme" in settings_data:
                if await self.update_theme_preferences(db, settings_data["theme"]):
                    results["success"].append("theme")
                else:
                    results["errors"].append("theme")
            
            if "collaboration" in settings_data:
                if await self.update_collaboration_settings(db, settings_data["collaboration"]):
                    results["success"].append("collaboration")
                else:
                    results["errors"].append("collaboration")
            
            if "notifications" in settings_data:
                if await self.update_notification_settings(db, settings_data["notifications"]):
                    results["success"].append("notifications")
                else:
                    results["errors"].append("notifications")
            
            if "security" in settings_data:
                if await self.update_security_settings(db, settings_data["security"]):
                    results["success"].append("security")
                else:
                    results["errors"].append("security")
                    
        except Exception as e:
            logger.error(f"Error importing settings: {e}")
            results["errors"].append("import_failed")
        
        return results

# Global instance
settings_service = SystemSettingsService()