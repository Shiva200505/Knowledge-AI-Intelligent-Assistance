"""
Backup API routes
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Optional
import logging

from utils.auth import get_current_active_user
from services.backup_manager import backup_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backup", tags=["backup"])

@router.post("/create")
async def create_backup(
    background_tasks: BackgroundTasks,
    backup_type: str = "full",
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new backup"""
    try:
        # Check if user is admin
        if not current_user.get('is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Create backup in background
        backup_info = await backup_manager.create_backup(backup_type)
        
        return {
            'message': 'Backup created successfully',
            'backup': backup_info
        }
    except Exception as e:
        logger.error(f"Backup creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Backup creation failed: {str(e)}")

@router.get("/list")
async def list_backups(current_user: dict = Depends(get_current_active_user)):
    """List all available backups"""
    try:
        backups = await backup_manager.list_backups()
        return {
            'backups': backups,
            'count': len(backups)
        }
    except Exception as e:
        logger.error(f"Error listing backups: {e}")
        raise HTTPException(status_code=500, detail="Failed to list backups")

@router.post("/restore/{backup_name}")
async def restore_backup(
    backup_name: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Restore from a backup"""
    try:
        # Check if user is admin
        if not current_user.get('is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        success = await backup_manager.restore_backup(backup_name)
        
        if success:
            return {
                'message': f'Backup {backup_name} restored successfully',
                'note': 'System restart recommended'
            }
        else:
            raise HTTPException(status_code=500, detail="Backup restore failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Backup restore error: {e}")
        raise HTTPException(status_code=500, detail=f"Backup restore failed: {str(e)}")

@router.delete("/{backup_name}")
async def delete_backup(
    backup_name: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a backup"""
    try:
        # Check if user is admin
        if not current_user.get('is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        success = await backup_manager.delete_backup(backup_name)
        
        if success:
            return {'message': f'Backup {backup_name} deleted successfully'}
        else:
            raise HTTPException(status_code=500, detail="Backup deletion failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Backup deletion error: {e}")
        raise HTTPException(status_code=500, detail=f"Backup deletion failed: {str(e)}")

@router.post("/cleanup")
async def cleanup_old_backups(
    keep_count: int = 10,
    current_user: dict = Depends(get_current_active_user)
):
    """Clean up old backups, keeping only the most recent ones"""
    try:
        # Check if user is admin
        if not current_user.get('is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        await backup_manager.cleanup_old_backups(keep_count)
        
        return {
            'message': f'Old backups cleaned up, keeping {keep_count} most recent'
        }
    except Exception as e:
        logger.error(f"Backup cleanup error: {e}")
        raise HTTPException(status_code=500, detail=f"Backup cleanup failed: {str(e)}")
