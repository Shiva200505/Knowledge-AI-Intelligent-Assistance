"""
Main FastAPI application for Intelligent Knowledge Retrieval System
"""
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks, WebSocket
from fastapi.websockets import WebSocketDisconnect
import socketio
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import asyncio
import json
import uuid
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
from pathlib import Path

from services.context_engine import ContextEngine
from services.search_engine import SearchEngine
from services.citation_tracker import CitationTracker
from services.document_processor import DocumentProcessor
from services.websocket_manager import WebSocketManager
from database.database import DatabaseManager
from models.schemas import (
    CaseContext, 
    SearchQuery, 
    SuggestionResponse, 
    DocumentUpload, 
    DocumentMetadata
)
from config.settings import Settings
from routes.auth import router as auth_router
from routes.user_data import router as user_data_router
from routes.system_status import router as system_status_router
from routes import analytics as analytics_routes
from database.enhanced_schema import EnhancedDatabaseManager

# Initialize settings
settings = Settings()

# Initialize logging
logging.basicConfig(level=getattr(logging, settings.log_level.upper()))
logger = logging.getLogger(__name__)

# Global managers
websocket_manager = WebSocketManager()

# Create Socket.IO instance
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio)
db_manager = DatabaseManager(settings.database_url)
enhanced_db_manager = EnhancedDatabaseManager(settings.database_url.replace('sqlite:///', ''))
document_processor = DocumentProcessor(settings.documents_path)
search_engine = SearchEngine(settings.vector_db_path)
context_engine = ContextEngine()
citation_tracker = CitationTracker()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup application resources"""
    logger.info("Starting Intelligent Knowledge Retrieval System")
    
    # Initialize database
    await db_manager.initialize()
    
    # Upgrade database schema with user relationships
    try:
        await enhanced_db_manager.upgrade_schema()
        logger.info("Database schema upgraded successfully")
    except Exception as e:
        logger.warning(f"Database schema upgrade warning: {e}")
    
    # Initialize vector database
    await search_engine.initialize()
    
    # Initialize document processor
    await document_processor.initialize()
    
    # Load existing processed documents into vector store
    try:
        logger.info("Loading existing documents into search engine...")
        documents = await db_manager.get_documents(status='processed', limit=1000)
        logger.info(f"Found {len(documents)} processed documents to index")
        
        for doc in documents:
            try:
                # Find document file
                from pathlib import Path
                file_path = Path(doc.file_path)
                if not file_path.exists():
                    file_path = Path("data") / doc.file_path
                if not file_path.exists():
                    logger.warning(f"Document file not found: {doc.filename}")
                    continue
                
                # Process and index
                document_data = await document_processor.process_document(str(file_path), doc)
                await search_engine.index_document(document_data)
                logger.info(f"Indexed {doc.filename} ({len(document_data['chunks'])} chunks)")
                
            except Exception as e:
                logger.error(f"Failed to index {doc.filename}: {e}")
        
        # Log indexing stats
        if hasattr(search_engine, '_mock_documents'):
            logger.info(f"Total chunks indexed: {len(search_engine._mock_documents)}")
        
    except Exception as e:
        logger.error(f"Failed to load existing documents: {e}")
    
    logger.info("System initialization complete")
    yield
    
    # Cleanup
    logger.info("Shutting down system")
    await db_manager.close()

# Create FastAPI app
app = FastAPI(
    title="Intelligent Knowledge Retrieval API",
    description="Context-aware document suggestions for Appian case management",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include authentication routes
app.include_router(auth_router)

# Include user data routes
app.include_router(user_data_router)

# Include system status routes
app.include_router(system_status_router)

# Include settings routes
from routes.settings import router as settings_router
app.include_router(settings_router)

# Include backup routes
from routes.backup import router as backup_router
app.include_router(backup_router)

# Include notifications routes
from routes.notifications import router as notifications_router
app.include_router(notifications_router)

# Set up analytics routes with managers
analytics_routes.set_managers(db_manager, websocket_manager)
app.include_router(analytics_routes.router)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "active", "message": "Intelligent Knowledge Retrieval System"}

@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        db_status = await db_manager.health_check()
        vector_status = await search_engine.health_check()
        
        return {
            "status": "healthy",
            "components": {
                "database": "healthy" if db_status else "unhealthy",
                "vector_store": "healthy" if vector_status else "unhealthy",
                "document_processor": "healthy"
            },
            "timestamp": asyncio.get_event_loop().time()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time suggestions"""
    await websocket_manager.connect(websocket, client_id)
    
    try:
        while True:
            # Receive case context from client
            data = await websocket.receive_text()
            case_data = json.loads(data)
            
            # Process context and generate suggestions
            case_context = CaseContext(**case_data)
            suggestions = await get_context_suggestions(case_context)
            
            # Send suggestions back to client
            response = {
                "type": "suggestions",
                "data": [s.dict() for s in suggestions],
                "timestamp": asyncio.get_event_loop().time()
            }
            
            await websocket_manager.send_personal_message(
                json.dumps(response), 
                client_id
            )
            
    except WebSocketDisconnect:
        websocket_manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {e}")
        websocket_manager.disconnect(client_id)

@app.post("/api/search")
async def search_documents(query: SearchQuery, user_id: Optional[str] = None) -> List[SuggestionResponse]:
    """Search documents based on query"""
    try:
        start_time = asyncio.get_event_loop().time()
        
        results = await search_engine.search(
            query.text,
            filters=query.filters,
            limit=query.limit
        )
        
        suggestions = []
        for result in results:
            # Get citations for each result
            citations = await citation_tracker.get_citations(
                result.document_id,
                result.page_number,
                result.paragraph_number
            )
            
            # Ensure context_match has document_title
            context_match = result.context_match or {}
            if 'document_title' not in context_match or context_match['document_title'] == 'Unknown Document':
                # Try to get from result.title
                context_match['document_title'] = result.title if result.title != 'Unknown Document' else result.title
            
            suggestion = SuggestionResponse(
                id=str(uuid.uuid4()),
                title=result.title,  # This is the document filename from search engine
                content=result.content,
                relevance_score=result.score,
                source_document=result.document_path,
                page_number=result.page_number,
                paragraph_number=result.paragraph_number,
                citations=citations,
                context_match=context_match
            )
            suggestions.append(suggestion)
        
        # Log search analytics with user_id if provided
        end_time = asyncio.get_event_loop().time()
        response_time_ms = int((end_time - start_time) * 1000)
        
        await db_manager.log_search_analytics(
            query_text=query.text,
            user_id=user_id,
            results_count=len(results),
            response_time_ms=response_time_ms,
            filters=query.filters
        )
        
        # Also log to user search history if user_id provided
        if user_id:
            try:
                await enhanced_db_manager.log_user_search(
                    user_id=user_id,
                    query_text=query.text,
                    filters=query.filters,
                    results_count=len(results),
                    response_time_ms=response_time_ms
                )
            except Exception as e:
                logger.warning(f"Failed to log user search history: {e}")
        
        return suggestions
    
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Search failed")

@app.post("/api/context-suggestions")
async def get_context_suggestions(context: CaseContext) -> List[SuggestionResponse]:
    """Get context-aware suggestions based on case data"""
    try:
        # Extract context features
        context_features = await context_engine.extract_features(context)
        
        # Generate search queries from context
        queries = await context_engine.generate_queries(context_features)
        
        # Search for relevant documents
        all_suggestions = []
        for query in queries:
            search_query = SearchQuery(text=query, limit=5)
            suggestions = await search_documents(search_query)
            all_suggestions.extend(suggestions)
        
        # Rank and deduplicate suggestions
        ranked_suggestions = await context_engine.rank_suggestions(
            all_suggestions, 
            context_features
        )
        
        return ranked_suggestions[:10]  # Return top 10 suggestions
    
    except Exception as e:
        logger.error(f"Context suggestion error: {e}")
        raise HTTPException(status_code=500, detail="Context suggestion failed")

@app.post("/api/documents/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    category: str = Form(...),
    tags: Optional[str] = Form(None),
    metadata: Optional[str] = Form(None),
    user_id: Optional[str] = None
):
    """Upload and process a new document"""
    try:
        # Validate file type
        allowed_types = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail="Unsupported file type"
            )
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = file.filename.split('.')[-1]
        unique_filename = f"{file_id}.{file_extension}"
        
        # Save file
        file_path = await document_processor.save_file(file, unique_filename)
        
        # Parse metadata
        doc_metadata = {}
        if metadata:
            doc_metadata = json.loads(metadata)
        
        # Parse tags
        tag_list = []
        if tags:
            tag_list = [tag.strip() for tag in tags.split(',')]
        
        # Create document metadata with initial temporary path
        document_meta = DocumentMetadata(
            id=file_id,
            filename=file.filename,
            file_path=file_path,  # This will be updated after processing
            content_type=file.content_type,
            category=category,
            tags=tag_list,
            metadata=doc_metadata,
            status="processing"
        )
        
        # Save metadata to database with user_id
        await db_manager.save_document_metadata(document_meta, user_id=user_id)
        
        # Log upload event
        if user_id:
            try:
                await db_manager.log_usage_event(
                    event_type="document_upload",
                    user_id=user_id,
                    document_id=file_id,
                    event_data={"filename": file.filename, "category": category}
                )
            except Exception as e:
                logger.warning(f"Failed to log upload event: {e}")
        
        # Process document in background (async - non-blocking)
        background_tasks.add_task(
            process_document_background,
            file_id,
            file_path,
            document_meta,
            user_id
        )
        
        return {
            "message": "Document uploaded successfully and processing in background",
            "document_id": file_id,
            "filename": file.filename,
            "status": "processing"
        }
    
    except Exception as e:
        logger.error(f"Document upload error: {e}")
        raise HTTPException(status_code=500, detail="Document upload failed")

async def process_document_background(
    document_id: str, 
    file_path: str, 
    metadata: DocumentMetadata,
    user_id: Optional[str] = None
):
    """Background task to process uploaded document - runs asynchronously"""
    import time
    start_time = time.time()
    
    try:
        logger.info(f"Starting background processing for document {document_id}")
        
        # Notify processing started
        try:
            await websocket_manager.broadcast_message(json.dumps({
                "type": "document_processing",
                "document_id": document_id,
                "filename": metadata.filename,
                "status": "processing",
                "stage": "extracting_text"
            }))
        except Exception:
            pass
        
        # Extract text and structure
        logger.info(f"Extracting text from {metadata.filename}...")
        document_data = await document_processor.process_document(
            file_path, 
            metadata
        )
        
        extraction_time = time.time() - start_time
        logger.info(f"Text extraction completed in {extraction_time:.2f}s")
        
        # Update metadata with final file path if it was moved
        if 'final_path' in document_data:
            metadata.file_path = document_data['final_path']
            # Save updated metadata with correct file path
            await db_manager.save_document_metadata(metadata, user_id=user_id)
            logger.info(f"Updated file path for {document_id}: {metadata.file_path}")
        
        # Add document_id and filename to document_data for indexing
        document_data['document_id'] = document_id
        document_data['filename'] = metadata.filename
        
        # Ensure metadata has ALL necessary fields for proper display
        if 'metadata' not in document_data:
            document_data['metadata'] = {}
        
        document_data['metadata']['filename'] = metadata.filename
        document_data['metadata']['document_filename'] = metadata.filename  # For search engine compatibility
        document_data['metadata']['category'] = metadata.category
        document_data['metadata']['tags'] = metadata.tags
        document_data['metadata']['document_title'] = metadata.filename  # For suggestion cards
        
        # Notify embedding generation started
        try:
            await websocket_manager.broadcast_message(json.dumps({
                "type": "document_processing",
                "document_id": document_id,
                "filename": metadata.filename,
                "status": "processing",
                "stage": "generating_embeddings",
                "chunks": len(document_data.get('chunks', []))
            }))
        except Exception:
            pass
        
        # Create vector embeddings
        logger.info(f"Generating embeddings for {len(document_data.get('chunks', []))} chunks...")
        embedding_start = time.time()
        await search_engine.index_document(document_data)
        embedding_time = time.time() - embedding_start
        logger.info(f"Embedding generation completed in {embedding_time:.2f}s")
        
        # Create citation references (best effort - not critical)
        try:
            await citation_tracker.create_citations(document_data)
            logger.info(f"Citations created for document {document_id}")
        except Exception as e:
            logger.warning(f"Citation creation skipped for {document_id}: {e}")
        
        # Update document status and processing details
        await db_manager.update_document_status(document_id, "processed")
        
        total_time = time.time() - start_time
        logger.info(f"Total processing time for {metadata.filename}: {total_time:.2f}s")
        
        # Update metadata with processing results
        if 'metadata' in document_data:
            extracted_meta = document_data['metadata']
            metadata.page_count = extracted_meta.get('page_count')
            metadata.word_count = extracted_meta.get('word_count')
            metadata.processed_date = datetime.now()
            await db_manager.save_document_metadata(metadata, user_id=user_id)
        
        logger.info(f"Document {document_id} processed successfully")
        
        # Notify via WebSocket if available
        try:
            await websocket_manager.broadcast_message(json.dumps({
                "type": "document_processed",
                "document_id": document_id,
                "filename": metadata.filename,
                "status": "processed"
            }))
        except Exception as e:
            logger.warning(f"Failed to broadcast document processing completion: {e}")
        
        return metadata
        
    except Exception as e:
        logger.error(f"Document processing failed for {document_id}: {e}")
        await db_manager.update_document_status(document_id, "failed")
        
        # Notify failure via WebSocket
        try:
            await websocket_manager.broadcast_message(json.dumps({
                "type": "document_failed",
                "document_id": document_id,
                "filename": metadata.filename,
                "status": "failed"
            }))
        except Exception as e:
            logger.warning(f"Failed to broadcast document processing failure: {e}")
        
        return None

@app.get("/api/documents")
async def get_documents(
    category: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> List[DocumentMetadata]:
    """Get list of documents with optional filtering"""
    try:
        documents = await db_manager.get_documents(
            category=category,
            status=status,
            limit=limit,
            offset=offset
        )
        return documents
    
    except Exception as e:
        logger.error(f"Get documents error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve documents")

@app.get("/api/documents/{document_id}/download")
async def download_document(document_id: str):
    """Download a document file"""
    try:
        from fastapi.responses import FileResponse
        
        # Get document metadata to find file path
        documents = await db_manager.get_documents(limit=1000)
        document = next((d for d in documents if d.id == document_id), None)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        file_path = Path(document.file_path)
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Document file not found")
        
        return FileResponse(
            path=str(file_path),
            filename=document.filename,
            media_type='application/octet-stream'
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document download error: {e}")
        raise HTTPException(status_code=500, detail=f"Document download failed: {str(e)}")

@app.get("/api/documents/{document_id}/view")
async def view_document(document_id: str):
    """Get document metadata and content preview"""
    try:
        # Get document metadata
        documents = await db_manager.get_documents(limit=1000)
        document = next((d for d in documents if d.id == document_id), None)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Read file content for preview (first 5000 characters)
        file_path = Path(document.file_path)
        preview = ""
        
        if file_path.exists():
            try:
                # Detect content type from file extension if not available
                content_type = getattr(document, 'content_type', None)
                if not content_type:
                    ext = file_path.suffix.lower()
                    if ext == '.txt':
                        content_type = 'text/plain'
                    elif ext == '.pdf':
                        content_type = 'application/pdf'
                    elif ext == '.docx':
                        content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                
                if content_type == 'text/plain':
                    with open(file_path, 'r', encoding='utf-8') as f:
                        preview = f.read(5000)
                elif content_type == 'application/pdf':
                    # For PDFs, just return metadata
                    preview = "PDF preview not available. Please download to view."
                else:
                    preview = "Preview not available for this file type."
            except Exception as e:
                logger.warning(f"Failed to generate preview: {e}")
                preview = "Preview could not be generated."
        else:
            preview = "File not found on disk."
        
        return {
            "id": document.id,
            "filename": document.filename,
            "category": document.category,
            "tags": document.tags,
            "status": document.status,
            "upload_date": document.upload_date.isoformat() if hasattr(document.upload_date, 'isoformat') else str(document.upload_date),
            "file_size": document.file_size or 0,
            "page_count": document.page_count,
            "word_count": document.word_count,
            "content_preview": preview,
            "file_path": str(file_path)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document view error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Document view failed: {str(e)}")

@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document and its associated data"""
    try:
        logger.info(f"Starting deletion process for document {document_id}")
        
        # Remove from vector store (best effort)
        try:
            await search_engine.remove_document(document_id)
            logger.info(f"Removed document {document_id} from vector store")
        except Exception as e:
            logger.warning(f"Failed to remove from vector store: {e}")
        
        # Remove citations (best effort)
        try:
            await citation_tracker.remove_citations(document_id)
            logger.info(f"Removed citations for document {document_id}")
        except Exception as e:
            logger.warning(f"Failed to remove citations: {e}")
        
        # Remove file (best effort)
        try:
            await document_processor.delete_document(document_id)
            logger.info(f"Removed files for document {document_id}")
        except Exception as e:
            logger.warning(f"Failed to remove files: {e}")
        
        # Remove metadata from database (critical - this must succeed)
        await db_manager.delete_document(document_id)
        logger.info(f"Removed metadata for document {document_id}")
        
        return {"message": "Document deleted successfully", "document_id": document_id}
    
    except Exception as e:
        logger.error(f"Document deletion error: {e}")
        raise HTTPException(status_code=500, detail=f"Document deletion failed: {str(e)}")

@app.post("/api/documents/reindex")
async def reindex_all_documents():
    """Reindex all processed documents into search engine"""
    try:
        logger.info("Manual reindex triggered")
        documents = await db_manager.get_documents(status='processed', limit=1000)
        indexed_count = 0
        
        for doc in documents:
            try:
                # Find document file
                file_path = Path(doc.file_path)
                if not file_path.exists():
                    file_path = Path("data") / doc.file_path
                if not file_path.exists():
                    continue
                
                # Process and index
                document_data = await document_processor.process_document(str(file_path), doc)
                await search_engine.index_document(document_data)
                indexed_count += 1
                
            except Exception as e:
                logger.error(f"Failed to index {doc.filename}: {e}")
        
        total_chunks = len(search_engine._mock_documents) if hasattr(search_engine, '_mock_documents') else 0
        
        return {
            "message": "Reindexing complete",
            "documents_indexed": indexed_count,
            "total_chunks": total_chunks
        }
        
    except Exception as e:
        logger.error(f"Reindex failed: {e}")
        raise HTTPException(status_code=500, detail="Reindex failed")

@app.get("/api/analytics/usage")
async def get_usage_analytics():
    """Get system usage analytics"""
    try:
        analytics = await db_manager.get_usage_analytics()
        
        # Add real-time system metrics
        current_time = datetime.now()
        
        # Get WebSocket connections
        ws_stats = websocket_manager.get_connection_stats()
        
        # Get citation stats
        citation_stats = await db_manager.get_citation_stats()
        
        # Enhance analytics with real-time data
        enhanced_analytics = {
            **analytics,
            'current_timestamp': current_time.isoformat(),
            'websocket_connections': {
                'active': ws_stats['active_connections'],
                'total_clients': ws_stats['total_clients'],
                'total_suggestions_sent': ws_stats['total_suggestions_sent']
            },
            'citations': citation_stats,
            'system_uptime': asyncio.get_event_loop().time(),
        }
        
        return enhanced_analytics
    
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        raise HTTPException(status_code=500, detail="Analytics retrieval failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level=settings.log_level.lower()
    )