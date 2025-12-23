"""
Analytics API routes for real-time system metrics
"""
from fastapi import APIRouter, HTTPException
import logging
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# Import managers - these will be set by main.py
db_manager = None
websocket_manager = None

def set_managers(db_mgr, ws_mgr):
    """Set the manager instances"""
    global db_manager, websocket_manager
    db_manager = db_mgr
    websocket_manager = ws_mgr

@router.get("/usage")
async def get_usage_analytics():
    """Get comprehensive real-time system analytics"""
    try:
        # Get base analytics from database
        analytics = await db_manager.get_usage_analytics()
        
        # Add real-time system metrics
        current_time = datetime.now()
        
        # Get WebSocket connections stats
        ws_stats = websocket_manager.get_connection_stats()
        
        # Get citation stats
        citation_stats = await db_manager.get_citation_stats()
        
        # Get today's activity (last 24 hours)
        today_searches = await db_manager.get_searches_count_24h()
        today_suggestions = ws_stats['total_suggestions_sent']
        
        # Enhance analytics with real-time data
        enhanced_analytics = {
            **analytics,
            'current_timestamp': current_time.isoformat(),
            'today_activity': {
                'suggestions': today_suggestions,
                'searches': today_searches,
                'documents': analytics['total_documents'],
                'active_users': analytics['user_activity']['unique_users_24h']
            },
            'websocket_connections': {
                'active': ws_stats['active_connections'],
                'total_clients': ws_stats['total_clients'],
                'total_suggestions_sent': ws_stats['total_suggestions_sent'],
                'average_session_duration': ws_stats.get('average_session_duration', 0)
            },
            'citations': {
                'total_citations': citation_stats['total_citations'],
                'documents_with_citations': citation_stats['documents_with_citations'],
                'avg_citations_per_document': citation_stats['avg_citations_per_document'],
                'recent_citations': citation_stats['recent_citations']
            },
            'system_uptime_seconds': asyncio.get_event_loop().time(),
        }
        
        logger.info("Analytics data retrieved successfully")
        return enhanced_analytics
    
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        raise HTTPException(status_code=500, detail=f"Analytics retrieval failed: {str(e)}")

@router.get("/realtime")
async def get_realtime_stats():
    """Get real-time statistics (fast endpoint for frequent polling)"""
    try:
        ws_stats = websocket_manager.get_connection_stats()
        
        return {
            'timestamp': datetime.now().isoformat(),
            'active_connections': ws_stats['active_connections'],
            'total_suggestions_sent': ws_stats['total_suggestions_sent'],
            'uptime_seconds': asyncio.get_event_loop().time()
        }
    
    except Exception as e:
        logger.error(f"Realtime stats error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get realtime stats")
