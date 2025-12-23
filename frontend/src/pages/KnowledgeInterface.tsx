import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Clock, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { useWebSocket } from '../contexts/WebSocketContext';
import { useSearch } from '../contexts/SearchContext';
import CaseContextForm from '../components/CaseContextForm';
import SuggestionCard from '../components/SuggestionCard';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';

interface CaseContext {
  case_id: string;
  case_type: string;
  state?: string;
  status?: string;
  priority?: string;
  customer_type?: string;
  policy_type?: string;
  claim_amount?: number;
  tags?: string[];
}

const KnowledgeInterface: React.FC = () => {
  const { suggestions, sendCaseContext, connectionStatus, isConnected } = useWebSocket();
  const { searchResults, isSearching, performSearch } = useSearch();
  
  const [caseContext, setCaseContext] = useState<CaseContext>({
    case_id: '',
    case_type: '',
  });
  
  const [activeTab, setActiveTab] = useState<'suggestions' | 'search'>('suggestions');
  const [showContextForm, setShowContextForm] = useState(false);

  // Auto-send context when it changes (debounced)
  useEffect(() => {
    if (caseContext.case_id && caseContext.case_type && isConnected) {
      const timeoutId = setTimeout(() => {
        sendCaseContext(caseContext);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [caseContext, sendCaseContext, isConnected]);

  const handleContextUpdate = useCallback((newContext: Partial<CaseContext>) => {
    setCaseContext(prev => ({ ...prev, ...newContext }));
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (query.trim()) {
      await performSearch({ text: query });
      setActiveTab('search');
    }
  }, [performSearch]);

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="h-full max-w-7xl mx-auto px-4 py-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Knowledge Assistant
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Context-aware document suggestions for case management
              </p>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`} />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting...' :
                 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <SearchBar onSearch={handleSearch} />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-280px)]">
          {/* Case Context Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Case Context
                </h2>
                <button
                  onClick={() => setShowContextForm(!showContextForm)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <FileText size={18} />
                </button>
              </div>

              <AnimatePresence>
                {showContextForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <CaseContextForm
                      context={caseContext}
                      onChange={handleContextUpdate}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick Context Summary */}
              {caseContext.case_id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl"
                >
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Active Case
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="text-blue-700 dark:text-blue-300">
                      ID: {caseContext.case_id}
                    </div>
                    <div className="text-blue-700 dark:text-blue-300">
                      Type: {caseContext.case_type}
                    </div>
                    {caseContext.state && (
                      <div className="text-blue-700 dark:text-blue-300">
                        State: {caseContext.state}
                      </div>
                    )}
                    {caseContext.priority && (
                      <div className={`flex items-center gap-1 ${
                        caseContext.priority === 'high' ? 'text-red-600' :
                        caseContext.priority === 'medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        <AlertCircle size={14} />
                        Priority: {caseContext.priority}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft h-full overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('suggestions')}
                    className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'suggestions'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Zap size={16} />
                      Smart Suggestions
                      {suggestions.length > 0 && (
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs rounded-full px-2 py-1">
                          {suggestions.length}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('search')}
                    className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'search'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Search size={16} />
                      Search Results
                      {searchResults.length > 0 && (
                        <span className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 text-xs rounded-full px-2 py-1">
                          {searchResults.length}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="h-[calc(100%-64px)] overflow-y-auto">
                <AnimatePresence mode="wait">
                  {activeTab === 'suggestions' && (
                    <motion.div
                      key="suggestions"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-6"
                    >
                      {!isConnected ? (
                        <div className="text-center py-12">
                          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Connection Lost
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400">
                            Trying to reconnect to the knowledge system...
                          </p>
                        </div>
                      ) : suggestions.length === 0 ? (
                        <div className="text-center py-12">
                          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No Suggestions Yet
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 mb-4">
                            Enter case details to receive intelligent document suggestions
                          </p>
                          <button
                            onClick={() => setShowContextForm(true)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <FileText size={16} className="mr-2" />
                            Enter Case Details
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {suggestions.length} context-aware suggestions found
                            </span>
                          </div>
                          {suggestions.map((suggestion, index) => (
                            <motion.div
                              key={suggestion.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <SuggestionCard suggestion={suggestion} />
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'search' && (
                    <motion.div
                      key="search"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-6"
                    >
                      {isSearching ? (
                        <div className="flex justify-center py-12">
                          <LoadingSpinner size="large" />
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="text-center py-12">
                          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No Search Results
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400">
                            Use the search bar above to find relevant documents
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Search className="w-5 h-5 text-blue-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {searchResults.length} search results found
                            </span>
                          </div>
                          {searchResults.map((result, index) => (
                            <motion.div
                              key={result.document_id + result.page_number}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <SuggestionCard suggestion={result} />
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeInterface;