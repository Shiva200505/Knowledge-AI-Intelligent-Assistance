"""
Test script to verify user data persistence across application reloads
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.user_db import UserDatabase
from database.enhanced_schema import EnhancedDatabaseManager
from database.database import DatabaseManager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_user_persistence():
    """Test user data persistence"""
    logger.info("=" * 60)
    logger.info("Testing User Data Persistence")
    logger.info("=" * 60)
    
    # Initialize databases
    user_db = UserDatabase("./backend/data/metadata.db")
    enhanced_db = EnhancedDatabaseManager("./backend/data/metadata.db")
    db_manager = DatabaseManager("sqlite:///./backend/data/metadata.db")
    
    # Test 1: Verify users exist
    logger.info("\n1. Checking existing users...")
    test_user = await user_db.get_user_by_email("shivam.sawant23@vit.edu")
    if test_user:
        logger.info(f"✓ User found: {test_user['email']}")
        logger.info(f"  - ID: {test_user['id']}")
        logger.info(f"  - Name: {test_user['full_name']}")
        logger.info(f"  - Created: {test_user['created_at']}")
        logger.info(f"  - Last Login: {test_user.get('last_login', 'Never')}")
        user_id = test_user['id']
    else:
        logger.error("✗ No user found in database!")
        return
    
    # Test 2: Save user preferences
    logger.info("\n2. Testing user preferences persistence...")
    preferences = {
        'theme': 'dark',
        'language': 'en',
        'notifications_enabled': True,
        'email_notifications': False,
        'default_category': 'Policies',
        'items_per_page': 20,
        'custom': {'sidebar_collapsed': True, 'show_tooltips': False}
    }
    await enhanced_db.save_user_preferences(user_id, preferences)
    logger.info("✓ User preferences saved")
    
    # Retrieve preferences
    retrieved_prefs = await enhanced_db.get_user_preferences(user_id)
    if retrieved_prefs:
        logger.info("✓ User preferences retrieved successfully:")
        logger.info(f"  - Theme: {retrieved_prefs['theme']}")
        logger.info(f"  - Items per page: {retrieved_prefs['items_per_page']}")
    else:
        logger.error("✗ Failed to retrieve user preferences!")
    
    # Test 3: Log search history
    logger.info("\n3. Testing search history persistence...")
    searches = [
        "flood insurance policy",
        "auto claim procedures",
        "property damage coverage"
    ]
    for query in searches:
        await enhanced_db.log_user_search(
            user_id=user_id,
            query_text=query,
            filters={'category': 'Policies'},
            results_count=5,
            response_time_ms=150
        )
    logger.info(f"✓ Logged {len(searches)} searches")
    
    # Retrieve search history
    history = await enhanced_db.get_user_search_history(user_id, limit=10)
    logger.info(f"✓ Retrieved {len(history)} search queries:")
    for i, search in enumerate(history[:3], 1):
        logger.info(f"  {i}. {search['query_text']} ({search['timestamp']})")
    
    # Test 4: Log document access
    logger.info("\n4. Testing document access logs...")
    # Check if any documents exist
    docs = await db_manager.get_documents(limit=5)
    if docs:
        doc_id = docs[0].id
        logger.info(f"Using document: {docs[0].filename}")
        
        await enhanced_db.log_document_access(
            user_id=user_id,
            document_id=doc_id,
            access_type="view",
            page_number=1,
            duration_seconds=45
        )
        await enhanced_db.log_document_access(
            user_id=user_id,
            document_id=doc_id,
            access_type="download",
            duration_seconds=5
        )
        logger.info("✓ Document access logged")
        
        # Retrieve access history
        access_history = await enhanced_db.get_user_document_access_history(user_id, limit=10)
        logger.info(f"✓ Retrieved {len(access_history)} access records:")
        for i, access in enumerate(access_history[:3], 1):
            logger.info(f"  {i}. {access['access_type']} - {access['filename']} ({access['timestamp']})")
    else:
        logger.warning("⚠ No documents in database to test access logs")
    
    # Test 5: Test favorites
    logger.info("\n5. Testing document favorites...")
    if docs:
        doc_id = docs[0].id
        success = await enhanced_db.add_favorite(
            user_id=user_id,
            document_id=doc_id,
            note="Important policy document"
        )
        if success:
            logger.info("✓ Favorite added successfully")
        
        favorites = await enhanced_db.get_user_favorites(user_id)
        logger.info(f"✓ Retrieved {len(favorites)} favorites:")
        for i, fav in enumerate(favorites, 1):
            logger.info(f"  {i}. {fav['filename']} - {fav['note']}")
    
    # Test 6: Get user analytics
    logger.info("\n6. Testing user analytics...")
    analytics = await enhanced_db.get_user_analytics(user_id)
    logger.info("✓ User analytics retrieved:")
    logger.info(f"  - Total searches: {analytics['total_searches']}")
    logger.info(f"  - Total document access: {analytics['total_document_access']}")
    logger.info(f"  - Documents uploaded: {analytics['documents_uploaded']}")
    logger.info(f"  - Favorites count: {analytics['favorites_count']}")
    
    # Test 7: Simulate application reload
    logger.info("\n7. Simulating application reload...")
    logger.info("Creating new database connections...")
    
    # Create fresh instances
    user_db_new = UserDatabase("./backend/data/metadata.db")
    enhanced_db_new = EnhancedDatabaseManager("./backend/data/metadata.db")
    
    # Verify data persists after "reload"
    test_user_after = await user_db_new.get_user_by_email("shivam.sawant23@vit.edu")
    prefs_after = await enhanced_db_new.get_user_preferences(user_id)
    history_after = await enhanced_db_new.get_user_search_history(user_id, limit=10)
    analytics_after = await enhanced_db_new.get_user_analytics(user_id)
    
    if test_user_after and prefs_after and len(history_after) > 0:
        logger.info("✓ All user data persisted after reload!")
        logger.info(f"  - User: {test_user_after['email']}")
        logger.info(f"  - Preferences: {prefs_after['theme']}, {prefs_after['items_per_page']} items/page")
        logger.info(f"  - Search history: {len(history_after)} records")
        logger.info(f"  - Analytics: {analytics_after['total_searches']} searches")
    else:
        logger.error("✗ Data did not persist after reload!")
        return
    
    logger.info("\n" + "=" * 60)
    logger.info("✓ All persistence tests PASSED!")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_user_persistence())
