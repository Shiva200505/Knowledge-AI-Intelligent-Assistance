"""
Vector-based semantic search engine using Chroma DB
"""
import asyncio
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import numpy as np

# import chromadb  # Temporarily disabled due to build dependencies
# from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer

from models.schemas import DocumentChunk, SearchResult
from config.settings import settings

logger = logging.getLogger(__name__)

class SearchEngine:
    """Semantic search engine with vector embeddings"""
    
    def __init__(self, db_path: str):
        self.db_path = Path(db_path)
        self.client = None
        self.collection = None
        self.embedding_model = None
        self.model_name = settings.embedding_model
        
    async def initialize(self):
        """Initialize vector database and embedding model"""
        try:
            # Create database directory
            self.db_path.mkdir(parents=True, exist_ok=True)
            
            # Mock Chroma client (temporarily disabled)
            self.client = {"mock": True}
            self.collection = {"mock": True}
            self._mock_documents = {}
            logger.warning("Using mock vector database - ChromaDB not available")
            
            # Load embedding model
            self.embedding_model = SentenceTransformer(self.model_name)
            
            logger.info(f"Search engine initialized with mock database")
            
        except Exception as e:
            logger.error(f"Search engine initialization failed: {e}")
            raise
            
    async def health_check(self) -> bool:
        """Check if search engine is healthy"""
        try:
            if self.client and self.collection:
                # Mock health check
                return True
            return False
        except Exception:
            return False
            
    async def index_document(self, document_data: Dict[str, Any]):
        """Index document chunks in vector database"""
        try:
            chunks = document_data.get('chunks', [])
            metadata = document_data.get('metadata', {})
            doc_id = document_data.get('document_id', document_data.get('id', 'unknown'))
            
            # Get filename from multiple possible sources (prioritize what's passed in)
            filename = (
                document_data.get('filename') or 
                metadata.get('filename') or 
                metadata.get('document_filename') or 
                metadata.get('document_title') or
                'Unknown Document'
            )
            
            if not chunks:
                logger.warning(f"No chunks to index for document {doc_id}")
                return
                
            # Prepare data for indexing
            texts = []
            chunk_metadata = []
            chunk_ids = []
            
            for i, chunk in enumerate(chunks):
                # Handle both dict and object chunks
                if isinstance(chunk, dict):
                    content = chunk.get('content', '')
                    chunk_id = chunk.get('id', f"{doc_id}_chunk_{i}")
                    page_number = chunk.get('page_number', 0)
                    paragraph_number = chunk.get('paragraph_number', 0)
                    chunk_index = chunk.get('chunk_index', i)
                    section_title = chunk.get('section_title', '')
                    chunk_meta_extra = chunk.get('metadata', {})
                else:
                    content = chunk.content
                    chunk_id = chunk.id
                    page_number = chunk.page_number
                    paragraph_number = chunk.paragraph_number or 0
                    chunk_index = chunk.chunk_index
                    section_title = chunk.section_title or ''
                    chunk_meta_extra = chunk.metadata
                
                texts.append(content)
                chunk_ids.append(chunk_id)
                
                # Create metadata for each chunk with multiple filename fields for compatibility
                chunk_meta = {
                    'document_id': doc_id,
                    'page_number': page_number,
                    'paragraph_number': paragraph_number,
                    'chunk_index': chunk_index,
                    'word_count': len(content.split()),
                    'document_category': metadata.get('category', 'unknown'),
                    'document_filename': filename,  # Primary field
                    'filename': filename,  # Alternate field
                    'document_title': filename,  # For citations
                    'section_title': section_title,
                    'tags': ','.join(metadata.get('tags', [])),
                }
                
                # Add custom metadata
                if chunk_meta_extra:
                    chunk_meta.update(chunk_meta_extra)
                chunk_metadata.append(chunk_meta)
                
            # Generate embeddings
            embeddings = await self._generate_embeddings(texts)
            
            # Mock add to collection
            for i, text in enumerate(texts):
                self._mock_documents[chunk_ids[i]] = {
                    'text': text,
                    'metadata': chunk_metadata[i],
                    'embedding': embeddings[i].tolist() if hasattr(embeddings, 'tolist') else embeddings[i]
                }
            
            logger.info(f"Indexed {len(chunks)} chunks for document {doc_id}")
            
        except Exception as e:
            doc_id = document_data.get('document_id', document_data.get('id', 'unknown'))
            logger.error(f"Document indexing failed for {doc_id}: {e}")
            raise
            
    async def search(
        self, 
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10
    ) -> List[SearchResult]:
        """Search for relevant documents"""
        try:
            # Generate query embedding
            query_embedding = await self._generate_embeddings([query])
            
            # Prepare where clause for filtering
            where_clause = {}
            if filters:
                for key, value in filters.items():
                    if key == 'category':
                        where_clause['document_category'] = value
                    elif key == 'tags':
                        # Search for documents with specific tags
                        where_clause['tags'] = {'$contains': value}
                    elif key == 'document_id':
                        where_clause['document_id'] = value
                    elif key == 'page_number':
                        where_clause['page_number'] = value
                        
            # Perform similarity search on mock documents
            search_results = []
            
            # Search through mock documents if available
            if hasattr(self, '_mock_documents') and self._mock_documents:
                # Calculate similarity scores for all documents
                scored_docs = []
                query_embedding_flat = query_embedding[0] if len(query_embedding.shape) > 1 else query_embedding
                
                for chunk_id, chunk_data in self._mock_documents.items():
                    metadata = chunk_data['metadata']
                    
                    # Apply filters if provided
                    if where_clause:
                        skip = False
                        for key, value in where_clause.items():
                            if key in metadata:
                                if isinstance(value, dict) and '$contains' in value:
                                    if value['$contains'] not in metadata[key]:
                                        skip = True
                                        break
                                elif metadata[key] != value:
                                    skip = True
                                    break
                        if skip:
                            continue
                    
                    # Calculate cosine similarity
                    doc_embedding = np.array(chunk_data['embedding'])
                    similarity = np.dot(query_embedding_flat, doc_embedding) / (
                        np.linalg.norm(query_embedding_flat) * np.linalg.norm(doc_embedding)
                    )
                    
                    # Convert to positive score (0 to 1)
                    similarity_score = (similarity + 1) / 2
                    
                    # Skip results below threshold
                    if similarity_score < settings.similarity_threshold:
                        continue
                    
                    scored_docs.append({
                        'text': chunk_data['text'],
                        'metadata': metadata,
                        'score': similarity_score
                    })
                
                # Sort by score and take top results
                scored_docs.sort(key=lambda x: x['score'], reverse=True)
                scored_docs = scored_docs[:limit]
                
                # Convert to SearchResult objects
                for doc_data in scored_docs:
                    metadata = doc_data['metadata']
                    result = SearchResult(
                        document_id=metadata['document_id'],
                        title=metadata.get('document_filename', 'Unknown Document'),
                        content=doc_data['text'],
                        score=doc_data['score'],
                        document_path=f"/documents/{metadata['document_id']}",
                        page_number=metadata['page_number'],
                        paragraph_number=metadata.get('paragraph_number'),
                        context_match={
                            'query': query,
                            'chunk_index': metadata['chunk_index'],
                            'section_title': metadata.get('section_title', ''),
                            'tags': metadata.get('tags', '').split(',') if metadata.get('tags') else [],
                            'document_title': metadata.get('document_filename', 'Unknown Document')
                        }
                    )
                    search_results.append(result)
                    
            logger.info(f"Search returned {len(search_results)} results for query: '{query[:50]}...'")
            return search_results
            
        except Exception as e:
            logger.error(f"Search failed for query '{query}': {e}")
            raise
            
    async def semantic_search(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None,
        limit: int = 10
    ) -> List[SearchResult]:
        """Enhanced semantic search with context awareness"""
        try:
            # Enhance query with context
            enhanced_query = await self._enhance_query_with_context(query, context)
            
            # Perform multiple search strategies
            direct_results = await self.search(enhanced_query, limit=limit//2)
            
            # Keyword-based search for exact matches
            keyword_results = await self._keyword_search(query, context, limit//2)
            
            # Combine and rank results
            combined_results = self._combine_and_rank_results(
                direct_results, 
                keyword_results,
                query,
                context
            )
            
            return combined_results[:limit]
            
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return await self.search(query, limit=limit)
            
    async def _keyword_search(
        self,
        query: str,
        context: Optional[Dict[str, Any]],
        limit: int
    ) -> List[SearchResult]:
        """Perform keyword-based search for exact matches"""
        try:
            # Extract keywords from query
            keywords = query.lower().split()
            
            # Search for documents containing keywords
            results = []
            
            # Get all documents and filter by keyword matching
            all_results = self.collection.get(
                include=['documents', 'metadatas']
            )
            
            if all_results['documents']:
                scored_results = []
                
                for i, (doc, metadata) in enumerate(zip(
                    all_results['documents'],
                    all_results['metadatas']
                )):
                    doc_lower = doc.lower()
                    
                    # Calculate keyword match score
                    keyword_matches = sum(1 for keyword in keywords if keyword in doc_lower)
                    if keyword_matches > 0:
                        score = keyword_matches / len(keywords)
                        
                        # Apply context filtering if available
                        if context and not self._matches_context(metadata, context):
                            continue
                            
                        scored_results.append((doc, metadata, score))
                        
                # Sort by score and convert to SearchResult
                scored_results.sort(key=lambda x: x[2], reverse=True)
                
                for doc, metadata, score in scored_results[:limit]:
                    result = SearchResult(
                        document_id=metadata['document_id'],
                        title=metadata.get('document_filename', 'Unknown Document'),
                        content=doc,
                        score=score,
                        document_path=f"/documents/{metadata['document_id']}",
                        page_number=metadata['page_number'],
                        paragraph_number=metadata.get('paragraph_number'),
                        context_match={
                            'query': query,
                            'match_type': 'keyword',
                            'keywords_matched': keyword_matches,
                            'total_keywords': len(keywords),
                            'document_title': metadata.get('document_filename', 'Unknown Document')
                        }
                    )
                    results.append(result)
                    
            return results
            
        except Exception as e:
            logger.error(f"Keyword search failed: {e}")
            return []
            
    def _matches_context(self, metadata: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Check if document metadata matches context filters"""
        if 'category' in context and metadata.get('document_category') != context['category']:
            return False
            
        if 'tags' in context:
            doc_tags = set(metadata.get('tags', '').split(','))
            context_tags = set(context['tags'])
            if not doc_tags.intersection(context_tags):
                return False
                
        return True
        
    async def _enhance_query_with_context(
        self, 
        query: str, 
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Enhance search query with context information"""
        if not context:
            return query
            
        enhanced_parts = [query]
        
        # Add context terms
        if 'case_type' in context:
            enhanced_parts.append(f"case type: {context['case_type']}")
            
        if 'state' in context:
            enhanced_parts.append(f"state: {context['state']}")
            
        if 'policy_type' in context:
            enhanced_parts.append(f"policy: {context['policy_type']}")
            
        if 'tags' in context:
            enhanced_parts.extend(context['tags'])
            
        return ' '.join(enhanced_parts)
        
    def _combine_and_rank_results(
        self,
        direct_results: List[SearchResult],
        keyword_results: List[SearchResult],
        query: str,
        context: Optional[Dict[str, Any]]
    ) -> List[SearchResult]:
        """Combine and rank results from multiple search strategies"""
        # Create a dictionary to avoid duplicates
        result_dict = {}
        
        # Add direct results with higher weight
        for result in direct_results:
            key = f"{result.document_id}_{result.page_number}_{result.paragraph_number}"
            if key not in result_dict:
                result.score *= 1.2  # Boost semantic results
                result_dict[key] = result
                
        # Add keyword results
        for result in keyword_results:
            key = f"{result.document_id}_{result.page_number}_{result.paragraph_number}"
            if key not in result_dict:
                result_dict[key] = result
            else:
                # Boost score if found by both methods
                result_dict[key].score = min(1.0, result_dict[key].score + result.score * 0.5)
                
        # Convert back to list and sort
        combined_results = list(result_dict.values())
        combined_results.sort(key=lambda x: x.score, reverse=True)
        
        return combined_results
        
    async def _generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for texts with optimized batch processing"""
        loop = asyncio.get_event_loop()
        
        # Optimize batch size based on text count
        if len(texts) <= 10:
            batch_size = len(texts)  # Process all at once for small batches
        elif len(texts) <= 50:
            batch_size = 16  # Medium batches
        else:
            batch_size = 32  # Large batches
        
        all_embeddings = []
        
        # Only log for large batches to reduce overhead
        should_log = len(texts) > 20
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            if should_log:
                logger.info(f"Generating embeddings: {i+len(batch)}/{len(texts)} texts")
            
            # Run embedding generation in thread pool to avoid blocking
            # Use normalized batch encoding for better performance
            batch_embeddings = await loop.run_in_executor(
                None,
                lambda b=batch: self.embedding_model.encode(
                    b, 
                    show_progress_bar=False,
                    batch_size=min(len(b), 32),  # Internal batch size for the model
                    normalize_embeddings=True  # Normalize for faster similarity computation
                )
            )
            
            all_embeddings.append(batch_embeddings)
        
        # Concatenate all batches
        if len(all_embeddings) == 1:
            return all_embeddings[0]
        else:
            return np.vstack(all_embeddings)
        
    async def remove_document(self, document_id: str):
        """Remove all chunks for a document from the vector store"""
        try:
            # Mock implementation - remove from in-memory storage
            if hasattr(self, '_mock_documents'):
                removed_count = 0
                chunk_ids_to_remove = []
                
                for chunk_id, chunk_data in list(self._mock_documents.items()):
                    if chunk_data.get('metadata', {}).get('document_id') == document_id:
                        chunk_ids_to_remove.append(chunk_id)
                
                for chunk_id in chunk_ids_to_remove:
                    del self._mock_documents[chunk_id]
                    removed_count += 1
                
                if removed_count > 0:
                    logger.info(f"Removed {removed_count} chunks for document {document_id}")
                else:
                    logger.warning(f"No chunks found for document {document_id}")
            else:
                logger.warning(f"Mock documents storage not initialized")
                
        except Exception as e:
            logger.error(f"Failed to remove document {document_id}: {e}")
            raise
            
    async def get_similar_documents(
        self,
        document_id: str,
        limit: int = 5
    ) -> List[SearchResult]:
        """Find documents similar to the given document"""
        try:
            # Get the document's content
            doc_results = self.collection.get(
                where={'document_id': document_id},
                include=['documents', 'metadatas'],
                limit=1
            )
            
            if not doc_results['documents']:
                return []
                
            # Use the first chunk as query
            query_text = doc_results['documents'][0]
            
            # Search for similar documents (excluding the same document)
            results = await self.search(
                query_text,
                filters={'document_id': {'$ne': document_id}},
                limit=limit
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to find similar documents for {document_id}: {e}")
            return []