'use client';

/**
 * Reusable confirmation modal component
 * Used throughout admin UI for confirmations
 */

import { useState, useEffect } from 'react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'blue', // blue, red, green
  showInput = false,
  inputLabel = '',
  inputPlaceholder = '',
  inputRequired = false,
  inputMinLength = 0,
}) {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset input when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (showInput && inputRequired && !inputValue.trim()) {
      alert(inputLabel || 'This field is required');
      return;
    }

    if (showInput && inputMinLength > 0 && inputValue.trim().length < inputMinLength) {
      alert(`Minimum ${inputMinLength} characters required`);
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirm(showInput ? inputValue.trim() : null);
      onClose();
    } catch (error) {
      console.error('Confirm action error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !showInput) {
      handleConfirm();
    }
  };

  const colorClasses = {
    blue: {
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      text: 'text-blue-600',
    },
    red: {
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      text: 'text-red-600',
    },
    green: {
      button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
      text: 'text-green-600',
    },
  };

  const colors = colorClasses[confirmColor] || colorClasses.blue;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Modal Content */}
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              {/* Icon */}
              <div
                className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
                  confirmColor === 'red'
                    ? 'bg-red-100'
                    : confirmColor === 'green'
                    ? 'bg-green-100'
                    : 'bg-blue-100'
                } sm:mx-0 sm:h-10 sm:w-10`}
              >
                <span className="text-2xl">
                  {confirmColor === 'red' ? '⚠️' : confirmColor === 'green' ? '✓' : 'ℹ️'}
                </span>
              </div>

              {/* Content */}
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                <h3
                  className="text-lg font-semibold leading-6 text-gray-900"
                  id="modal-title"
                >
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">{message}</p>
                </div>

                {/* Optional Input Field */}
                {showInput && (
                  <div className="mt-4">
                    {inputLabel && (
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {inputLabel}
                        {inputRequired && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    )}
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={inputPlaceholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      disabled={isProcessing}
                    />
                    {inputMinLength > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {inputValue.length} / {inputMinLength} characters minimum
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`inline-flex w-full justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm ${colors.button} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto`}
            >
              {isProcessing ? 'Processing...' : confirmText}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
