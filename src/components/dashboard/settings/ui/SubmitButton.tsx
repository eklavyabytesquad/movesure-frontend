import React from 'react';

interface SubmitButtonProps {
  loading?: boolean;
  disabled?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export default function SubmitButton({
  loading,
  disabled,
  loadingText,
  children,
  fullWidth,
  className = '',
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`${fullWidth ? 'w-full' : ''} px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl
        hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 transition-all ${className}`}
    >
      {loading ? (loadingText ?? 'Saving…') : children}
    </button>
  );
}
