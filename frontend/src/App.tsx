import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

// Pages and Components
import KnowledgeInterface from './pages/KnowledgeInterface';
import DocumentManager from './pages/DocumentManager';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import ActivityLog from './pages/ActivityLog';
import HelpSupport from './pages/HelpSupport';
import Login from './pages/Login';
import Register from './pages/Register';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';

// Context Providers
import { WebSocketProvider } from './contexts/WebSocketContext';
import { SearchProvider } from './contexts/SearchContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SearchProvider>
          <WebSocketProvider>
            <Router>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Protected Routes */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
                        {/* Sidebar */}
                        <Sidebar />
                        
                        {/* Main Content */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                          {/* Header */}
                          <Header />
                          
                          {/* Page Content */}
                          <main className="flex-1 overflow-y-auto">
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5 }}
                              className="h-full"
                            >
                              <Routes>
                                <Route path="/" element={<KnowledgeInterface />} />
                                <Route path="/documents" element={<DocumentManager />} />
                                <Route path="/analytics" element={<Analytics />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/activity-log" element={<ActivityLog />} />
                                <Route path="/help-support" element={<HelpSupport />} />
                              </Routes>
                            </motion.div>
                          </main>
                        </div>
                      </div>
                    </ProtectedRoute>
                  }
                />
              </Routes>
              
              {/* Global Toast Notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  className: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg',
                  duration: 4000,
                  style: {
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                  },
                  success: {
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#ffffff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#ffffff',
                    },
                  },
                }}
              />
            </Router>
          </WebSocketProvider>
        </SearchProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;