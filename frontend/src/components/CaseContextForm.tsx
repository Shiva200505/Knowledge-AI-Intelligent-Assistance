import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, X, Plus, AlertTriangle } from 'lucide-react';

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

interface CaseContextFormProps {
  context: CaseContext;
  onChange: (context: Partial<CaseContext>) => void;
  className?: string;
}

const CaseContextForm: React.FC<CaseContextFormProps> = ({ context, onChange, className }) => {
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const caseTypes = [
    'Auto Insurance',
    'Property Insurance',
    'Flood Insurance',
    'Health Insurance',
    'Life Insurance',
    'Workers Compensation',
    'Liability Insurance',
    'Disability Insurance'
  ];

  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  const statuses = [
    'New',
    'In Review',
    'Investigation',
    'Pending Documentation',
    'Approved',
    'Denied',
    'Closed',
    'Appeal',
    'Legal Review'
  ];

  const priorities = ['Low', 'Medium', 'High', 'Urgent', 'Critical'];

  const customerTypes = [
    'Individual',
    'Small Business',
    'Enterprise',
    'Government',
    'Non-Profit'
  ];

  const policyTypes = [
    'Basic Coverage',
    'Comprehensive',
    'Premium',
    'Commercial',
    'Personal',
    'Group Policy'
  ];

  const handleInputChange = (field: keyof CaseContext, value: any) => {
    // Clear any existing error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    onChange({ [field]: value });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!context.case_id.trim()) {
      newErrors.case_id = 'Case ID is required';
    }

    if (!context.case_type.trim()) {
      newErrors.case_type = 'Case type is required';
    }

    if (context.claim_amount && context.claim_amount < 0) {
      newErrors.claim_amount = 'Claim amount must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addTag = () => {
    if (newTag.trim() && !context.tags?.includes(newTag.trim())) {
      const updatedTags = [...(context.tags || []), newTag.trim()];
      onChange({ tags: updatedTags });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = context.tags?.filter(tag => tag !== tagToRemove) || [];
    onChange({ tags: updatedTags });
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`space-y-4 ${className}`}
    >
      {/* Case ID and Type - Required Fields */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Case ID *
          </label>
          <input
            type="text"
            value={context.case_id}
            onChange={(e) => handleInputChange('case_id', e.target.value)}
            placeholder="e.g., CLM-2024-001234"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.case_id ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.case_id && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {errors.case_id}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Case Type *
          </label>
          <select
            value={context.case_type}
            onChange={(e) => handleInputChange('case_type', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.case_type ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select case type...</option>
            {caseTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {errors.case_type && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {errors.case_type}
            </p>
          )}
        </div>
      </div>

      {/* State and Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            State/Jurisdiction
          </label>
          <select
            value={context.state || ''}
            onChange={(e) => handleInputChange('state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Select state...</option>
            {states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            value={context.status || ''}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Select status...</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Priority and Customer Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Priority
          </label>
          <select
            value={context.priority || ''}
            onChange={(e) => handleInputChange('priority', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Select priority...</option>
            {priorities.map(priority => (
              <option key={priority} value={priority.toLowerCase()}>{priority}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Customer Type
          </label>
          <select
            value={context.customer_type || ''}
            onChange={(e) => handleInputChange('customer_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Select customer type...</option>
            {customerTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Policy Type and Claim Amount */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Policy Type
          </label>
          <select
            value={context.policy_type || ''}
            onChange={(e) => handleInputChange('policy_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Select policy type...</option>
            {policyTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Claim Amount ($)
          </label>
          <input
            type="number"
            value={context.claim_amount || ''}
            onChange={(e) => handleInputChange('claim_amount', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.claim_amount ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.claim_amount && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {errors.claim_amount}
            </p>
          )}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tags
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, addTag)}
            placeholder="Add a tag..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
          />
          <button
            type="button"
            onClick={addTag}
            disabled={!newTag.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {context.tags && context.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {context.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-xs"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={validateForm}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          Update Context
        </button>
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="font-medium mb-1">💡 Tip:</p>
        <p>The more context you provide, the better the AI suggestions. Case ID and Type are required for intelligent document matching.</p>
      </div>
    </motion.div>
  );
};

export default CaseContextForm;