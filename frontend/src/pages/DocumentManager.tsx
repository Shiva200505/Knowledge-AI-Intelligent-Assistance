import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Filter, 
  Search, 
  Download, 
  Trash2, 
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  X,
  Tag,
  Calendar,
  FileType,
  BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { axiosInstance } from '../contexts/AuthContext';

interface Document {
  id: string;
  filename: string;
  category: string;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  upload_date: string;
  file_size: number;
  page_count?: number;
  tags: string[];
}

const DocumentManager: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<any>(null);

  // Fetch documents from API
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/documents', {
        params: {
          category: filterCategory || undefined,
          status: filterStatus || undefined,
          limit: 100
        }
      });
      setDocuments(response.data);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus]);

  // Fetch documents on mount and when filters change
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Check URL parameters for direct document viewing from suggestions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewDocId = params.get('view');
    
    if (viewDocId && documents.length > 0) {
      const docToView = documents.find(doc => doc.id === viewDocId);
      if (docToView) {
        viewDocument(docToView.id);
        // Clear URL parameter after opening
        window.history.replaceState({}, '', '/documents');
      }
    }
  }, [documents]);

  const categories = [
    'Regulations',
    'Policies', 
    'Procedures',
    'Guidelines',
    'Forms',
    'Legal Documents',
    'Training Materials'
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'yellow' },
    { value: 'processing', label: 'Processing', color: 'blue' },
    { value: 'processed', label: 'Processed', color: 'green' },
    { value: 'failed', label: 'Failed', color: 'red' }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'processing': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFileUpload = useCallback(async () => {
    if (!selectedFiles || !uploadCategory) {
      toast.error('Please select files and category');
      return;
    }

    setUploading(true);
    
    // Show immediate toast for upload start
    const uploadToast = toast.loading(`Uploading ${selectedFiles.length} file(s)...`);
    
    const uploadPromises = Array.from(selectedFiles).map(async (file) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', uploadCategory);
        if (uploadTags) {
          formData.append('tags', uploadTags);
        }

        const response = await axiosInstance.post('/api/documents/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        return { success: true, filename: file.name, data: response.data };
      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);
        return { success: false, filename: file.name, error: error.message };
      }
    });

    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // Dismiss loading toast
    toast.dismiss(uploadToast);

    if (successCount > 0) {
      toast.success(
        `${successCount} file(s) uploaded! Processing in background...`, 
        { duration: 4000 }
      );
      
      // Immediate refresh to show "processing" status
      fetchDocuments();
      
      // Auto-refresh every 3 seconds for 30 seconds to catch processed documents
      let refreshCount = 0;
      const maxRefreshes = 10;
      const refreshInterval = setInterval(() => {
        refreshCount++;
        fetchDocuments();
        if (refreshCount >= maxRefreshes) {
          clearInterval(refreshInterval);
        }
      }, 3000);
    }
    
    if (failCount > 0) {
      toast.error(`${failCount} file(s) failed to upload`);
    }

    setShowUploadModal(false);
    setSelectedFiles(null);
    setUploadCategory('');
    setUploadTags('');
    setUploading(false);
  }, [selectedFiles, uploadCategory, uploadTags, fetchDocuments]);

  const viewDocument = async (id: string) => {
    try {
      const response = await axiosInstance.get(`/api/documents/${id}/view`);
      setViewingDocument(response.data);
      setShowViewModal(true);
    } catch (error: any) {
      console.error('Error viewing document:', error);
      toast.error('Failed to load document preview');
    }
  };

  const downloadDocument = async (id: string, filename: string) => {
    try {
      const response = await axiosInstance.get(`/api/documents/${id}/download`, {
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Document downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await axiosInstance.delete(`/api/documents/${id}`);
      toast.success('Document deleted successfully');
      // Refresh the documents list
      await fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery === '' || 
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = filterCategory === '' || doc.category === filterCategory;
    const matchesStatus = filterStatus === '' || doc.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStats = () => {
    const total = documents.length;
    const processed = documents.filter(d => d.status === 'processed').length;
    const processing = documents.filter(d => d.status === 'processing').length;
    const totalSize = documents.reduce((sum, doc) => sum + doc.file_size, 0);
    
    return { total, processed, processing, totalSize };
  };

  const stats = getStats();

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Document Manager
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Upload and manage your knowledge base documents
            </p>
          </div>
          
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Upload Documents
          </button>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Documents
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.processed}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Processed
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
                  {stats.processing}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Processing
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
                <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatFileSize(stats.totalSize)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Size
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents by name or tags..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Status</option>
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Documents List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-soft overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading documents...</p>
              </div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <FileText className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No documents found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                {searchQuery || filterCategory || filterStatus
                  ? "Try adjusting your filters or search query"
                  : "Upload your first document to get started"}
              </p>
              {!searchQuery && !filterCategory && !filterStatus && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Upload Documents
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDocuments.map((document, index) => (
              <motion.div
                key={document.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                      <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                        {document.filename}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{document.category}</span>
                        <span>{formatFileSize(document.file_size)}</span>
                        {document.page_count && (
                          <span>{document.page_count} pages</span>
                        )}
                        <span>{formatDate(document.upload_date)}</span>
                      </div>
                      
                      {document.tags.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <Tag className="w-3 h-3 text-gray-400" />
                          <div className="flex flex-wrap gap-1">
                            {document.tags.map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(document.status)}`}>
                      {getStatusIcon(document.status)}
                      {statusOptions.find(s => s.value === document.status)?.label}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => viewDocument(document.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="View document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => downloadDocument(document.id, document.filename)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="Download document"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteDocument(document.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            </div>
          )}
        </motion.div>

        {/* View Document Modal */}
        <AnimatePresence>
          {showViewModal && viewingDocument && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowViewModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {viewingDocument.filename}
                  </h2>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Document Metadata */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Category</div>
                      <div className="font-medium text-gray-900 dark:text-white">{viewingDocument.category}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
                      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingDocument.status)}`}>
                        {getStatusIcon(viewingDocument.status)}
                        {viewingDocument.status}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">File Size</div>
                      <div className="font-medium text-gray-900 dark:text-white">{formatFileSize(viewingDocument.file_size)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Upload Date</div>
                      <div className="font-medium text-gray-900 dark:text-white">{formatDate(viewingDocument.upload_date)}</div>
                    </div>
                    {viewingDocument.page_count && (
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Pages</div>
                        <div className="font-medium text-gray-900 dark:text-white">{viewingDocument.page_count}</div>
                      </div>
                    )}
                    {viewingDocument.word_count && (
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Words</div>
                        <div className="font-medium text-gray-900 dark:text-white">{viewingDocument.word_count}</div>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {viewingDocument.tags && viewingDocument.tags.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</div>
                      <div className="flex flex-wrap gap-2">
                        {viewingDocument.tags.map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content Preview */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content Preview</div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg max-h-96 overflow-y-auto">
                      <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-mono">
                        {viewingDocument.content_preview || 'No preview available'}
                      </pre>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => {
                        downloadDocument(viewingDocument.id, viewingDocument.filename);
                        setShowViewModal(false);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => setShowViewModal(false)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Modal */}
        <AnimatePresence>
          {showUploadModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowUploadModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Upload Documents
                  </h2>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Files
                    </label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setSelectedFiles(e.target.files)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select category...</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={uploadTags}
                      onChange={(e) => setUploadTags(e.target.value)}
                      placeholder="e.g., flood, insurance, florida"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => setShowUploadModal(false)}
                      disabled={uploading}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFileUpload}
                      disabled={!selectedFiles || !uploadCategory || uploading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DocumentManager;