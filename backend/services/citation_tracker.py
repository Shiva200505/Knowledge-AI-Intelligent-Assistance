"""
Citation and provenance tracking service for maintaining document references
"""
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import hashlib

from models.schemas import Citation, DocumentChunk, DocumentMetadata
from database.database import DatabaseManager
from config.settings import settings

logger = logging.getLogger(__name__)

class CitationTracker:
    """Service for creating and managing document citations"""
    
    def __init__(self):
        self.db_manager = None
        
    async def initialize(self, db_manager: DatabaseManager):
        """Initialize with database manager"""
        self.db_manager = db_manager
        await self._create_citation_tables()
        
    async def _create_citation_tables(self):
        """Create citation-specific database tables"""
        citation_table_sql = """
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
        );
        
        CREATE INDEX IF NOT EXISTS idx_citations_document_id ON citations (document_id);
        CREATE INDEX IF NOT EXISTS idx_citations_page ON citations (document_id, page_number);
        CREATE INDEX IF NOT EXISTS idx_citations_hash ON citations (content_hash);
        """
        
        await self.db_manager.execute_sql(citation_table_sql)
        logger.info("Citation tables created/verified")
        
    async def create_citations(self, document_data: Dict[str, Any]) -> List[Citation]:
        """Create citations for all chunks in a document"""
        try:
            citations = []
            document_id = document_data['id']
            metadata = document_data['metadata']
            chunks = document_data['chunks']
            
            document_title = metadata.get('filename', 'Unknown Document')
            
            for chunk in chunks:
                citation = await self._create_chunk_citation(
                    chunk, 
                    document_id, 
                    document_title
                )
                
                if citation:
                    citations.append(citation)
                    
            # Store citations in database
            await self._store_citations(citations)
            
            logger.info(f"Created {len(citations)} citations for document {document_id}")
            return citations
            
        except Exception as e:
            logger.error(f"Citation creation failed for document {document_id}: {e}")
            raise
            
    async def _create_chunk_citation(
        self, 
        chunk: DocumentChunk, 
        document_id: str,
        document_title: str
    ) -> Optional[Citation]:
        """Create citation for a single chunk"""
        try:
            # Generate content hash for integrity
            content_hash = hashlib.md5(chunk.content.encode()).hexdigest()
            
            # Create direct URL to chunk
            direct_url = f"/documents/{document_id}/page/{chunk.page_number}"
            if chunk.paragraph_number:
                direct_url += f"/paragraph/{chunk.paragraph_number}"
                
            citation = Citation(
                document_id=document_id,
                document_title=document_title,
                page_number=chunk.page_number,
                paragraph_number=chunk.paragraph_number,
                section_title=chunk.section_title,
                url=direct_url,
                last_updated=datetime.now()
            )
            
            # Store citation metadata for database
            citation._content_hash = content_hash
            citation._chunk_id = chunk.id
            
            return citation
            
        except Exception as e:
            logger.error(f"Failed to create citation for chunk {chunk.id}: {e}")
            return None
            
    async def _store_citations(self, citations: List[Citation]):
        """Store citations in database"""
        try:
            for citation in citations:
                citation_data = {
                    'id': getattr(citation, '_chunk_id'),
                    'document_id': citation.document_id,
                    'document_title': citation.document_title,
                    'page_number': citation.page_number,
                    'paragraph_number': citation.paragraph_number,
                    'section_title': citation.section_title or '',
                    'content_hash': getattr(citation, '_content_hash'),
                    'direct_url': citation.url,
                    'created_at': citation.last_updated.isoformat(),
                    'updated_at': citation.last_updated.isoformat()
                }
                
                await self.db_manager.upsert_citation(citation_data)
                
        except Exception as e:
            logger.error(f"Failed to store citations: {e}")
            raise
            
    async def get_citations(
        self, 
        document_id: str,
        page_number: Optional[int] = None,
        paragraph_number: Optional[int] = None
    ) -> List[Citation]:
        """Retrieve citations for document/page/paragraph"""
        try:
            filters = {'document_id': document_id}
            
            if page_number is not None:
                filters['page_number'] = page_number
                
            if paragraph_number is not None:
                filters['paragraph_number'] = paragraph_number
                
            citation_records = await self.db_manager.get_citations(filters)
            
            citations = []
            for record in citation_records:
                citation = Citation(
                    document_id=record['document_id'],
                    document_title=record['document_title'],
                    page_number=record['page_number'],
                    paragraph_number=record.get('paragraph_number'),
                    section_title=record.get('section_title'),
                    url=record.get('direct_url'),
                    last_updated=datetime.fromisoformat(record['updated_at'])
                )
                citations.append(citation)
                
            return citations
            
        except Exception as e:
            logger.error(f"Failed to retrieve citations for {document_id}: {e}")
            return []
            
    async def get_citation_by_content_hash(self, content_hash: str) -> Optional[Citation]:
        """Find citation by content hash"""
        try:
            records = await self.db_manager.get_citations({'content_hash': content_hash})
            
            if records:
                record = records[0]
                return Citation(
                    document_id=record['document_id'],
                    document_title=record['document_title'],
                    page_number=record['page_number'],
                    paragraph_number=record.get('paragraph_number'),
                    section_title=record.get('section_title'),
                    url=record.get('direct_url'),
                    last_updated=datetime.fromisoformat(record['updated_at'])
                )
                
            return None
            
        except Exception as e:
            logger.error(f"Failed to find citation by hash {content_hash}: {e}")
            return None
            
    async def update_citation_urls(self, document_id: str, new_base_url: str):
        """Update citation URLs when document location changes"""
        try:
            citations = await self.get_citations(document_id)
            
            for citation in citations:
                # Update URL
                old_url = citation.url
                citation.url = old_url.replace(f"/documents/{document_id}", new_base_url)
                
                # Update in database
                await self.db_manager.update_citation_url(
                    document_id, 
                    citation.page_number,
                    citation.paragraph_number,
                    citation.url
                )
                
            logger.info(f"Updated {len(citations)} citation URLs for document {document_id}")
            
        except Exception as e:
            logger.error(f"Failed to update citation URLs for {document_id}: {e}")
            raise
            
    async def verify_citation_integrity(self, document_id: str) -> Dict[str, Any]:
        """Verify that citations point to existing content"""
        try:
            citations = await self.get_citations(document_id)
            integrity_report = {
                'total_citations': len(citations),
                'valid_citations': 0,
                'invalid_citations': 0,
                'missing_content': [],
                'hash_mismatches': []
            }
            
            for citation in citations:
                # Check if referenced content still exists
                is_valid = await self._verify_citation_content(citation)
                
                if is_valid:
                    integrity_report['valid_citations'] += 1
                else:
                    integrity_report['invalid_citations'] += 1
                    integrity_report['missing_content'].append({
                        'page': citation.page_number,
                        'paragraph': citation.paragraph_number,
                        'url': citation.url
                    })
                    
            logger.info(f"Citation integrity check for {document_id}: {integrity_report['valid_citations']}/{integrity_report['total_citations']} valid")
            return integrity_report
            
        except Exception as e:
            logger.error(f"Citation integrity check failed for {document_id}: {e}")
            return {'error': str(e)}
            
    async def _verify_citation_content(self, citation: Citation) -> bool:
        """Verify that a citation points to existing content"""
        try:
            # Check if the document still exists
            document_exists = await self.db_manager.document_exists(citation.document_id)
            if not document_exists:
                return False
                
            # Additional verification could be added here
            # such as checking file existence, content hash verification, etc.
            
            return True
            
        except Exception as e:
            logger.error(f"Citation verification failed: {e}")
            return False
            
    async def remove_citations(self, document_id: str):
        """Remove all citations for a document"""
        try:
            # Check if db_manager is initialized
            if self.db_manager is None:
                logger.warning(f"Database manager not initialized, skipping citation removal for {document_id}")
                return 0
            
            deleted_count = await self.db_manager.delete_citations(document_id)
            logger.info(f"Removed {deleted_count} citations for document {document_id}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Failed to remove citations for {document_id}: {e}")
            # Don't raise, just log - allow deletion to continue
            return 0
            
    async def get_citation_stats(self) -> Dict[str, Any]:
        """Get statistics about citations in the system"""
        try:
            stats = await self.db_manager.get_citation_stats()
            
            return {
                'total_citations': stats.get('total_citations', 0),
                'documents_with_citations': stats.get('documents_with_citations', 0),
                'avg_citations_per_document': stats.get('avg_citations_per_document', 0),
                'citations_by_document_type': stats.get('by_document_type', {}),
                'recent_citations': stats.get('recent_citations', 0)
            }
            
        except Exception as e:
            logger.error(f"Failed to get citation stats: {e}")
            return {}
            
    async def find_related_citations(
        self, 
        citation: Citation, 
        limit: int = 5
    ) -> List[Citation]:
        """Find citations related to the given citation"""
        try:
            related_citations = []
            
            # Find citations from same document
            same_doc_citations = await self.get_citations(citation.document_id)
            
            # Find nearby pages
            nearby_citations = [
                c for c in same_doc_citations 
                if abs(c.page_number - citation.page_number) <= 2
                and c.page_number != citation.page_number
            ]
            
            related_citations.extend(nearby_citations[:limit//2])
            
            # Find citations with similar section titles
            if citation.section_title:
                section_citations = await self.db_manager.find_citations_by_section(
                    citation.section_title,
                    exclude_document=citation.document_id
                )
                related_citations.extend(section_citations[:limit//2])
                
            # Remove duplicates and limit results
            seen_citations = set()
            unique_citations = []
            
            for rel_citation in related_citations:
                citation_key = f"{rel_citation.document_id}_{rel_citation.page_number}_{rel_citation.paragraph_number}"
                if citation_key not in seen_citations:
                    seen_citations.add(citation_key)
                    unique_citations.append(rel_citation)
                    
            return unique_citations[:limit]
            
        except Exception as e:
            logger.error(f"Failed to find related citations: {e}")
            return []
            
    async def generate_citation_report(self, document_id: str) -> Dict[str, Any]:
        """Generate comprehensive citation report for a document"""
        try:
            citations = await self.get_citations(document_id)
            integrity_check = await self.verify_citation_integrity(document_id)
            
            # Analyze citation patterns
            page_distribution = {}
            section_distribution = {}
            
            for citation in citations:
                # Page distribution
                page_num = citation.page_number
                page_distribution[page_num] = page_distribution.get(page_num, 0) + 1
                
                # Section distribution
                if citation.section_title:
                    section = citation.section_title
                    section_distribution[section] = section_distribution.get(section, 0) + 1
                    
            report = {
                'document_id': document_id,
                'total_citations': len(citations),
                'page_distribution': page_distribution,
                'section_distribution': section_distribution,
                'integrity_check': integrity_check,
                'coverage': {
                    'pages_with_citations': len(page_distribution),
                    'sections_with_citations': len(section_distribution),
                    'avg_citations_per_page': len(citations) / max(len(page_distribution), 1)
                },
                'generated_at': datetime.now().isoformat()
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate citation report for {document_id}: {e}")
            return {'error': str(e)}