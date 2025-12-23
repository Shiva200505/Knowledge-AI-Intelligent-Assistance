import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Search, 
  Filter, 
  Download, 
  Clock,
  User,
  FileText,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Calendar,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  resource: string;
  details: string;
  type: 'search' | 'document' | 'system' | 'user';
  status: 'success' | 'warning' | 'error';
}

const ActivityLog: React.FC = () => {
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [filteredLog, setFilteredLog] = useState<ActivityLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockActivities: ActivityLogEntry[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        user: 'Support Agent',
        action: 'Searched for documents',
        resource: 'insurance claim procedures',
        details: 'Found 15 relevant documents',
        type: 'search',
        status: 'success'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 12 * 60 * 1000),
        user: 'Support Agent',
        action: 'Uploaded document',
        resource: 'policy_guidelines_2024.pdf',
        details: 'Document processed successfully',
        type: 'document',
        status: 'success'
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
        user: 'Support Agent',
        action: 'Updated case context',
        resource: 'Case #CLM-2024-001',
        details: 'Modified priority to high',
        type: 'user',
        status: 'success'
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        user: 'System',
        action: 'Automatic backup',
        resource: 'Database',
        details: 'Backup completed successfully',
        type: 'system',
        status: 'success'
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 67 * 60 * 1000),
        user: 'Support Agent',
        action: 'Failed document processing',
        resource: 'corrupted_file.doc',
        details: 'File format not supported',
        type: 'document',
        status: 'error'
      }
    ];

    setActivityLog(mockActivities);
    setFilteredLog(mockActivities);
  }, []);

  // Filter and search logic
  useEffect(() => {
    let filtered = [...activityLog];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(entry =>
        entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.details.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(entry => entry.type === filterType);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(entry => entry.status === filterStatus);
    }

    setFilteredLog(filtered);
  }, [searchQuery, filterType, filterStatus, activityLog]);

  const refreshActivity = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Activity log refreshed');
    }, 1000);
  };

  const exportActivity = () => {
    const csvContent = [
      'Timestamp,User,Action,Resource,Details,Type,Status',
      ...filteredLog.map(entry => 
        `"${entry.timestamp.toISOString()}","${entry.user}","${entry.action}","${entry.resource}","${entry.details}","${entry.type}","${entry.status}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success('Activity log exported');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'search': return <Search className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      case 'system': return <RefreshCw className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'warning': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'error': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Activity Log
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Track all system activities and user actions
            </p>
          </div>
          
          <div className="flex items-center gap-3 mt-4 lg:mt-0">
            <button
              onClick={refreshActivity}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={exportActivity}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Activity Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="search">Search</option>
                    <option value="document">Document</option>
                    <option value="user">User Action</option>
                    <option value="system">System</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Activity List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft overflow-hidden">
          {filteredLog.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No activities found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLog.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                        {getTypeIcon(entry.type)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.action}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(entry.status)}`}>
                            {entry.status}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimeAgo(entry.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                        <span className="font-medium">{entry.user}</span> worked on{' '}
                        <span className="font-medium">{entry.resource}</span>
                      </p>
                      
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {entry.details}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {entry.timestamp.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Total Activities', value: activityLog.length, color: 'blue' },
            { label: 'Search Actions', value: activityLog.filter(a => a.type === 'search').length, color: 'green' },
            { label: 'Document Actions', value: activityLog.filter(a => a.type === 'document').length, color: 'purple' },
            { label: 'Errors', value: activityLog.filter(a => a.status === 'error').length, color: 'red' },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-soft"
            >
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default ActivityLog;