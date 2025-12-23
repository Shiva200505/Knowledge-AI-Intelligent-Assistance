import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface SearchResult {
  id: string;
  document_id: string;
  title: string;
  content: string;
  score: number;
  relevance_score: number;
  source_document: string;
  document_path: string;
  page_number: number;
  paragraph_number?: number;
  citations: any[];
  context_match: any;
  timestamp: string;
}

interface SearchQuery {
  text: string;
  filters?: Record<string, any>;
  limit?: number;
  threshold?: number;
}

interface SearchContextType {
  searchResults: SearchResult[];
  isSearching: boolean;
  searchHistory: string[];
  performSearch: (query: SearchQuery) => Promise<SearchResult[]>;
  clearResults: () => void;
  addToHistory: (query: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

interface SearchProviderProps {
  children: React.ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8002';

  const performSearch = useCallback(async (query: SearchQuery): Promise<SearchResult[]> => {
    if (!query.text.trim()) {
      toast.error('Please enter a search query');
      return [];
    }

    setIsSearching(true);
    
    try {
      const startTime = Date.now();
      
      const response = await axios.post(`${apiUrl}/api/search`, {
        text: query.text,
        filters: query.filters || {},
        limit: query.limit || 10,
        threshold: query.threshold || 0.7,
      });

      const results = response.data;
      const searchTime = Date.now() - startTime;
      
      setSearchResults(results);
      addToHistory(query.text);
      
      toast.success(`Found ${results.length} results in ${searchTime}ms`);
      
      return results;
      
    } catch (error: any) {
      console.error('Search failed:', error);
      
      const errorMessage = error.response?.data?.detail || 'Search failed';
      toast.error(errorMessage);
      
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [apiUrl]);

  const clearResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  const addToHistory = useCallback((query: string) => {
    setSearchHistory(prev => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery || prev.includes(trimmedQuery)) {
        return prev;
      }
      
      const newHistory = [trimmedQuery, ...prev.slice(0, 9)]; // Keep last 10
      return newHistory;
    });
  }, []);

  const contextValue: SearchContextType = {
    searchResults,
    isSearching,
    searchHistory,
    performSearch,
    clearResults,
    addToHistory,
  };

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  );
}