"""
Pydantic models for request/response schemas
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class DocumentStatus(str, Enum):
    """Document processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"

class DocumentType(str, Enum):
    """Supported document types"""
    PDF = "pdf"
    WORD = "word"
    TEXT = "text"
    HTML = "html"

class CaseContext(BaseModel):
    """Case context information from Appian workflow"""
    case_id: str = Field(..., description="Unique case identifier")
    case_type: str = Field(..., description="Type of case (e.g., 'Flood Claim', 'Auto Insurance')")
    state: Optional[str] = Field(None, description="State or jurisdiction")
    status: Optional[str] = Field(None, description="Current case status")
    priority: Optional[str] = Field(None, description="Case priority level")
    customer_type: Optional[str] = Field(None, description="Customer classification")
    policy_type: Optional[str] = Field(None, description="Insurance policy type")
    claim_amount: Optional[float] = Field(None, description="Claim amount if applicable")
    date_created: Optional[datetime] = Field(None, description="Case creation date")
    tags: Optional[List[str]] = Field(default=[], description="Additional context tags")
    custom_fields: Optional[Dict[str, Any]] = Field(default={}, description="Custom case fields")

class SearchQuery(BaseModel):
    """Search query parameters"""
    text: str = Field(..., description="Search query text")
    filters: Optional[Dict[str, Any]] = Field(default={}, description="Search filters")
    limit: int = Field(default=10, ge=1, le=100, description="Maximum number of results")
    threshold: Optional[float] = Field(default=0.7, ge=0.0, le=1.0, description="Similarity threshold")

class Citation(BaseModel):
    """Document citation information"""
    document_id: str = Field(..., description="Source document identifier")
    document_title: str = Field(..., description="Document title")
    page_number: int = Field(..., description="Page number in document")
    paragraph_number: Optional[int] = Field(None, description="Paragraph number on page")
    section_title: Optional[str] = Field(None, description="Section or chapter title")
    url: Optional[str] = Field(None, description="Direct link to document")
    last_updated: Optional[datetime] = Field(None, description="Document last update date")

class SuggestionResponse(BaseModel):
    """AI-generated suggestion with citation"""
    id: str = Field(..., description="Unique suggestion identifier")
    title: str = Field(..., description="Suggestion title")
    content: str = Field(..., description="Suggested text content")
    relevance_score: float = Field(..., ge=0.0, le=1.0, description="Relevance score")
    source_document: str = Field(..., description="Source document path")
    page_number: int = Field(..., description="Page number")
    paragraph_number: Optional[int] = Field(None, description="Paragraph number")
    citations: List[Citation] = Field(default=[], description="Citation references")
    context_match: Dict[str, Any] = Field(default={}, description="Context matching details")
    tags: Optional[List[str]] = Field(default=[], description="Suggestion tags")
    timestamp: datetime = Field(default_factory=datetime.now, description="Suggestion timestamp")

class DocumentMetadata(BaseModel):
    """Document metadata information"""
    id: str = Field(..., description="Unique document identifier")
    filename: str = Field(..., description="Original filename")
    file_path: str = Field(..., description="Storage file path")
    content_type: str = Field(..., description="MIME content type")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    category: str = Field(..., description="Document category")
    tags: List[str] = Field(default=[], description="Document tags")
    metadata: Dict[str, Any] = Field(default={}, description="Additional metadata")
    status: DocumentStatus = Field(default=DocumentStatus.PENDING, description="Processing status")
    upload_date: datetime = Field(default_factory=datetime.now, description="Upload timestamp")
    processed_date: Optional[datetime] = Field(None, description="Processing completion date")
    page_count: Optional[int] = Field(None, description="Number of pages")
    word_count: Optional[int] = Field(None, description="Word count")
    language: Optional[str] = Field(None, description="Detected language")

class DocumentUpload(BaseModel):
    """Document upload request"""
    category: str = Field(..., description="Document category")
    tags: Optional[List[str]] = Field(default=[], description="Document tags")
    metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional metadata")
    description: Optional[str] = Field(None, description="Document description")

class DocumentChunk(BaseModel):
    """Document text chunk for processing"""
    id: str = Field(..., description="Chunk identifier")
    document_id: str = Field(..., description="Parent document ID")
    content: str = Field(..., description="Chunk text content")
    page_number: int = Field(..., description="Page number")
    paragraph_number: Optional[int] = Field(None, description="Paragraph number")
    section_title: Optional[str] = Field(None, description="Section title")
    chunk_index: int = Field(..., description="Chunk sequence number")
    metadata: Dict[str, Any] = Field(default={}, description="Chunk metadata")

class SearchResult(BaseModel):
    """Search result item"""
    document_id: str = Field(..., description="Document identifier")
    title: str = Field(..., description="Document title")
    content: str = Field(..., description="Matching content")
    score: float = Field(..., description="Similarity score")
    document_path: str = Field(..., description="Document file path")
    page_number: int = Field(..., description="Page number")
    paragraph_number: Optional[int] = Field(None, description="Paragraph number")
    context_match: Dict[str, Any] = Field(default={}, description="Context matching info")

class UsageAnalytics(BaseModel):
    """System usage analytics"""
    total_documents: int = Field(..., description="Total documents in system")
    total_searches: int = Field(..., description="Total search queries")
    average_response_time: float = Field(..., description="Average response time in seconds")
    top_categories: List[Dict[str, Any]] = Field(..., description="Most used document categories")
    search_trends: List[Dict[str, Any]] = Field(..., description="Search trend data")
    user_activity: Dict[str, Any] = Field(..., description="User activity metrics")
    system_health: Dict[str, Any] = Field(..., description="System health indicators")

class WebSocketMessage(BaseModel):
    """WebSocket message format"""
    type: str = Field(..., description="Message type")
    data: Dict[str, Any] = Field(..., description="Message data")
    timestamp: float = Field(..., description="Message timestamp")
    client_id: Optional[str] = Field(None, description="Client identifier")

class ErrorResponse(BaseModel):
    """API error response"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.now, description="Error timestamp")