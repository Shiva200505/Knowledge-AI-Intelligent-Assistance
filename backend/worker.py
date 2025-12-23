"""
Celery worker for background document processing
"""
from celery import Celery
import os
import asyncio
import logging
from typing import Dict, Any

from services.document_processor import DocumentProcessor
from services.search_engine import SearchEngine
from services.citation_tracker import CitationTracker
from database.database import DatabaseManager
from models.schemas import DocumentMetadata
from config.settings import settings

# Configure logging
logging.basicConfig(level=getattr(logging, settings.log_level.upper()))
logger = logging.getLogger(__name__)

# Create Celery instance
celery_app = Celery(
    'knowledge_worker',
    broker=settings.redis_url,
    backend=settings.redis_url
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

# Initialize services
db_manager = DatabaseManager(settings.database_url)
document_processor = DocumentProcessor(settings.documents_path)
search_engine = SearchEngine(settings.vector_db_path)
citation_tracker = CitationTracker()

@celery_app.task(bind=True, max_retries=3)
def process_document_task(self, document_id: str, file_path: str, metadata_dict: Dict[str, Any]):
    """
    Background task to process uploaded document
    """
    try:
        logger.info(f"Starting document processing for {document_id}")
        
        # Convert metadata dict back to DocumentMetadata object
        metadata = DocumentMetadata(**metadata_dict)
        
        # Run async processing in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Initialize services
            loop.run_until_complete(db_manager.initialize())
            loop.run_until_complete(search_engine.initialize())
            loop.run_until_complete(citation_tracker.initialize(db_manager))
            
            # Process document
            document_data = loop.run_until_complete(
                document_processor.process_document(file_path, metadata)
            )
            
            # Create vector embeddings
            loop.run_until_complete(search_engine.index_document(document_data))
            
            # Create citations
            loop.run_until_complete(citation_tracker.create_citations(document_data))
            
            # Update status to processed
            loop.run_until_complete(db_manager.update_document_status(document_id, "processed"))
            
            logger.info(f"Document {document_id} processed successfully")
            
            return {
                "status": "success",
                "document_id": document_id,
                "chunks_created": len(document_data['chunks']),
                "message": "Document processed successfully"
            }
            
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"Document processing failed for {document_id}: {exc}")
        
        # Update status to failed
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(db_manager.initialize())
            loop.run_until_complete(db_manager.update_document_status(document_id, "failed"))
            loop.close()
        except Exception as db_exc:
            logger.error(f"Failed to update document status: {db_exc}")
        
        # Retry the task
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying document processing for {document_id} (attempt {self.request.retries + 1})")
            raise self.retry(countdown=60 * (self.request.retries + 1), exc=exc)
        
        return {
            "status": "failed", 
            "document_id": document_id,
            "error": str(exc)
        }

@celery_app.task
def cleanup_old_documents():
    """
    Periodic task to clean up old documents based on retention policy
    """
    try:
        logger.info("Starting document cleanup task")
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Initialize database
            loop.run_until_complete(db_manager.initialize())
            
            # Get documents older than retention period
            # Implementation depends on your retention policy
            logger.info("Document cleanup completed")
            
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"Document cleanup failed: {exc}")

@celery_app.task
def reindex_documents():
    """
    Task to rebuild the vector index
    """
    try:
        logger.info("Starting document reindexing")
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Initialize services
            loop.run_until_complete(db_manager.initialize())
            loop.run_until_complete(search_engine.initialize())
            
            # Get all processed documents
            documents = loop.run_until_complete(
                db_manager.get_documents(status="processed")
            )
            
            logger.info(f"Reindexing {len(documents)} documents")
            
            # Reprocess each document
            for doc in documents:
                try:
                    # Reindex document
                    # Implementation depends on your reindexing strategy
                    pass
                except Exception as doc_exc:
                    logger.error(f"Failed to reindex document {doc.id}: {doc_exc}")
            
            logger.info("Document reindexing completed")
            
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"Document reindexing failed: {exc}")

# Periodic tasks
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    'cleanup-old-documents': {
        'task': 'worker.cleanup_old_documents',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
}

if __name__ == '__main__':
    celery_app.start()