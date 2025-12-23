import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Search, 
  FileText, 
  BarChart3, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Database,
  TrendingUp,
  Cog
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface TodayActivity {
  suggestions: number;
  searches: number;
  documents: number;
}

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [todayActivity, setTodayActivity] = useState<TodayActivity>({
    suggestions: 0,
    searches: 0,
    documents: 0
  });
  const location = useLocation();
  const { isDark } = useTheme();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8002';

  // Fetch today's activity data
  const fetchTodayActivity = async () => {
    try {
      const response = await fetch(`${API_URL}/api/analytics/usage`);
      if (response.ok) {
        const data = await response.json();
        setTodayActivity({
          suggestions: data.today_activity?.suggestions || 0,
          searches: data.today_activity?.searches || 0,
          documents: data.today_activity?.documents || data.total_documents || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch today\'s activity:', error);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchTodayActivity();
  }, []);

  // Auto-refresh every 10 seconds for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTodayActivity();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  const navigationItems = [
    {
      path: '/',
      icon: Brain,
      label: 'Knowledge Assistant',
      description: 'AI-powered suggestions'
    },
    {
      path: '/documents',
      icon: FileText,
      label: 'Documents',
      description: 'Manage knowledge base'
    },
    {
      path: '/analytics',
      icon: BarChart3,
      label: 'Analytics',
      description: 'Usage insights'
    },
    {
      path: '/settings',
      icon: Settings,
      label: 'Settings',
      description: 'System configuration'
    }
  ];

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <motion.div
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-lg"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3"
              >
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900 dark:text-white">
                    Knowledge AI
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Intelligent Assistance
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(item.path);
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon 
                className={`w-5 h-5 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                }`} 
              />
              
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1"
                  >
                    <div className="font-medium">{item.label}</div>
                    <div className={`text-xs ${
                      isActive 
                        ? 'text-blue-100' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {item.description}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Active indicator for collapsed state */}
              {isCollapsed && isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute right-0 w-1 h-8 bg-white rounded-l-full"
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Quick Stats */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-4 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Today's Activity
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Suggestions</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {todayActivity.suggestions}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Searches</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {todayActivity.searches}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Documents</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {todayActivity.documents}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <AnimatePresence>
          {!isCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                Version 1.0.0
              </div>
              <div className="flex items-center justify-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                System Online
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Sidebar;