"""
Notification service for email, push, and system alerts
"""
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
import json
import uuid

logger = logging.getLogger(__name__)

class NotificationService:
    """Manages all types of notifications"""
    
    def __init__(self):
        self.notification_log = Path("data/notifications.json")
        self.notification_log.parent.mkdir(parents=True, exist_ok=True)
        
    async def send_email_notification(
        self, 
        to: str, 
        subject: str, 
        body: str,
        priority: str = "normal"
    ) -> bool:
        """
        Send email notification
        
        Args:
            to: Email address
            subject: Email subject
            body: Email body
            priority: Priority level (low, normal, high, critical)
        
        Returns:
            True if successful
        """
        try:
            # Log the notification
            notification = {
                "id": str(uuid.uuid4()),
                "type": "email",
                "to": to,
                "subject": subject,
                "body": body,
                "priority": priority,
                "sent_at": datetime.now().isoformat(),
                "status": "sent"
            }
            
            # In production, integrate with email service (SendGrid, AWS SES, etc.)
            logger.info(f"Email notification sent: {subject} to {to}")
            
            # Log the notification
            await self._log_notification(notification)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
            return False
    
    async def send_push_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Send push notification (browser notification)
        
        Args:
            user_id: User ID
            title: Notification title
            message: Notification message
            data: Additional data
        
        Returns:
            True if successful
        """
        try:
            notification = {
                "id": str(uuid.uuid4()),
                "type": "push",
                "user_id": user_id,
                "title": title,
                "message": message,
                "data": data or {},
                "sent_at": datetime.now().isoformat(),
                "status": "sent",
                "read": False
            }
            
            # In production, use Web Push API or Firebase Cloud Messaging
            logger.info(f"Push notification sent: {title} for user {user_id}")
            
            await self._log_notification(notification)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")
            return False
    
    async def send_system_alert(
        self,
        alert_type: str,
        message: str,
        severity: str = "info",
        details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Send system alert
        
        Args:
            alert_type: Type of alert (error, warning, info, success)
            message: Alert message
            severity: Severity level (low, medium, high, critical)
            details: Additional details
        
        Returns:
            True if successful
        """
        try:
            alert = {
                "id": str(uuid.uuid4()),
                "type": "system_alert",
                "alert_type": alert_type,
                "message": message,
                "severity": severity,
                "details": details or {},
                "created_at": datetime.now().isoformat(),
                "acknowledged": False
            }
            
            logger.info(f"System alert created: [{severity}] {message}")
            
            await self._log_notification(alert)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to create system alert: {e}")
            return False
    
    async def _log_notification(self, notification: Dict[str, Any]):
        """Log notification to file"""
        try:
            # Load existing notifications
            notifications = []
            if self.notification_log.exists():
                with open(self.notification_log, 'r') as f:
                    notifications = json.load(f)
            
            # Add new notification
            notifications.append(notification)
            
            # Keep only last 1000 notifications
            if len(notifications) > 1000:
                notifications = notifications[-1000:]
            
            # Save to file
            with open(self.notification_log, 'w') as f:
                json.dump(notifications, f, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to log notification: {e}")
    
    async def get_notifications(
        self,
        user_id: Optional[str] = None,
        notification_type: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get notifications with optional filtering"""
        try:
            if not self.notification_log.exists():
                return []
            
            with open(self.notification_log, 'r') as f:
                notifications = json.load(f)
            
            # Filter by user_id if provided
            if user_id:
                notifications = [
                    n for n in notifications 
                    if n.get('user_id') == user_id or n.get('type') == 'system_alert'
                ]
            
            # Filter by type if provided
            if notification_type:
                notifications = [
                    n for n in notifications 
                    if n.get('type') == notification_type
                ]
            
            # Sort by timestamp (newest first)
            notifications.sort(
                key=lambda x: x.get('sent_at', x.get('created_at', '')), 
                reverse=True
            )
            
            return notifications[:limit]
            
        except Exception as e:
            logger.error(f"Failed to get notifications: {e}")
            return []
    
    async def get_system_alerts(
        self,
        severity: Optional[str] = None,
        acknowledged: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """Get system alerts with filtering"""
        try:
            alerts = await self.get_notifications(notification_type="system_alert")
            
            # Filter by severity
            if severity:
                alerts = [a for a in alerts if a.get('severity') == severity]
            
            # Filter by acknowledged status
            if acknowledged is not None:
                alerts = [a for a in alerts if a.get('acknowledged') == acknowledged]
            
            return alerts
            
        except Exception as e:
            logger.error(f"Failed to get system alerts: {e}")
            return []
    
    async def acknowledge_alert(self, alert_id: str) -> bool:
        """Mark an alert as acknowledged"""
        try:
            if not self.notification_log.exists():
                return False
            
            with open(self.notification_log, 'r') as f:
                notifications = json.load(f)
            
            # Find and update the alert
            found = False
            for notification in notifications:
                if notification.get('id') == alert_id:
                    notification['acknowledged'] = True
                    notification['acknowledged_at'] = datetime.now().isoformat()
                    found = True
                    break
            
            if not found:
                return False
            
            # Save updated notifications
            with open(self.notification_log, 'w') as f:
                json.dump(notifications, f, indent=2)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to acknowledge alert: {e}")
            return False
    
    async def mark_notification_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a notification as read"""
        try:
            if not self.notification_log.exists():
                return False
            
            with open(self.notification_log, 'r') as f:
                notifications = json.load(f)
            
            # Find and update the notification
            found = False
            for notification in notifications:
                if notification.get('id') == notification_id:
                    # Verify user has access to this notification
                    if notification.get('user_id') == user_id or notification.get('type') == 'system_alert':
                        notification['read'] = True
                        notification['read_at'] = datetime.now().isoformat()
                        found = True
                        break
            
            if not found:
                return False
            
            # Save updated notifications
            with open(self.notification_log, 'w') as f:
                json.dump(notifications, f, indent=2)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to mark notification as read: {e}")
            return False
    
    async def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """Delete a notification"""
        try:
            if not self.notification_log.exists():
                return False
            
            with open(self.notification_log, 'r') as f:
                notifications = json.load(f)
            
            # Find and remove the notification
            initial_count = len(notifications)
            notifications = [
                n for n in notifications 
                if not (n.get('id') == notification_id and 
                       (n.get('user_id') == user_id or n.get('type') == 'system_alert'))
            ]
            
            if len(notifications) == initial_count:
                return False
            
            # Save updated notifications
            with open(self.notification_log, 'w') as f:
                json.dump(notifications, f, indent=2)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete notification: {e}")
            return False

# Global notification service instance
notification_service = NotificationService()
