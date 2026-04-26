import React from 'react';

type Variant = 'edit' | 'save' | 'cancel' | 'danger' | 'primary';

interface ActionButtonProps {
  variant?: Variant;
  onClick?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  size?: 'sm' | 'md';
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  edit:    'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100',
  save:    'bg-green-600 text-white hover:bg-green-700',
  cancel:  'bg-gray-100 text-gray-700 hover:bg-gray-200',
  danger:  'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
};

export default function ActionButton({
  variant = 'primary',
  onClick,
  disabled,
  children,
  type = 'button',
  size = 'sm',
  className = '',
}: ActionButtonProps) {
  const sizeClasses = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg font-semibold transition-all disabled:opacity-60 ${sizeClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
