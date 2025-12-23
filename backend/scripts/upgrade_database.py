"""
Database upgrade script to add user relationships and new tables
Run this to upgrade existing database schema
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.enhanced_schema import EnhancedDatabaseManager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    """Run database upgrade"""
    logger.info("Starting database upgrade...")
    
    # Initialize enhanced database manager
    enhanced_db = EnhancedDatabaseManager("./backend/data/metadata.db")
    
    try:
        # Run schema upgrade
        await enhanced_db.upgrade_schema()
        
        logger.info("✓ Database upgrade completed successfully!")
        logger.info("New tables created:")
        logger.info("  - user_preferences")
        logger.info("  - user_search_history")
        logger.info("  - user_document_access")
        logger.info("  - user_sessions")
        logger.info("  - user_favorites")
        logger.info("")
        logger.info("Enhanced existing tables with user_id:")
        logger.info("  - documents")
        logger.info("  - search_analytics")
        logger.info("  - usage_analytics")
        
    except Exception as e:
        logger.error(f"Database upgrade failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
