import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Settings, 
  User, 
  Moon, 
  Sun, 
  Monitor,
  ChevronDown,
  LogOut,
  HelpCircle,
  Activity,
  Wifi,
  WifiOff,
  X,
  Check
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface Notification {
  id: string;
  type: string;
  title?: string;
  message: string;
  subject?: string;
  severity?: string;
  alert_type?: string;
  sent_at?: string;
  created_at?: string;
  read?: boolean;
  acknowledged?: boolean;
  user_id?: string;
}

const Header: React.FC = () => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { theme, setTheme, isDark } = useTheme();
  const { isConnected, connectionStatus } = useWebSocket();
  const { user, logout } = useAuth();

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // No token, user not logged in - clear notifications
        setNotifications([]);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 20 }
      });

      if (response.data && response.data.notifications) {
        setNotifications(response.data.notifications);
      }
    } catch (error: any) {
      // Handle 401 Unauthorized - token expired or invalid
      if (error.response?.status === 401) {
        console.log('Authentication required for notifications');
        setNotifications([]);
        // Optionally clear token if it's invalid
        // localStorage.removeItem('token');
      } else {
        console.error('Failed to fetch notifications:', error);
      }
    }
  }, []);

  // Load notifications on mount (only if user is logged in)
  useEffect(() => {
    // Only fetch if user is authenticated
    if (user) {
      fetchNotifications();
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      // Clear notifications if user is not logged in
      setNotifications([]);
    }
  }, [fetchNotifications, user]);

  // Listen for WebSocket notification events
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification' || data.type === 'system_alert') {
          // Refresh notifications when new one arrives
          fetchNotifications();
          // Show toast notification
          toast.success(data.data?.message || 'New notification received');
        }
      } catch (error) {
        // Ignore parsing errors
      }
    };

    if (isConnected) {
      // Add event listener if WebSocket is available
      const ws = (window as any).__websocket__;
      if (ws) {
        ws.addEventListener('message', handleWebSocketMessage);
        return () => ws.removeEventListener('message', handleWebSocketMessage);
      }
    }
  }, [isConnected, fetchNotifications]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      await axios.post(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      toast.success('Notification marked as read');
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to mark as read');
      }
    }
  };

  const handleAcknowledgeAlert = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      await axios.post(
        `${API_BASE_URL}/api/notifications/alerts/${alertId}/acknowledge`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === alertId ? { ...n, acknowledged: true } : n)
      );
      toast.success('Alert acknowledged');
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to acknowledge alert');
      }
    }
  };

  const handleDeleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      await axios.delete(
        `${API_BASE_URL}/api/notifications/${notificationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to delete notification');
      }
    }
  };

  const getNotificationTitle = (notification: Notification): string => {
    if (notification.title) return notification.title;
    if (notification.subject) return notification.subject;
    if (notification.type === 'system_alert') return 'System Alert';
    if (notification.type === 'email') return 'Email Notification';
    if (notification.type === 'push') return 'Notification';
    return 'Update';
  };

  const getNotificationTime = (notification: Notification): string => {
    const timestamp = notification.sent_at || notification.created_at;
    if (!timestamp) return 'Just now';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const isNotificationUnread = (notification: Notification): boolean => {
    if (notification.type === 'system_alert') {
      return !notification.acknowledged;
    }
    return !notification.read;
  };

  const unreadCount = notifications.filter(isNotificationUnread).length;

  const getNotificationIcon = (notification: Notification) => {
    // For system alerts, use severity/alert_type
    if (notification.type === 'system_alert') {
      const severity = notification.severity || notification.alert_type;
      switch (severity) {
        case 'critical':
        case 'error': return '🔴';
        case 'high':
        case 'warning': return '⚠️';
        case 'medium':
        case 'info': return 'ℹ️';
        case 'low':
        case 'success': return '✅';
        default: return '📢';
      }
    }
    
    // For other notification types
    switch (notification.type) {
      case 'email': return '📧';
      case 'push': return '🔔';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '📄';
    }
  };

  const getConnectionIcon = () => {
    if (connectionStatus === 'connected') {
      return <Wifi className="w-4 h-4 text-green-500" />;
    } else {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Online';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Offline';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Page info */}
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Intelligent Knowledge System
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Context-aware document assistance for case management
            </p>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
            {getConnectionIcon()}
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {getConnectionText()}
            </span>
          </div>

          {/* Theme Toggle */}
          <div className="relative">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Toggle theme"
            >
              {theme === 'light' && <Sun className="w-5 h-5" />}
              {theme === 'dark' && <Moon className="w-5 h-5" />}
              {theme === 'auto' && <Monitor className="w-5 h-5" />}
            </button>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                >
                  {unreadCount}
                </motion.span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50"
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <motion.div
                          key={notification.id}
                          whileHover={{ backgroundColor: isDark ? '#374151' : '#f9fafb' }}
                          className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 cursor-pointer group"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg flex-shrink-0">{getNotificationIcon(notification)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                  {getNotificationTitle(notification)}
                                </h4>
                                {isNotificationUnread(notification) && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {getNotificationTime(notification)}
                                </span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {notification.type === 'system_alert' && !notification.acknowledged && (
                                    <button
                                      onClick={(e) => handleAcknowledgeAlert(notification.id, e)}
                                      className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                      title="Acknowledge alert"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                  )}
                                  {notification.type !== 'system_alert' && !notification.read && (
                                    <button
                                      onClick={(e) => handleMarkAsRead(notification.id, e)}
                                      className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                      title="Mark as read"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                                    className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title="Delete notification"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                  
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                    <button className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.full_name || 'User'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.email || 'user@example.com'}
                </div>
              </div>
              <ChevronDown className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50"
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user?.full_name || 'User'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user?.email || 'user@example.com'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button 
                      onClick={() => {
                        navigate('/activity-log');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Activity className="w-4 h-4" />
                      <span>Activity Log</span>
                    </button>
                    <button 
                      onClick={() => {
                        navigate('/settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Preferences</span>
                    </button>
                    <button 
                      onClick={() => {
                        navigate('/help-support');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>Help & Support</span>
                    </button>
                  </div>

                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;