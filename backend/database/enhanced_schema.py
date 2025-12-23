"""
Enhanced database schema with complete user data storage
"""
import aiosqlite
import sqlite3
import asyncio
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class EnhancedDatabaseManager:
    """Enhanced database manager with comprehensive user data storage"""
    
    def __init__(self, db_path: str = "./backend/data/metadata.db"):
        self.db_path = db_path
        self.db_lock = asyncio.Lock()
    
    async def upgrade_schema(self):
        """Upgrade database schema to include user relationships"""
        db_path = Path(self.db_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("PRAGMA foreign_keys = ON")
                
                # Check if documents table has user_id column
                async with db.execute("PRAGMA table_info(documents)") as cursor:
                    columns = await cursor.fetchall()
                    column_names = [col[1] for col in columns]
                    
                    if 'user_id' not in column_names:
                        logger.info("Adding user_id to documents table")
                        await db.execute("""
                            ALTER TABLE documents ADD COLUMN user_id TEXT 
                            REFERENCES users(id) ON DELETE SET NULL
                        """)
                        await db.execute("""
                            CREATE INDEX IF NOT EXISTS idx_documents_user_id 
                            ON documents(user_id)
                        """)
                
                # Check if search_analytics has user_id
                async with db.execute("PRAGMA table_info(search_analytics)") as cursor:
                    columns = await cursor.fetchall()
                    column_names = [col[1] for col in columns]
                    
                    if 'user_id' not in column_names:
                        logger.info("Adding user_id to search_analytics table")
                        await db.execute("""
                            ALTER TABLE search_analytics ADD COLUMN user_id TEXT
                            REFERENCES users(id) ON DELETE SET NULL
                        """)
                        await db.execute("""
                            CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id 
                            ON search_analytics(user_id)
                        """)
                
                # Check if usage_analytics has user_id
                async with db.execute("PRAGMA table_info(usage_analytics)") as cursor:
                    columns = await cursor.fetchall()
                    column_names = [col[1] for col in columns]
                    
                    if 'user_id' not in column_names:
                        logger.info("Adding user_id to usage_analytics table")
                        await db.execute("""
                            ALTER TABLE usage_analytics ADD COLUMN user_id TEXT
                            REFERENCES users(id) ON DELETE SET NULL
                        """)
                        await db.execute("""
                            CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_id 
                            ON usage_analytics(user_id)
                        """)
                
                # Create user preferences table
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS user_preferences (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        theme TEXT DEFAULT 'light',
                        language TEXT DEFAULT 'en',
                        notifications_enabled BOOLEAN DEFAULT 1,
                        email_notifications BOOLEAN DEFAULT 1,
                        default_category TEXT,
                        items_per_page INTEGER DEFAULT 10,
                        preferences_json TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        UNIQUE(user_id)
                    )
                """)
                
                # Create user search history table
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS user_search_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        query_text TEXT NOT NULL,
                        filters TEXT,
                        results_count INTEGER DEFAULT 0,
                        response_time_ms INTEGER,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """)
                
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_search_history_user_id 
                    ON user_search_history(user_id)
                """)
                
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_search_history_timestamp 
                    ON user_search_history(timestamp)
                """)
                
                # Create user document access logs
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS user_document_access (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        document_id TEXT NOT NULL,
                        access_type TEXT NOT NULL,
                        page_number INTEGER,
                        duration_seconds INTEGER,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
                    )
                """)
                
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_document_access_user_id 
                    ON user_document_access(user_id)
                """)
                
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_document_access_document_id 
                    ON user_document_access(document_id)
                """)
                
                # Create user sessions table for active session tracking
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        session_token TEXT UNIQUE NOT NULL,
                        ip_address TEXT,
                        user_agent TEXT,
                        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        ended_at TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """)
                
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
                    ON user_sessions(user_id)
                """)
                
                # Create user favorites/bookmarks
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS user_favorites (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        document_id TEXT NOT NULL,
                        note TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                        UNIQUE(user_id, document_id)
                    )
                """)
                
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id 
                    ON user_favorites(user_id)
                """)
                
                await db.commit()
                logger.info("Database schema upgraded successfully with user relationships")
    
    async def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user preferences"""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT * FROM user_preferences WHERE user_id = ?",
                (user_id,)
            ) as cursor:
                row = await cursor.fetchone()
                
                if not row:
                    return None
                
                return {
                    'id': row[0],
                    'user_id': row[1],
                    'theme': row[2],
                    'language': row[3],
                    'notifications_enabled': bool(row[4]),
                    'email_notifications': bool(row[5]),
                    'default_category': row[6],
                    'items_per_page': row[7],
                    'preferences_json': json.loads(row[8]) if row[8] else {},
                    'created_at': row[9],
                    'updated_at': row[10]
                }
    
    async def save_user_preferences(self, user_id: str, preferences: Dict[str, Any]):
        """Save or update user preferences"""
        import uuid
        
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                pref_id = str(uuid.uuid4())
                
                await db.execute("""
                    INSERT OR REPLACE INTO user_preferences 
                    (id, user_id, theme, language, notifications_enabled, 
                     email_notifications, default_category, items_per_page, 
                     preferences_json, updated_at)
                    VALUES (
                        COALESCE((SELECT id FROM user_preferences WHERE user_id = ?), ?),
                        ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
                    )
                """, (
                    user_id, pref_id,
                    user_id,
                    preferences.get('theme', 'light'),
                    preferences.get('language', 'en'),
                    preferences.get('notifications_enabled', True),
                    preferences.get('email_notifications', True),
                    preferences.get('default_category'),
                    preferences.get('items_per_page', 10),
                    json.dumps(preferences.get('custom', {}))
                ))
                
                await db.commit()
    
    async def log_user_search(
        self,
        user_id: str,
        query_text: str,
        filters: Optional[Dict[str, Any]] = None,
        results_count: int = 0,
        response_time_ms: int = 0
    ):
        """Log user search to history"""
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    INSERT INTO user_search_history 
                    (user_id, query_text, filters, results_count, response_time_ms)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    user_id,
                    query_text,
                    json.dumps(filters) if filters else None,
                    results_count,
                    response_time_ms
                ))
                
                await db.commit()
    
    async def get_user_search_history(
        self,
        user_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get user's search history"""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, query_text, filters, results_count, 
                       response_time_ms, timestamp
                FROM user_search_history
                WHERE user_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, (user_id, limit)) as cursor:
                rows = await cursor.fetchall()
                
                return [
                    {
                        'id': row[0],
                        'query_text': row[1],
                        'filters': json.loads(row[2]) if row[2] else {},
                        'results_count': row[3],
                        'response_time_ms': row[4],
                        'timestamp': row[5]
                    }
                    for row in rows
                ]
    
    async def log_document_access(
        self,
        user_id: str,
        document_id: str,
        access_type: str = "view",
        page_number: Optional[int] = None,
        duration_seconds: Optional[int] = None
    ):
        """Log user document access"""
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    INSERT INTO user_document_access 
                    (user_id, document_id, access_type, page_number, duration_seconds)
                    VALUES (?, ?, ?, ?, ?)
                """, (user_id, document_id, access_type, page_number, duration_seconds))
                
                await db.commit()
    
    async def get_user_document_access_history(
        self,
        user_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get user's document access history"""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT uda.id, uda.document_id, d.filename, d.category,
                       uda.access_type, uda.page_number, uda.duration_seconds,
                       uda.timestamp
                FROM user_document_access uda
                LEFT JOIN documents d ON uda.document_id = d.id
                WHERE uda.user_id = ?
                ORDER BY uda.timestamp DESC
                LIMIT ?
            """, (user_id, limit)) as cursor:
                rows = await cursor.fetchall()
                
                return [
                    {
                        'id': row[0],
                        'document_id': row[1],
                        'filename': row[2],
                        'category': row[3],
                        'access_type': row[4],
                        'page_number': row[5],
                        'duration_seconds': row[6],
                        'timestamp': row[7]
                    }
                    for row in rows
                ]
    
    async def add_favorite(self, user_id: str, document_id: str, note: Optional[str] = None):
        """Add document to user favorites"""
        import uuid
        
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                try:
                    await db.execute("""
                        INSERT INTO user_favorites (id, user_id, document_id, note)
                        VALUES (?, ?, ?, ?)
                    """, (str(uuid.uuid4()), user_id, document_id, note))
                    
                    await db.commit()
                    return True
                except Exception as e:
                    logger.error(f"Error adding favorite: {e}")
                    return False
    
    async def remove_favorite(self, user_id: str, document_id: str):
        """Remove document from user favorites"""
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    DELETE FROM user_favorites 
                    WHERE user_id = ? AND document_id = ?
                """, (user_id, document_id))
                
                await db.commit()
    
    async def get_user_favorites(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's favorite documents"""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT uf.id, uf.document_id, d.filename, d.category,
                       d.file_path, uf.note, uf.created_at
                FROM user_favorites uf
                LEFT JOIN documents d ON uf.document_id = d.id
                WHERE uf.user_id = ?
                ORDER BY uf.created_at DESC
            """, (user_id,)) as cursor:
                rows = await cursor.fetchall()
                
                return [
                    {
                        'id': row[0],
                        'document_id': row[1],
                        'filename': row[2],
                        'category': row[3],
                        'file_path': row[4],
                        'note': row[5],
                        'created_at': row[6]
                    }
                    for row in rows
                ]
    
    async def get_user_analytics(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive analytics for a specific user"""
        async with aiosqlite.connect(self.db_path) as db:
            # Total searches
            async with db.execute(
                "SELECT COUNT(*) FROM user_search_history WHERE user_id = ?",
                (user_id,)
            ) as cursor:
                total_searches = (await cursor.fetchone())[0]
            
            # Total document accesses
            async with db.execute(
                "SELECT COUNT(*) FROM user_document_access WHERE user_id = ?",
                (user_id,)
            ) as cursor:
                total_access = (await cursor.fetchone())[0]
            
            # Documents uploaded by user
            async with db.execute(
                "SELECT COUNT(*) FROM documents WHERE user_id = ?",
                (user_id,)
            ) as cursor:
                documents_uploaded = (await cursor.fetchone())[0]
            
            # Favorite documents count
            async with db.execute(
                "SELECT COUNT(*) FROM user_favorites WHERE user_id = ?",
                (user_id,)
            ) as cursor:
                favorites_count = (await cursor.fetchone())[0]
            
            # Recent search queries (last 10)
            async with db.execute("""
                SELECT query_text, timestamp 
                FROM user_search_history 
                WHERE user_id = ? 
                ORDER BY timestamp DESC 
                LIMIT 10
            """, (user_id,)) as cursor:
                recent_searches = [
                    {'query': row[0], 'timestamp': row[1]}
                    for row in await cursor.fetchall()
                ]
            
            # Most accessed documents
            async with db.execute("""
                SELECT d.id, d.filename, COUNT(*) as access_count
                FROM user_document_access uda
                LEFT JOIN documents d ON uda.document_id = d.id
                WHERE uda.user_id = ?
                GROUP BY uda.document_id
                ORDER BY access_count DESC
                LIMIT 5
            """, (user_id,)) as cursor:
                most_accessed = [
                    {
                        'document_id': row[0],
                        'filename': row[1],
                        'access_count': row[2]
                    }
                    for row in await cursor.fetchall()
                ]
            
            return {
                'total_searches': total_searches,
                'total_document_access': total_access,
                'documents_uploaded': documents_uploaded,
                'favorites_count': favorites_count,
                'recent_searches': recent_searches,
                'most_accessed_documents': most_accessed
            }
