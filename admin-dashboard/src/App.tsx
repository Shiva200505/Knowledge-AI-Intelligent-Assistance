import React, { useState, useEffect } from 'react';
import { Upload, FileText, Settings, BarChart3, Trash2, Eye, Download } from 'lucide-react';

interface Document {
  id: string;
  filename: string;
  category: string;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  upload_date: string;
  file_size: number;
  page_count?: number;
}

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadCategory, setUploadCategory] = useState('');

  const categories = [
    'Regulations',
    'Policies',
    'Procedures',
    'Guidelines',
    'Forms',
    'Legal Documents'
  ];

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFiles || !uploadCategory) {
      alert('Please select files and category');
      return;
    }

    setLoading(true);
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', uploadCategory);
      formData.append('tags', 'admin-upload');

      try {
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          console.log(`Uploaded: ${file.name}`);
        } else {
          console.error(`Failed to upload: ${file.name}`);
        }
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
      }
    }

    setLoading(false);
    setSelectedFiles(null);
    setUploadCategory('');
    await fetchDocuments();
    alert('Upload completed!');
  };

  const deleteDocument = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        const response = await fetch(`/api/documents/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await fetchDocuments();
          alert('Document deleted successfully');
        } else {
          alert('Failed to delete document');
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Error deleting document');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Knowledge System Admin
          </h1>
          <p className="text-gray-600">
            Manage documents and system configuration
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {documents.length}
                </div>
                <div className="text-sm text-gray-600">Total Documents</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {documents.filter(d => d.status === 'processed').length}
                </div>
                <div className="text-sm text-gray-600">Processed</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Settings className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {documents.filter(d => d.status === 'processing').length}
                </div>
                <div className="text-sm text-gray-600">Processing</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Upload className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {categories.length}
                </div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg p-6 shadow mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Upload Documents
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Files
              </label>
              <input
                type="file"
                multiple
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select category...</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleFileUpload}
              disabled={!selectedFiles || !uploadCategory || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {loading ? 'Uploading...' : 'Upload Documents'}
            </button>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Documents ({documents.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <div key={doc.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {doc.filename}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{doc.category}</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        {doc.page_count && <span>{doc.page_count} pages</span>}
                        <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-green-600 rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteDocument(doc.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {documents.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No documents uploaded yet
              </h3>
              <p className="text-gray-600">
                Upload your first document using the form above
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;