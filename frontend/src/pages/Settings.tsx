import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Database, 
  Zap, 
  Shield, 
  Bell,
  Moon,
  Sun,
  Monitor,
  Save,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload,
  Trash2
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  
  const defaultSettings = {
    // Search Settings
    similarityThreshold: 0.7,
    maxSuggestions: 10,
    searchTimeout: 30,
    
    // Performance Settings
    cacheEnabled: true,
    maxConcurrentRequests: 100,
    
    // Security Settings
    requireAuth: false,
    sessionTimeout: 30,
    logLevel: 'INFO',
    
    // Notification Settings
    emailNotifications: true,
    pushNotifications: false,
    systemAlerts: true,
    
    // AI Model Settings
    embeddingModel: 'all-MiniLM-L6-v2',
    contextWindowSize: 512,
    
    // Storage Settings
    retentionPeriod: 90,
    autoBackup: true,
    backupFrequency: 'daily'
  };
  
  const [settings, setSettings] = useState(defaultSettings);
  const [activeTab, setActiveTab] = useState('search');
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8002';
        const token = localStorage.getItem('access_token');
        
        if (token) {
          // Try to load from backend
          const response = await fetch(`${API_URL}/api/settings`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setSettings(prev => ({ ...prev, ...data.settings }));
            console.log('Settings loaded from backend:', data.settings);
            return;
          }
        }
        
        // Fallback to localStorage
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
          console.log('Settings loaded from localStorage:', parsed);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  const tabs = [
    { id: 'search', label: 'Search & AI', icon: Zap },
    { id: 'performance', label: 'Performance', icon: Database },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'storage', label: 'Storage', icon: Download }
  ];

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8002';
      const token = localStorage.getItem('access_token');
      
      // Save to backend API
      const response = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        // Also save to localStorage as backup
        localStorage.setItem('appSettings', JSON.stringify(settings));
        console.log('Settings saved successfully:', settings);
        toast.success('Settings saved successfully!');
      } else {
        throw new Error('Failed to save settings to server');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      // Fallback to localStorage only
      localStorage.setItem('appSettings', JSON.stringify(settings));
      toast.error('Settings saved locally only. Server sync failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    
    // Clear from localStorage
    localStorage.removeItem('appSettings');
    console.log('Settings reset to defaults');
    
    toast.success('Settings reset to defaults');
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'knowledge-system-settings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Settings exported successfully');
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setSettings(imported);
          toast.success('Settings imported successfully');
        } catch (error) {
          toast.error('Invalid settings file');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              System Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Configure the knowledge retrieval system
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".json"
              onChange={importSettings}
              className="hidden"
              id="import-settings"
            />
            <label
              htmlFor="import-settings"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Import
            </label>
            
            <button
              onClick={exportSettings}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            
            <button
              onClick={resetToDefaults}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Reset
            </button>
            
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </motion.div>

          {/* Settings Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6">
              {/* Search & AI Settings */}
              {activeTab === 'search' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Search & AI Configuration
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Similarity Threshold
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={settings.similarityThreshold}
                        onChange={(e) => handleSettingChange('similarityThreshold', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>0.1 (More Results)</span>
                        <span className="font-medium">{settings.similarityThreshold}</span>
                        <span>1.0 (Exact Match)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Suggestions
                      </label>
                      <select
                        value={settings.maxSuggestions}
                        onChange={(e) => handleSettingChange('maxSuggestions', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      >
                        <option value={5}>5 suggestions</option>
                        <option value={10}>10 suggestions</option>
                        <option value={15}>15 suggestions</option>
                        <option value={20}>20 suggestions</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Search Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        value={settings.searchTimeout}
                        onChange={(e) => handleSettingChange('searchTimeout', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Embedding Model
                      </label>
                      <select
                        value={settings.embeddingModel}
                        onChange={(e) => handleSettingChange('embeddingModel', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      >
                        <option value="all-MiniLM-L6-v2">all-MiniLM-L6-v2 (Fast)</option>
                        <option value="all-mpnet-base-v2">all-mpnet-base-v2 (Accurate)</option>
                        <option value="multi-qa-MiniLM-L6-cos-v1">multi-qa-MiniLM-L6-cos-v1 (Q&A)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Settings */}
              {activeTab === 'performance' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Performance Configuration
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Enable Caching
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Cache frequently accessed documents for faster response
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.cacheEnabled}
                          onChange={(e) => handleSettingChange('cacheEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Concurrent Requests
                      </label>
                      <input
                        type="number"
                        value={settings.maxConcurrentRequests}
                        onChange={(e) => handleSettingChange('maxConcurrentRequests', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Context Window Size
                      </label>
                      <select
                        value={settings.contextWindowSize}
                        onChange={(e) => handleSettingChange('contextWindowSize', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      >
                        <option value={256}>256 tokens (Fast)</option>
                        <option value={512}>512 tokens (Balanced)</option>
                        <option value={1024}>1024 tokens (Comprehensive)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Security Configuration
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Require Authentication
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Users must authenticate before accessing the system
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.requireAuth}
                          onChange={(e) => handleSettingChange('requireAuth', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Session Timeout (minutes)
                      </label>
                      <select
                        value={settings.sessionTimeout}
                        onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={240}>4 hours</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Log Level
                      </label>
                      <select
                        value={settings.logLevel}
                        onChange={(e) => handleSettingChange('logLevel', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      >
                        <option value="ERROR">ERROR</option>
                        <option value="WARN">WARN</option>
                        <option value="INFO">INFO</option>
                        <option value="DEBUG">DEBUG</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Settings */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Notification Preferences
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Email Notifications
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Receive system alerts and updates via email
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.emailNotifications}
                          onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Push Notifications
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Receive real-time browser notifications
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.pushNotifications}
                          onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          System Alerts
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Show critical system status alerts
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.systemAlerts}
                          onChange={(e) => handleSettingChange('systemAlerts', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* Theme Settings */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Theme Preference
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'light', icon: Sun, label: 'Light' },
                          { value: 'dark', icon: Moon, label: 'Dark' },
                          { value: 'auto', icon: Monitor, label: 'Auto' }
                        ].map((option) => {
                          const Icon = option.icon;
                          return (
                            <button
                              key={option.value}
                              onClick={() => setTheme(option.value as any)}
                              className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                                theme === option.value
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                              <span className="text-sm font-medium">{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Storage Settings */}
              {activeTab === 'storage' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Storage & Backup Configuration
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Data Retention Period (days)
                      </label>
                      <select
                        value={settings.retentionPeriod}
                        onChange={(e) => handleSettingChange('retentionPeriod', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      >
                        <option value={30}>30 days</option>
                        <option value={90}>90 days</option>
                        <option value={180}>180 days</option>
                        <option value={365}>1 year</option>
                        <option value={0}>Keep forever</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Automatic Backups
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Automatically backup system data and configurations
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.autoBackup}
                          onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {settings.autoBackup && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Backup Frequency
                        </label>
                        <select
                          value={settings.backupFrequency}
                          onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        >
                          <option value="hourly">Every hour</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;