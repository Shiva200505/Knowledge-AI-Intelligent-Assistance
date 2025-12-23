import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  HelpCircle, 
  Search, 
  Book, 
  MessageCircle, 
  Phone, 
  Mail,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  FileText,
  Video,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'guide' | 'video' | 'document';
  url?: string;
}

const HelpSupport: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [supportTicket, setSupportTicket] = useState({
    subject: '',
    priority: 'medium',
    description: '',
    email: 'agent@company.com'
  });

  const faqs: FAQ[] = [
    {
      id: '1',
      question: 'How do I search for specific documents?',
      answer: 'Use the search bar on the main interface. You can search by keywords, document titles, or content. Use filters to narrow down results by category, date, or document type.',
      category: 'search'
    },
    {
      id: '2',
      question: 'How do I upload new documents to the system?',
      answer: 'Go to the Document Manager page, click "Upload Document", select your file, choose a category, add tags if needed, and click upload. Supported formats include PDF, DOC, DOCX, and TXT.',
      category: 'documents'
    },
    {
      id: '3',
      question: 'Why are suggestions not appearing?',
      answer: 'Ensure you\'re connected to the system (check the connection status). Try refreshing the page or check your case context information. If the issue persists, contact support.',
      category: 'suggestions'
    },
    {
      id: '4',
      question: 'How do I change my preferences?',
      answer: 'Click on your profile in the header, select "Preferences" from the dropdown menu. You can adjust notification settings, default search parameters, and display options.',
      category: 'account'
    },
    {
      id: '5',
      question: 'What should I do if a document fails to upload?',
      answer: 'Check the file format and size. Ensure the file isn\'t corrupted and is under 50MB. If the issue persists, try uploading a different format or contact technical support.',
      category: 'documents'
    }
  ];

  const helpArticles: HelpArticle[] = [
    {
      id: '1',
      title: 'Getting Started Guide',
      description: 'Complete walkthrough for new users',
      category: 'getting-started',
      type: 'guide'
    },
    {
      id: '2',
      title: 'Advanced Search Techniques',
      description: 'Learn powerful search strategies',
      category: 'search',
      type: 'video'
    },
    {
      id: '3',
      title: 'Document Management Best Practices',
      description: 'Organize and manage your documents effectively',
      category: 'documents',
      type: 'guide'
    },
    {
      id: '4',
      title: 'System Requirements',
      description: 'Technical specifications and compatibility',
      category: 'technical',
      type: 'document'
    }
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'search', label: 'Search & Discovery' },
    { value: 'documents', label: 'Document Management' },
    { value: 'suggestions', label: 'AI Suggestions' },
    { value: 'account', label: 'Account & Preferences' },
    { value: 'technical', label: 'Technical Support' }
  ];

  const filteredFaqs = faqs.filter(faq => 
    (selectedCategory === 'all' || faq.category === selectedCategory) &&
    (searchQuery === '' || 
     faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
     faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const filteredArticles = helpArticles.filter(article =>
    selectedCategory === 'all' || article.category === selectedCategory
  );

  const handleSupportTicket = () => {
    if (!supportTicket.subject || !supportTicket.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Simulate ticket submission
    toast.success('Support ticket submitted successfully');
    setSupportTicket({
      subject: '',
      priority: 'medium',
      description: '',
      email: 'agent@company.com'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      default: return <Book className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Help & Support
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Find answers to your questions and get the help you need
          </p>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search help articles and FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            <div className="md:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - FAQs */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Frequently Asked Questions
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredFaqs.length === 0 ? (
                  <div className="p-6 text-center">
                    <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No FAQs found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Try adjusting your search or category filter
                    </p>
                  </div>
                ) : (
                  filteredFaqs.map((faq) => (
                    <div key={faq.id} className="p-6">
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white pr-4">
                          {faq.question}
                        </h3>
                        {expandedFaq === faq.id ? (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                      
                      {expandedFaq === faq.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 text-gray-600 dark:text-gray-300 leading-relaxed"
                        >
                          {faq.answer}
                        </motion.div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Help Articles */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft mt-6">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Help Articles & Guides
                </h2>
              </div>
              
              <div className="p-6">
                <div className="grid gap-4">
                  {filteredArticles.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
                          {getTypeIcon(article.type)}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {article.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          {article.description}
                        </p>
                      </div>
                      
                      <ExternalLink className="w-5 h-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Contact Support */}
          <div className="space-y-6">
            {/* Quick Contact */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Quick Contact
              </h2>
              
              <div className="space-y-4">
                <a
                  href="tel:+1-800-SUPPORT"
                  className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Phone Support</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">+1-800-SUPPORT</div>
                  </div>
                </a>
                
                <a
                  href="mailto:support@company.com"
                  className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Email Support</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">support@company.com</div>
                  </div>
                </a>
                
                <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Live Chat</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Available 24/7</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Ticket */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Submit Support Ticket
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={supportTicket.subject}
                    onChange={(e) => setSupportTicket({...supportTicket, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Brief description of your issue"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={supportTicket.priority}
                    onChange={(e) => setSupportTicket({...supportTicket, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={supportTicket.description}
                    onChange={(e) => setSupportTicket({...supportTicket, description: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Detailed description of your issue..."
                  />
                </div>
                
                <button
                  onClick={handleSupportTicket}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HelpSupport;