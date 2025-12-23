"""
System settings API routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
import logging
import json
from pathlib import Path
from datetime import datetime

from utils.auth import get_current_active_user
from config.settings import settings as app_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])

# Settings storage file
SETTINGS_FILE = Path("data/user_settings.json")

def load_user_settings(user_id: str) -> Dict[str, Any]:
    """Load user-specific settings from file"""
    try:
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r') as f:
                all_settings = json.load(f)
                return all_settings.get(user_id, {})
        return {}
    except Exception as e:
        logger.error(f"Error loading user settings: {e}")
        return {}

def save_user_settings(user_id: str, settings: Dict[str, Any]):
    """Save user-specific settings to file"""
    try:
        # Ensure data directory exists
        SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
        
        # Load existing settings
        all_settings = {}
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r') as f:
                all_settings = json.load(f)
        
        # Update user settings
        all_settings[user_id] = {
            **settings,
            'updated_at': datetime.now().isoformat()
        }
        
        # Save to file
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(all_settings, f, indent=2)
            
        logger.info(f"Settings saved for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving user settings: {e}")
        return False

@router.get("")
async def get_settings(current_user: dict = Depends(get_current_active_user)):
    """Get current user settings"""
    try:
        user_id = current_user.get('user_id')
        
        # Load user-specific settings
        user_settings = load_user_settings(user_id)
        
        # Merge with system defaults
        default_settings = {
            # Search Settings
            'similarityThreshold': app_settings.similarity_threshold,
            'maxSuggestions': app_settings.max_suggestions,
            'searchTimeout': app_settings.search_timeout,
            
            # Performance Settings
            'cacheEnabled': app_settings.enable_caching,
            'maxConcurrentRequests': app_settings.max_concurrent_requests,
            'contextWindowSize': app_settings.context_window_size,
            
            # Security Settings
            'requireAuth': False,  # User-specific
            'sessionTimeout': app_settings.access_token_expire_minutes,
            'logLevel': app_settings.log_level,
            
            # Notification Settings
            'emailNotifications': app_settings.email_notifications,
            'pushNotifications': app_settings.push_notifications,
            'systemAlerts': app_settings.system_alerts,
            
            # Storage Settings
            'retentionPeriod': app_settings.data_retention_days,
            'autoBackup': app_settings.auto_backup,
            'backupFrequency': app_settings.backup_frequency,
            
            # AI Settings
            'embeddingModel': app_settings.embedding_model,
        }
        
        # Merge user settings with defaults
        final_settings = {**default_settings, **user_settings}
        
        return {
            'settings': final_settings,
            'user_id': user_id,
            'updated_at': user_settings.get('updated_at')
        }
        
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve settings")

@router.post("")
async def update_settings(
    settings: Dict[str, Any],
    current_user: dict = Depends(get_current_active_user)
):
    """Update user settings"""
    try:
        user_id = current_user.get('user_id')
        
        # Validate settings
        validated_settings = {}
        
        # Search Settings
        if 'similarityThreshold' in settings:
            threshold = float(settings['similarityThreshold'])
            if 0.1 <= threshold <= 1.0:
                validated_settings['similarityThreshold'] = threshold
        
        if 'maxSuggestions' in settings:
            max_sugg = int(settings['maxSuggestions'])
            if 1 <= max_sugg <= 50:
                validated_settings['maxSuggestions'] = max_sugg
        
        if 'searchTimeout' in settings:
            timeout = int(settings['searchTimeout'])
            if 1 <= timeout <= 300:
                validated_settings['searchTimeout'] = timeout
        
        # Performance Settings
        if 'cacheEnabled' in settings:
            validated_settings['cacheEnabled'] = bool(settings['cacheEnabled'])
        
        if 'maxConcurrentRequests' in settings:
            max_req = int(settings['maxConcurrentRequests'])
            if 1 <= max_req <= 1000:
                validated_settings['maxConcurrentRequests'] = max_req
        
        if 'contextWindowSize' in settings:
            window = int(settings['contextWindowSize'])
            if window in [256, 512, 1024]:
                validated_settings['contextWindowSize'] = window
        
        # Security Settings
        if 'requireAuth' in settings:
            validated_settings['requireAuth'] = bool(settings['requireAuth'])
        
        if 'sessionTimeout' in settings:
            session = int(settings['sessionTimeout'])
            if 5 <= session <= 1440:  # 5 min to 24 hours
                validated_settings['sessionTimeout'] = session
        
        if 'logLevel' in settings:
            if settings['logLevel'] in ['ERROR', 'WARN', 'INFO', 'DEBUG']:
                validated_settings['logLevel'] = settings['logLevel']
        
        # Notification Settings
        if 'emailNotifications' in settings:
            validated_settings['emailNotifications'] = bool(settings['emailNotifications'])
        
        if 'pushNotifications' in settings:
            validated_settings['pushNotifications'] = bool(settings['pushNotifications'])
        
        if 'systemAlerts' in settings:
            validated_settings['systemAlerts'] = bool(settings['systemAlerts'])
        
        # Storage Settings
        if 'retentionPeriod' in settings:
            retention = int(settings['retentionPeriod'])
            if retention >= 0:
                validated_settings['retentionPeriod'] = retention
        
        if 'autoBackup' in settings:
            validated_settings['autoBackup'] = bool(settings['autoBackup'])
        
        if 'backupFrequency' in settings:
            if settings['backupFrequency'] in ['hourly', 'daily', 'weekly', 'monthly']:
                validated_settings['backupFrequency'] = settings['backupFrequency']
        
        # AI Settings
        if 'embeddingModel' in settings:
            validated_settings['embeddingModel'] = settings['embeddingModel']
        
        # Save settings
        success = save_user_settings(user_id, validated_settings)
        
        if success:
            return {
                'message': 'Settings saved successfully',
                'settings': validated_settings
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save settings")
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid setting value: {str(e)}")
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to update settings")

@router.post("/reset")
async def reset_settings(current_user: dict = Depends(get_current_active_user)):
    """Reset user settings to defaults"""
    try:
        user_id = current_user.get('user_id')
        
        # Save empty settings (will use defaults)
        success = save_user_settings(user_id, {})
        
        if success:
            return {
                'message': 'Settings reset to defaults successfully'
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to reset settings")
            
    except Exception as e:
        logger.error(f"Error resetting settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset settings")

@router.get("/system")
async def get_system_settings():
    """Get system-level settings (no auth required)"""
    try:
        return {
            'similarityThreshold': app_settings.similarity_threshold,
            'maxSuggestions': app_settings.max_suggestions,
            'searchTimeout': app_settings.search_timeout,
            'embeddingModel': app_settings.embedding_model,
            'contextWindowSize': app_settings.context_window_size,
            'environment': app_settings.environment,
            'version': '1.0.0'
        }
    except Exception as e:
        logger.error(f"Error getting system settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve system settings")
