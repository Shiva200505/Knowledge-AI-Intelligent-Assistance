import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'blue' | 'white' | 'gray';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = 'blue', 
  text,
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6', 
    large: 'w-8 h-8'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-400'
  };

  const borderClasses = {
    blue: 'border-blue-600/20 border-t-blue-600',
    white: 'border-white/20 border-t-white',
    gray: 'border-gray-400/20 border-t-gray-400'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className={`${sizeClasses[size]} border-2 rounded-full ${borderClasses[color]}`}
      />
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`mt-2 text-sm ${colorClasses[color]}`}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default LoadingSpinner;