"""
Database manager for SQLite operations
"""
import aiosqlite
import asyncio
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import json

from models.schemas import DocumentMetadata, DocumentStatus
from config.settings import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    """SQLite database manager for metadata and analytics"""
    
    def __init__(self, db_url: str):
        self.db_path = db_url.replace('sqlite:///', '')
        self.db_lock = asyncio.Lock()
        
    async def initialize(self):
        """Initialize database schema"""
        # Ensure database directory exists
        db_path = Path(self.db_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                # Enable foreign keys
                await db.execute("PRAGMA foreign_keys = ON")
                
                # Create documents table
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS documents (
                        id TEXT PRIMARY KEY,
                        filename TEXT NOT NULL,
                        file_path TEXT NOT NULL,
                        content_type TEXT NOT NULL,
                        file_size INTEGER,
                        category TEXT NOT NULL,
                        tags TEXT,  -- JSON array
                        metadata TEXT,  -- JSON object
                        status TEXT DEFAULT 'pending',
                        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        processed_date TIMESTAMP,
                        page_count INTEGER,
                        word_count INTEGER,
                        language TEXT DEFAULT 'en'
                    )
                """)
                
                # Create search analytics table
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS search_analytics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        query_text TEXT NOT NULL,
                        client_id TEXT,
                        results_count INTEGER DEFAULT 0,
                        response_time_ms INTEGER,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        context_data TEXT,  -- JSON object
                        filters TEXT  -- JSON object
                    )
                """)
                
                # Create usage analytics table
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS usage_analytics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        event_type TEXT NOT NULL,
                        client_id TEXT,
                        document_id TEXT,
                        event_data TEXT,  -- JSON object
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create citations table
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS citations (
                        id TEXT PRIMARY KEY,
                        document_id TEXT NOT NULL,
                        document_title TEXT NOT NULL,
                        page_number INTEGER NOT NULL,
                        paragraph_number INTEGER,
                        section_title TEXT,
                        content_hash TEXT NOT NULL,
                        direct_url TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
                    )
                """)
                
                # Create indexes
                await db.execute("CREATE INDEX IF NOT EXISTS idx_documents_category ON documents (category)")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_documents_status ON documents (status)")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents (upload_date)")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics (timestamp)")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_usage_analytics_timestamp ON usage_analytics (timestamp)")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_citations_document_id ON citations (document_id)")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_citations_page ON citations (document_id, page_number)")
                
                await db.commit()
                
        logger.info(f"Database initialized: {self.db_path}")
        
    async def health_check(self) -> bool:
        """Check database connectivity"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False
            
    async def save_document_metadata(self, metadata: DocumentMetadata, user_id: Optional[str] = None):
        """Save document metadata to database"""
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                # Check if user_id column exists
                async with db.execute("PRAGMA table_info(documents)") as cursor:
                    columns = await cursor.fetchall()
                    column_names = [col[1] for col in columns]
                    has_user_id = 'user_id' in column_names
                
                if has_user_id:
                    await db.execute("""
                        INSERT OR REPLACE INTO documents 
                        (id, filename, file_path, content_type, file_size, category, tags, metadata, 
                         status, upload_date, processed_date, page_count, word_count, language, user_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        metadata.id,
                        metadata.filename,
                        metadata.file_path,
                        metadata.content_type,
                        metadata.file_size,
                        metadata.category,
                        json.dumps(metadata.tags),
                        json.dumps(metadata.metadata),
                        metadata.status.value,
                        metadata.upload_date.isoformat(),
                        metadata.processed_date.isoformat() if metadata.processed_date else None,
                        metadata.page_count,
                        metadata.word_count,
                        metadata.language,
                        user_id
                    ))
                else:
                    await db.execute("""
                        INSERT OR REPLACE INTO documents 
                        (id, filename, file_path, content_type, file_size, category, tags, metadata, 
                         status, upload_date, processed_date, page_count, word_count, language)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        metadata.id,
                        metadata.filename,
                        metadata.file_path,
                        metadata.content_type,
                        metadata.file_size,
                        metadata.category,
                        json.dumps(metadata.tags),
                        json.dumps(metadata.metadata),
                        metadata.status.value,
                        metadata.upload_date.isoformat(),
                        metadata.processed_date.isoformat() if metadata.processed_date else None,
                        metadata.page_count,
                        metadata.word_count,
                        metadata.language
                    ))
                await db.commit()
                
    async def update_document_status(self, document_id: str, status: str):
        """Update document processing status"""
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                processed_date = datetime.now().isoformat() if status == 'processed' else None
                await db.execute("""
                    UPDATE documents 
                    SET status = ?, processed_date = ?
                    WHERE id = ?
                """, (status, processed_date, document_id))
                await db.commit()
                
    async def get_documents(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[DocumentMetadata]:
        """Retrieve documents with optional filtering"""
        query = "SELECT * FROM documents WHERE 1=1"
        params = []
        
        if category:
            query += " AND category = ?"
            params.append(category)
            
        if status:
            query += " AND status = ?"
            params.append(status)
            
        query += " ORDER BY upload_date DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                
        documents = []
        for row in rows:
            doc = DocumentMetadata(
                id=row[0],
                filename=row[1],
                file_path=row[2],
                content_type=row[3],
                file_size=row[4],
                category=row[5],
                tags=json.loads(row[6]) if row[6] else [],
                metadata=json.loads(row[7]) if row[7] else {},
                status=DocumentStatus(row[8]),
                upload_date=datetime.fromisoformat(row[9]),
                processed_date=datetime.fromisoformat(row[10]) if row[10] else None,
                page_count=row[11],
                word_count=row[12],
                language=row[13]
            )
            documents.append(doc)
            
        return documents
        
    async def delete_document(self, document_id: str):
        """Delete document metadata"""
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("DELETE FROM documents WHERE id = ?", (document_id,))
                await db.commit()
                
    async def document_exists(self, document_id: str) -> bool:
        """Check if document exists"""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT COUNT(*) FROM documents WHERE id = ?", 
                (document_id,)
            ) as cursor:
                row = await cursor.fetchone()
                return row[0] > 0
                
    async def log_search_analytics(
        self,
        query_text: str,
        client_id: Optional[str] = None,
        user_id: Optional[str] = None,
        results_count: int = 0,
        response_time_ms: int = 0,
        context_data: Optional[Dict[str, Any]] = None,
        filters: Optional[Dict[str, Any]] = None
    ):
        """Log search analytics"""
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                # Check if user_id column exists
                async with db.execute("PRAGMA table_info(search_analytics)") as cursor:
                    columns = await cursor.fetchall()
                    column_names = [col[1] for col in columns]
                    has_user_id = 'user_id' in column_names
                
                if has_user_id:
                    await db.execute("""
                        INSERT INTO search_analytics 
                        (query_text, client_id, user_id, results_count, response_time_ms, context_data, filters)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        query_text,
                        client_id,
                        user_id,
                        results_count,
                        response_time_ms,
                        json.dumps(context_data) if context_data else None,
                        json.dumps(filters) if filters else None
                    ))
                else:
                    await db.execute("""
                        INSERT INTO search_analytics 
                        (query_text, client_id, results_count, response_time_ms, context_data, filters)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        query_text,
                        client_id,
                        results_count,
                        response_time_ms,
                        json.dumps(context_data) if context_data else None,
                        json.dumps(filters) if filters else None
                    ))
                await db.commit()
                
    async def log_usage_event(
        self,
        event_type: str,
        client_id: Optional[str] = None,
        user_id: Optional[str] = None,
        document_id: Optional[str] = None,
        event_data: Optional[Dict[str, Any]] = None
    ):
        """Log usage analytics event"""
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                # Check if user_id column exists
                async with db.execute("PRAGMA table_info(usage_analytics)") as cursor:
                    columns = await cursor.fetchall()
                    column_names = [col[1] for col in columns]
                    has_user_id = 'user_id' in column_names
                
                if has_user_id:
                    await db.execute("""
                        INSERT INTO usage_analytics 
                        (event_type, client_id, user_id, document_id, event_data)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        event_type,
                        client_id,
                        user_id,
                        document_id,
                        json.dumps(event_data) if event_data else None
                    ))
                else:
                    await db.execute("""
                        INSERT INTO usage_analytics 
                        (event_type, client_id, document_id, event_data)
                        VALUES (?, ?, ?, ?)
                    """, (
                        event_type,
                        client_id,
                        document_id,
                        json.dumps(event_data) if event_data else None
                    ))
                await db.commit()
                
    async def get_usage_analytics(self) -> Dict[str, Any]:
        """Get comprehensive usage analytics"""
        async with aiosqlite.connect(self.db_path) as db:
            # Total documents
            async with db.execute("SELECT COUNT(*) FROM documents") as cursor:
                total_documents = (await cursor.fetchone())[0]
                
            # Total searches
            async with db.execute("SELECT COUNT(*) FROM search_analytics") as cursor:
                total_searches = (await cursor.fetchone())[0]
                
            # Average response time
            async with db.execute(
                "SELECT AVG(response_time_ms) FROM search_analytics WHERE response_time_ms > 0"
            ) as cursor:
                avg_response = await cursor.fetchone()
                avg_response_time = avg_response[0] or 0
                
            # Top categories
            async with db.execute("""
                SELECT category, COUNT(*) as count 
                FROM documents 
                GROUP BY category 
                ORDER BY count DESC 
                LIMIT 10
            """) as cursor:
                top_categories = [
                    {'category': row[0], 'count': row[1]} 
                    for row in await cursor.fetchall()
                ]
                
            # Search trends (last 30 days)
            async with db.execute("""
                SELECT DATE(timestamp) as date, COUNT(*) as searches
                FROM search_analytics 
                WHERE timestamp > datetime('now', '-30 days')
                GROUP BY DATE(timestamp)
                ORDER BY date DESC
                LIMIT 30
            """) as cursor:
                search_trends = [
                    {'date': row[0], 'searches': row[1]}
                    for row in await cursor.fetchall()
                ]
                
            # User activity
            async with db.execute("""
                SELECT 
                    COUNT(DISTINCT client_id) as unique_users,
                    COUNT(*) as total_events
                FROM usage_analytics
                WHERE timestamp > datetime('now', '-24 hours')
            """) as cursor:
                activity = await cursor.fetchone()
                
            # System health indicators
            async with db.execute("""
                SELECT status, COUNT(*) as count
                FROM documents
                GROUP BY status
            """) as cursor:
                status_counts = {
                    row[0]: row[1] 
                    for row in await cursor.fetchall()
                }
                
        return {
            'total_documents': total_documents,
            'total_searches': total_searches,
            'average_response_time': avg_response_time,
            'top_categories': top_categories,
            'search_trends': search_trends,
            'user_activity': {
                'unique_users_24h': activity[0] if activity else 0,
                'total_events_24h': activity[1] if activity else 0
            },
            'system_health': {
                'document_status_distribution': status_counts,
                'processing_success_rate': (
                    status_counts.get('processed', 0) / max(total_documents, 1) * 100
                )
            }
        }
        
    async def upsert_citation(self, citation_data: Dict[str, Any]):
        """Insert or update citation"""
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    INSERT OR REPLACE INTO citations 
                    (id, document_id, document_title, page_number, paragraph_number, 
                     section_title, content_hash, direct_url, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    citation_data['id'],
                    citation_data['document_id'],
                    citation_data['document_title'],
                    citation_data['page_number'],
                    citation_data.get('paragraph_number'),
                    citation_data.get('section_title'),
                    citation_data['content_hash'],
                    citation_data.get('direct_url'),
                    citation_data['created_at'],
                    citation_data['updated_at']
                ))
                await db.commit()
                
    async def get_citations(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get citations with filters"""
        query = "SELECT * FROM citations WHERE 1=1"
        params = []
        
        for key, value in filters.items():
            if key in ['document_id', 'page_number', 'paragraph_number', 'content_hash']:
                query += f" AND {key} = ?"
                params.append(value)
                
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                
        columns = [
            'id', 'document_id', 'document_title', 'page_number', 
            'paragraph_number', 'section_title', 'content_hash', 
            'direct_url', 'created_at', 'updated_at'
        ]
        
        return [dict(zip(columns, row)) for row in rows]
        
    async def delete_citations(self, document_id: str) -> int:
        """Delete citations for document"""
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute(
                    "DELETE FROM citations WHERE document_id = ?", 
                    (document_id,)
                )
                deleted_count = cursor.rowcount
                await db.commit()
                return deleted_count
                
    async def get_searches_count_24h(self) -> int:
        """Get number of searches in last 24 hours"""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT COUNT(*) FROM search_analytics 
                WHERE timestamp > datetime('now', '-24 hours')
            """) as cursor:
                result = await cursor.fetchone()
                return result[0] if result else 0
    
    async def get_citation_stats(self) -> Dict[str, Any]:
        """Get citation statistics"""
        async with aiosqlite.connect(self.db_path) as db:
            # Total citations
            async with db.execute("SELECT COUNT(*) FROM citations") as cursor:
                total_citations = (await cursor.fetchone())[0]
                
            # Documents with citations
            async with db.execute(
                "SELECT COUNT(DISTINCT document_id) FROM citations"
            ) as cursor:
                documents_with_citations = (await cursor.fetchone())[0]
                
            # Average citations per document
            if documents_with_citations > 0:
                avg_citations = total_citations / documents_with_citations
            else:
                avg_citations = 0
                
            # Recent citations (last 24 hours)
            async with db.execute("""
                SELECT COUNT(*) FROM citations 
                WHERE created_at > datetime('now', '-24 hours')
            """) as cursor:
                recent_citations = (await cursor.fetchone())[0]
                
        return {
            'total_citations': total_citations,
            'documents_with_citations': documents_with_citations,
            'avg_citations_per_document': avg_citations,
            'recent_citations': recent_citations
        }
        
    async def execute_sql(self, sql: str, params: tuple = ()):
        """Execute raw SQL"""
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(sql, params)
                await db.commit()
                
    async def close(self):
        """Close database connections"""
        logger.info("Database connections closed")