"""
WebSocket connection manager for real-time suggestions
"""
import asyncio
import json
import logging
from typing import Dict, List, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class WebSocketManager:
    """Manager for WebSocket connections and real-time messaging"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.client_contexts: Dict[str, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept WebSocket connection and store client"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.client_contexts[client_id] = {
            'connected_at': asyncio.get_event_loop().time(),
            'last_activity': asyncio.get_event_loop().time(),
            'suggestion_count': 0
        }
        logger.info(f"Client {client_id} connected. Active connections: {len(self.active_connections)}")
        
    def disconnect(self, client_id: str):
        """Remove client connection"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            
        if client_id in self.client_contexts:
            context = self.client_contexts[client_id]
            session_duration = asyncio.get_event_loop().time() - context['connected_at']
            logger.info(f"Client {client_id} disconnected. Session duration: {session_duration:.2f}s, "
                       f"Suggestions sent: {context['suggestion_count']}")
            del self.client_contexts[client_id]
            
    async def send_personal_message(self, message: str, client_id: str):
        """Send message to specific client"""
        if client_id in self.active_connections:
            try:
                websocket = self.active_connections[client_id]
                await websocket.send_text(message)
                
                # Update client context
                if client_id in self.client_contexts:
                    self.client_contexts[client_id]['last_activity'] = asyncio.get_event_loop().time()
                    self.client_contexts[client_id]['suggestion_count'] += 1
                    
            except Exception as e:
                logger.error(f"Failed to send message to client {client_id}: {e}")
                self.disconnect(client_id)
                
    async def broadcast(self, message: str):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            return
            
        disconnected_clients = []
        
        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(message)
                
                # Update client context
                if client_id in self.client_contexts:
                    self.client_contexts[client_id]['last_activity'] = asyncio.get_event_loop().time()
                    
            except Exception as e:
                logger.error(f"Failed to broadcast to client {client_id}: {e}")
                disconnected_clients.append(client_id)
                
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            self.disconnect(client_id)
            
    async def send_suggestions(self, client_id: str, suggestions: List[Dict[str, Any]]):
        """Send suggestions to specific client"""
        message = {
            "type": "suggestions",
            "data": suggestions,
            "timestamp": asyncio.get_event_loop().time(),
            "count": len(suggestions)
        }
        
        await self.send_personal_message(json.dumps(message), client_id)
        
    async def send_error(self, client_id: str, error: str, details: Dict[str, Any] = None):
        """Send error message to client"""
        message = {
            "type": "error",
            "error": error,
            "details": details or {},
            "timestamp": asyncio.get_event_loop().time()
        }
        
        await self.send_personal_message(json.dumps(message), client_id)
        
    async def send_status_update(self, client_id: str, status: str, data: Dict[str, Any] = None):
        """Send status update to client"""
        message = {
            "type": "status",
            "status": status,
            "data": data or {},
            "timestamp": asyncio.get_event_loop().time()
        }
        
        await self.send_personal_message(json.dumps(message), client_id)
        
    def get_connected_clients(self) -> List[str]:
        """Get list of connected client IDs"""
        return list(self.active_connections.keys())
        
    def get_client_info(self, client_id: str) -> Dict[str, Any]:
        """Get information about a specific client"""
        if client_id not in self.client_contexts:
            return {}
            
        context = self.client_contexts[client_id]
        current_time = asyncio.get_event_loop().time()
        
        return {
            'client_id': client_id,
            'connected': client_id in self.active_connections,
            'connected_at': context['connected_at'],
            'session_duration': current_time - context['connected_at'],
            'last_activity': context['last_activity'],
            'idle_time': current_time - context['last_activity'],
            'suggestion_count': context['suggestion_count']
        }
        
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get overall connection statistics"""
        current_time = asyncio.get_event_loop().time()
        
        if not self.client_contexts:
            return {
                'active_connections': 0,
                'total_suggestions_sent': 0,
                'average_session_duration': 0,
                'clients': []
            }
            
        total_suggestions = sum(ctx['suggestion_count'] for ctx in self.client_contexts.values())
        session_durations = [
            current_time - ctx['connected_at'] 
            for ctx in self.client_contexts.values()
        ]
        avg_session_duration = sum(session_durations) / len(session_durations)
        
        return {
            'active_connections': len(self.active_connections),
            'total_clients': len(self.client_contexts),
            'total_suggestions_sent': total_suggestions,
            'average_session_duration': avg_session_duration,
            'clients': [
                {
                    'client_id': client_id,
                    'connected': client_id in self.active_connections,
                    'suggestion_count': ctx['suggestion_count'],
                    'session_duration': current_time - ctx['connected_at']
                }
                for client_id, ctx in self.client_contexts.items()
            ]
        }
        
    async def cleanup_inactive_connections(self, timeout_seconds: int = 300):
        """Remove connections that have been inactive for too long"""
        current_time = asyncio.get_event_loop().time()
        inactive_clients = []
        
        for client_id, context in self.client_contexts.items():
            idle_time = current_time - context['last_activity']
            if idle_time > timeout_seconds:
                inactive_clients.append(client_id)
                
        for client_id in inactive_clients:
            logger.info(f"Removing inactive client {client_id}")
            if client_id in self.active_connections:
                try:
                    websocket = self.active_connections[client_id]
                    await websocket.close(code=1000, reason="Inactive connection")
                except Exception as e:
                    logger.error(f"Error closing inactive connection {client_id}: {e}")
                    
            self.disconnect(client_id)
            
        return len(inactive_clients)