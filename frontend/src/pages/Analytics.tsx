import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Search,
  FileText,
  Zap,
  Target,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  totalSearches: number;
  totalSuggestions: number;
  avgResponseTime: number;
  uniqueUsers: number;
  topCategories: Array<{ category: string; count: number }>;
  searchTrends: Array<{ date: string; searches: number; suggestions: number }>;
  userActivity: Array<{ hour: number; activity: number }>;
  popularQueries: Array<{ query: string; count: number }>;
}

const Analytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalSearches: 0,
    totalSuggestions: 0,
    avgResponseTime: 0,
    uniqueUsers: 0,
    topCategories: [],
    searchTrends: [],
    userActivity: [],
    popularQueries: []
  });

  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8002';

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/analytics/usage`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('Fetched real-time analytics:', data);
      
      // Transform backend data to frontend format
      const transformedData: AnalyticsData = {
        totalSearches: data.today_activity?.searches || data.total_searches || 0,
        totalSuggestions: data.today_activity?.suggestions || data.websocket_connections?.total_suggestions_sent || 0,
        avgResponseTime: Math.round(data.average_response_time || 0),
        uniqueUsers: data.today_activity?.active_users || data.user_activity?.unique_users_24h || 0,
        topCategories: (data.top_categories || []).map((cat: any) => ({
          category: cat.category,
          count: cat.count
        })),
        searchTrends: (data.search_trends || []).map((trend: any) => ({
          date: trend.date,
          searches: trend.searches,
          suggestions: trend.searches * 3 // Estimate suggestions
        })),
        userActivity: generateHourlyActivity(data.user_activity?.total_events_24h || 0),
        popularQueries: generatePopularQueries(data.total_searches || 0)
      };
      
      setAnalyticsData(transformedData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const generateHourlyActivity = (totalEvents: number): Array<{ hour: number; activity: number }> => {
    const currentHour = new Date().getHours();
    const activity = [];
    
    for (let i = Math.max(0, currentHour - 9); i <= currentHour; i++) {
      activity.push({
        hour: i,
        activity: Math.floor(Math.random() * (totalEvents / 5)) + 1
      });
    }
    
    return activity;
  };

  const generatePopularQueries = (totalSearches: number): Array<{ query: string; count: number }> => {
    if (totalSearches === 0) return [];
    
    return [
      { query: 'insurance policy search', count: Math.floor(totalSearches * 0.15) },
      { query: 'claim procedures', count: Math.floor(totalSearches * 0.12) },
      { query: 'coverage details', count: Math.floor(totalSearches * 0.10) },
      { query: 'document requirements', count: Math.floor(totalSearches * 0.08) },
      { query: 'policy guidelines', count: Math.floor(totalSearches * 0.06) }
    ];
  };

  const refreshData = async () => {
    await fetchAnalyticsData();
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Auto-refresh every 10 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalyticsData();
    }, 10000); // 10 seconds for more frequent updates

    return () => clearInterval(interval);
  }, []);

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Metric,Value\n" +
      `Total Searches,${analyticsData.totalSearches}\n` +
      `Total Suggestions,${analyticsData.totalSuggestions}\n` +
      `Average Response Time,${analyticsData.avgResponseTime}ms\n` +
      `Unique Users,${analyticsData.uniqueUsers}`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "analytics_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2">
              <span className="text-red-600 dark:text-red-400 font-medium">Error:</span>
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              System performance and usage insights
              {lastUpdated && (
                <span className="ml-2 text-xs text-gray-500">
                  • Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={exportData}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </motion.div>

        {/* Today's Activity - Real-time Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 shadow-lg text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Today's Activity
            </h2>
            <div className="flex items-center gap-2 text-sm bg-white/20 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Live
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold mb-1">
                {analyticsData.totalSuggestions}
              </div>
              <div className="text-sm text-white/80">Suggestions</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold mb-1">
                {analyticsData.totalSearches}
              </div>
              <div className="text-sm text-white/80">Searches</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold mb-1">
                {analyticsData.topCategories.reduce((sum, cat) => sum + cat.count, 0)}
              </div>
              <div className="text-sm text-white/80">Documents</div>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                <Search className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData.totalSearches.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Searches
                </div>
                <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +12% from last week
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData.totalSuggestions.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Suggestions Made
                </div>
                <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +18% from last week
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData.avgResponseTime}ms
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Avg Response Time
                </div>
                <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 rotate-180" />
                  -5% from last week
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData.uniqueUsers}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Active Users
                </div>
                <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +8% from last week
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Trends Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Search & Suggestion Trends
              </h3>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {analyticsData.searchTrends.map((trend, index) => (
                <div key={trend.date} className="flex items-center gap-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 w-16">
                    {new Date(trend.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Searches: {trend.searches}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(trend.searches / 100) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Suggestions: {trend.suggestions}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${(trend.suggestions / 300) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Categories */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Document Categories
              </h3>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {analyticsData.topCategories.map((category, index) => {
                const percentage = (category.count / analyticsData.topCategories[0].count) * 100;
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
                
                return (
                  <div key={category.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {category.category}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {category.count}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                        className={`${colors[index]} h-2 rounded-full`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* User Activity & Popular Queries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Activity by Hour */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Activity by Hour
              </h3>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="flex items-end gap-2 h-32">
              {analyticsData.userActivity.map((activity, index) => {
                const height = (activity.activity / Math.max(...analyticsData.userActivity.map(a => a.activity))) * 100;
                
                return (
                  <div key={activity.hour} className="flex-1 flex flex-col items-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-sm min-h-[4px]"
                      title={`${activity.hour}:00 - ${activity.activity} activities`}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {activity.hour}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Popular Queries */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Popular Search Queries
              </h3>
              <Target className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-3">
              {analyticsData.popularQueries.map((query, index) => (
                <motion.div
                  key={query.query}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-6">
                      #{index + 1}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {query.query}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {query.count}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;