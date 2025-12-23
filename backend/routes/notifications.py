"""
Notifications API routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import logging

from utils.auth import get_current_active_user
from services.notification_service import notification_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.post("/email")
async def send_email(
    to: str,
    subject: str,
    body: str,
    priority: str = "normal",
    current_user: dict = Depends(get_current_active_user)
):
    """Send email notification"""
    try:
        success = await notification_service.send_email_notification(
            to, subject, body, priority
        )
        
        if success:
            return {'message': 'Email notification sent successfully'}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")
    except Exception as e:
        logger.error(f"Email notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/push")
async def send_push(
    title: str,
    message: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Send push notification to current user"""
    try:
        user_id = current_user.get('user_id')
        success = await notification_service.send_push_notification(
            user_id, title, message
        )
        
        if success:
            return {'message': 'Push notification sent successfully'}
        else:
            raise HTTPException(status_code=500, detail="Failed to send push notification")
    except Exception as e:
        logger.error(f"Push notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alert")
async def create_alert(
    alert_type: str,
    message: str,
    severity: str = "info",
    current_user: dict = Depends(get_current_active_user)
):
    """Create system alert"""
    try:
        # Check if user is admin for critical alerts
        if severity == "critical" and not current_user.get('is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required for critical alerts")
        
        success = await notification_service.send_system_alert(
            alert_type, message, severity
        )
        
        if success:
            return {'message': 'System alert created successfully'}
        else:
            raise HTTPException(status_code=500, detail="Failed to create alert")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"System alert error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def get_notifications(
    notification_type: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_active_user)
):
    """Get user notifications"""
    try:
        user_id = current_user.get('user_id')
        notifications = await notification_service.get_notifications(
            user_id=user_id,
            notification_type=notification_type,
            limit=limit
        )
        
        return {
            'notifications': notifications,
            'count': len(notifications)
        }
    except Exception as e:
        logger.error(f"Get notifications error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get notifications")

@router.get("/alerts")
async def get_alerts(
    severity: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get system alerts"""
    try:
        alerts = await notification_service.get_system_alerts(
            severity=severity,
            acknowledged=acknowledged
        )
        
        return {
            'alerts': alerts,
            'count': len(alerts)
        }
    except Exception as e:
        logger.error(f"Get alerts error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get alerts")

@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Acknowledge a system alert"""
    try:
        success = await notification_service.acknowledge_alert(alert_id)
        
        if success:
            return {'message': 'Alert acknowledged successfully'}
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Acknowledge alert error: {e}")
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")

@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Mark a notification as read"""
    try:
        user_id = current_user.get('user_id')
        success = await notification_service.mark_notification_read(notification_id, user_id)
        
        if success:
            return {'message': 'Notification marked as read'}
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mark notification read error: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a notification"""
    try:
        user_id = current_user.get('user_id')
        success = await notification_service.delete_notification(notification_id, user_id)
        
        if success:
            return {'message': 'Notification deleted successfully'}
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete notification error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete notification")
