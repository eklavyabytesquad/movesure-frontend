'use client';

import React from 'react';

interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  size?: 'sm' | 'md';
}

export default function FormInput({ label, size = 'md', className = '', ...props }: FormInputProps) {
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-1.5 text-sm rounded-lg'
      : 'px-4 py-2.5 text-sm rounded-xl';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">{label}</label>
      )}
      <input
        {...props}
        className={`w-full border border-gray-300 text-gray-900 placeholder-gray-400 bg-white
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition
          disabled:bg-gray-50 disabled:text-gray-400 ${sizeClasses} ${className}`}
      />
    </div>
  );
}
