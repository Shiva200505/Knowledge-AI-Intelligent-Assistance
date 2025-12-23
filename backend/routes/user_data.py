"""
User data management routes
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, Dict, Any, List
import logging

from utils.auth import get_current_active_user
from database.enhanced_schema import EnhancedDatabaseManager
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["user-data"])

# Initialize enhanced database manager
enhanced_db = EnhancedDatabaseManager()


class UserPreferences(BaseModel):
    """User preferences model"""
    theme: Optional[str] = Field(default="light", description="UI theme")
    language: Optional[str] = Field(default="en", description="Preferred language")
    notifications_enabled: Optional[bool] = Field(default=True, description="Enable notifications")
    email_notifications: Optional[bool] = Field(default=True, description="Enable email notifications")
    default_category: Optional[str] = Field(None, description="Default document category")
    items_per_page: Optional[int] = Field(default=10, description="Items per page")
    custom: Optional[Dict[str, Any]] = Field(default={}, description="Custom preferences")


class DocumentAccessLog(BaseModel):
    """Document access log model"""
    document_id: str = Field(..., description="Document ID")
    access_type: str = Field(default="view", description="Access type (view, download, etc.)")
    page_number: Optional[int] = Field(None, description="Page number accessed")
    duration_seconds: Optional[int] = Field(None, description="Time spent on document")


class FavoriteRequest(BaseModel):
    """Add favorite request"""
    document_id: str = Field(..., description="Document ID")
    note: Optional[str] = Field(None, description="User note")


@router.get("/preferences")
async def get_preferences(current_user: dict = Depends(get_current_active_user)):
    """Get user preferences"""
    try:
        preferences = await enhanced_db.get_user_preferences(current_user['user_id'])
        
        if not preferences:
            # Return default preferences if none exist
            return {
                'theme': 'light',
                'language': 'en',
                'notifications_enabled': True,
                'email_notifications': True,
                'items_per_page': 10,
                'preferences_json': {}
            }
        
        return preferences
        
    except Exception as e:
        logger.error(f"Error getting preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get preferences"
        )


@router.post("/preferences")
async def save_preferences(
    preferences: UserPreferences,
    current_user: dict = Depends(get_current_active_user)
):
    """Save user preferences"""
    try:
        await enhanced_db.save_user_preferences(
            current_user['user_id'],
            preferences.dict()
        )
        
        logger.info(f"Preferences saved for user: {current_user['email']}")
        
        return {"message": "Preferences saved successfully"}
        
    except Exception as e:
        logger.error(f"Error saving preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save preferences"
        )


@router.get("/search-history")
async def get_search_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_active_user)
):
    """Get user's search history"""
    try:
        history = await enhanced_db.get_user_search_history(
            current_user['user_id'],
            limit=limit
        )
        
        return {"history": history, "count": len(history)}
        
    except Exception as e:
        logger.error(f"Error getting search history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get search history"
        )


@router.post("/document-access")
async def log_document_access(
    access_log: DocumentAccessLog,
    current_user: dict = Depends(get_current_active_user)
):
    """Log document access"""
    try:
        await enhanced_db.log_document_access(
            user_id=current_user['user_id'],
            document_id=access_log.document_id,
            access_type=access_log.access_type,
            page_number=access_log.page_number,
            duration_seconds=access_log.duration_seconds
        )
        
        return {"message": "Access logged successfully"}
        
    except Exception as e:
        logger.error(f"Error logging document access: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to log document access"
        )


@router.get("/document-history")
async def get_document_access_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_active_user)
):
    """Get user's document access history"""
    try:
        history = await enhanced_db.get_user_document_access_history(
            current_user['user_id'],
            limit=limit
        )
        
        return {"history": history, "count": len(history)}
        
    except Exception as e:
        logger.error(f"Error getting document history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get document history"
        )


@router.post("/favorites")
async def add_favorite(
    favorite: FavoriteRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """Add document to favorites"""
    try:
        success = await enhanced_db.add_favorite(
            current_user['user_id'],
            favorite.document_id,
            favorite.note
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document already in favorites or doesn't exist"
            )
        
        logger.info(f"Favorite added by user: {current_user['email']}")
        
        return {"message": "Added to favorites successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding favorite: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add favorite"
        )


@router.delete("/favorites/{document_id}")
async def remove_favorite(
    document_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Remove document from favorites"""
    try:
        await enhanced_db.remove_favorite(
            current_user['user_id'],
            document_id
        )
        
        logger.info(f"Favorite removed by user: {current_user['email']}")
        
        return {"message": "Removed from favorites successfully"}
        
    except Exception as e:
        logger.error(f"Error removing favorite: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove favorite"
        )


@router.get("/favorites")
async def get_favorites(current_user: dict = Depends(get_current_active_user)):
    """Get user's favorite documents"""
    try:
        favorites = await enhanced_db.get_user_favorites(current_user['user_id'])
        
        return {"favorites": favorites, "count": len(favorites)}
        
    except Exception as e:
        logger.error(f"Error getting favorites: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get favorites"
        )


@router.get("/analytics")
async def get_user_analytics(current_user: dict = Depends(get_current_active_user)):
    """Get user's analytics"""
    try:
        analytics = await enhanced_db.get_user_analytics(current_user['user_id'])
        
        return analytics
        
    except Exception as e:
        logger.error(f"Error getting user analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user analytics"
        )
