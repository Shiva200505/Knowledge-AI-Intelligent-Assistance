import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, Filter, Zap, ArrowRight } from 'lucide-react';
import { useSearch } from '../contexts/SearchContext';

interface SearchBarProps {
  onSearch: (query: string) => void;
  className?: string;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  className = '', 
  placeholder = "Search knowledge base... (e.g., 'Florida flood insurance requirements')" 
}) => {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    dateRange: '',
    documentType: ''
  });
  
  const { searchHistory, isSearching } = useSearch();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'All Categories',
    'Regulations',
    'Policies', 
    'Procedures',
    'Legal Documents',
    'Forms',
    'Guidelines'
  ];

  const documentTypes = [
    'All Types',
    'PDF',
    'Word Document',
    'Spreadsheet',
    'Text File'
  ];

  const dateRanges = [
    'Any Time',
    'Last Week',
    'Last Month',
    'Last 3 Months',
    'Last Year'
  ];

  const quickSearches = [
    'Flood insurance Florida',
    'Auto accident procedures',
    'Workers compensation claims',
    'Property damage assessment',
    'Liability coverage limits',
    'Claims processing timeline'
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowHistory(false);
        setShowFilters(false);
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setQuery(searchQuery.trim());
      setShowHistory(false);
      setShowFilters(false);
      setIsExpanded(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowHistory(false);
      setShowFilters(false);
      setIsExpanded(false);
    }
  };

  const handleInputFocus = () => {
    setIsExpanded(true);
    if (searchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  const clearQuery = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const selectFromHistory = (historyItem: string) => {
    setQuery(historyItem);
    handleSearch(historyItem);
  };

  const selectQuickSearch = (quickSearch: string) => {
    setQuery(quickSearch);
    handleSearch(quickSearch);
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Main Search Bar */}
      <motion.div
        layout
        className={`relative bg-white dark:bg-gray-800 border-2 rounded-2xl shadow-soft transition-all duration-300 ${
          isExpanded 
            ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Search className={`w-5 h-5 ${isExpanded ? 'text-blue-500' : 'text-gray-400'} transition-colors`} />
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm"
          />

          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={clearQuery}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleSearch()}
            disabled={!query.trim() || isSearching}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-gray-200 dark:border-gray-700 p-4 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {categories.map(category => (
                      <option key={category} value={category === 'All Categories' ? '' : category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Document Type
                  </label>
                  <select
                    value={filters.documentType}
                    onChange={(e) => setFilters(prev => ({ ...prev, documentType: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {documentTypes.map(type => (
                      <option key={type} value={type === 'All Types' ? '' : type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date Range
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {dateRanges.map(range => (
                      <option key={range} value={range === 'Any Time' ? '' : range}>
                        {range}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => setFilters({ category: '', dateRange: '', documentType: '' })}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => handleSearch()}
                  className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Search Suggestions Dropdown */}
      <AnimatePresence>
        {isExpanded && (showHistory || query.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            {/* Quick Searches */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quick Searches
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {quickSearches.map((searchTerm, index) => (
                  <button
                    key={index}
                    onClick={() => selectQuickSearch(searchTerm)}
                    className="text-left p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-between group"
                  >
                    <span>{searchTerm}</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Recent Searches
                  </span>
                </div>
                <div className="space-y-1">
                  {searchHistory.slice(0, 5).map((historyItem, index) => (
                    <button
                      key={index}
                      onClick={() => selectFromHistory(historyItem)}
                      className="w-full text-left p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">{historyItem}</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;