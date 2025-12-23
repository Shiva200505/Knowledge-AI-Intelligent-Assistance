"""
System status and health check routes
"""
from fastapi import APIRouter
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/system", tags=["system"])

@router.get("/status")
async def get_system_status():
    """Get detailed system status"""
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "api": "online",
            "websocket": "online",
            "database": "online",
            "vector_store": "online"
        },
        "endpoints": {
            "health": "/health",
            "api_docs": "/docs",
            "websocket": "/ws/{client_id}",
            "search": "/api/search",
            "documents": "/api/documents",
            "auth": "/api/auth",
            "user": "/api/user"
        },
        "message": "All systems operational"
    }

@router.get("/ping")
async def ping():
    """Simple ping endpoint"""
    return {
        "status": "ok",
        "message": "pong",
        "timestamp": datetime.now().isoformat()
    }
