import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, ExternalLink, Star, Clock, MapPin, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import Highlighter from 'react-highlight-words';

interface Citation {
  document_id: string;
  document_title: string;
  page_number: number;
  paragraph_number?: number;
  section_title?: string;
  url?: string;
  last_updated?: string;
}

interface ContextMatch {
  query?: string;
  chunk_index?: number;
  section_title?: string;
  tags?: string[];
  document_title?: string;
  match_type?: string;
  keywords_matched?: number;
  total_keywords?: number;
}

interface SuggestionData {
  id: string;
  title: string;
  content: string;
  relevance_score: number;
  source_document: string;
  page_number: number;
  paragraph_number?: number;
  citations?: Citation[];
  context_match?: ContextMatch;
  timestamp?: string;
  tags?: string[];
}

interface SuggestionCardProps {
  suggestion: SuggestionData;
  searchTerm?: string;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, searchTerm }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCitations, setShowCitations] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100 dark:bg-green-900/20';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
    return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  const handleDocumentClick = () => {
    // Navigate to document viewer
    const documentId = suggestion.source_document.split('/').pop();
    if (documentId) {
      // Navigate to Document Manager with this document selected
      window.location.href = `/documents?view=${documentId}`;
    }
  };

  const getDocumentTitle = () => {
    // Priority order for document title:
    // 1. context_match.document_title (from search engine metadata)
    // 2. Direct title field if it looks like a filename
    // 3. Parse from source_document path
    // 4. Use suggestion.title
    // 5. Fallback to 'Unknown Document'
    
    // First, check context_match for document_title
    if (suggestion.context_match?.document_title && 
        suggestion.context_match.document_title !== 'Unknown Document') {
      return suggestion.context_match.document_title;
    }
    
    // Check if title looks like a filename (has extension)
    if (suggestion.title && 
        (suggestion.title.includes('.pdf') || 
         suggestion.title.includes('.docx') || 
         suggestion.title.includes('.txt'))) {
      return suggestion.title;
    }
    
    // Try to parse from source_document path
    if (suggestion.source_document) {
      const match = suggestion.source_document.match(/\/([^\/]+)$/);
      if (match && match[1] !== 'Unknown Document') {
        const filename = decodeURIComponent(match[1]);
        // If it looks like a document ID, try to get better title
        if (!filename.match(/^[a-f0-9-]{36}$/i)) {
          return filename;
        }
      }
    }
    
    // Use title if not already used
    if (suggestion.title && suggestion.title !== 'Unknown Document') {
      return suggestion.title;
    }
    
    return 'Unknown Document';
  };

  return (
    <motion.div
      layout
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <button
                onClick={handleDocumentClick}
                className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1 text-left transition-colors"
                title={`Open ${getDocumentTitle()}`}
              >
                {getDocumentTitle()}
              </button>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>Page {suggestion.page_number}</span>
                {suggestion.paragraph_number && (
                  <span>, ¶{suggestion.paragraph_number}</span>
                )}
              </div>
              
              {suggestion.timestamp && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{format(new Date(suggestion.timestamp), 'MMM d, HH:mm')}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Relevance Score */}
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(suggestion.relevance_score)}`}>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {Math.round(suggestion.relevance_score * 100)}%
              </div>
            </div>
            
            {/* Open Document */}
            <button
              onClick={handleDocumentClick}
              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Open document"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {searchTerm ? (
            <Highlighter
              searchWords={[searchTerm]}
              textToHighlight={isExpanded ? suggestion.content : truncateContent(suggestion.content)}
              className="text-gray-700 dark:text-gray-300 leading-relaxed"
              highlightClassName="bg-yellow-200 dark:bg-yellow-800/50 px-1 rounded"
            />
          ) : (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {isExpanded ? suggestion.content : truncateContent(suggestion.content)}
            </p>
          )}
        </div>

        {/* Expand/Collapse */}
        {suggestion.content.length > 200 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show more
              </>
            )}
          </button>
        )}

        {/* Tags */}
        {suggestion.tags && suggestion.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {suggestion.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md text-xs"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Context Match Info */}
        {suggestion.context_match && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
              Context Match
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              {suggestion.context_match.section_title && (
                <div>Section: {suggestion.context_match.section_title}</div>
              )}
              {suggestion.context_match.match_type && (
                <div>Match Type: {suggestion.context_match.match_type}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Citations Footer */}
      {suggestion.citations && suggestion.citations.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setShowCitations(!showCitations)}
            className="w-full px-4 py-3 text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {suggestion.citations.length} Citation{suggestion.citations.length !== 1 ? 's' : ''}
              </span>
              {showCitations ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>
          
          {showCitations && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pb-4"
            >
              <div className="space-y-2">
                {suggestion.citations.map((citation, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs"
                  >
                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                      {citation.document_title}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Page {citation.page_number}
                      {citation.paragraph_number && `, Paragraph ${citation.paragraph_number}`}
                      {citation.section_title && ` • ${citation.section_title}`}
                    </div>
                    {citation.url && (
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open Reference
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default SuggestionCard;