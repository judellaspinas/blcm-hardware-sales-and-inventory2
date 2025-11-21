import { useState, useEffect } from 'react';

const InputModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  inputLabel,
  inputType = 'number',
  inputPlaceholder = '',
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  variant = 'info',
  defaultValue = '',
  isLoading = false
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      button: 'bg-red-600 hover:bg-red-700 text-white',
      icon: '⚠️'
    },
    warning: {
      button: 'bg-orange-600 hover:bg-orange-700 text-white',
      icon: '⚠️'
    },
    info: {
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      icon: 'ℹ️'
    }
  };

  const styles = variantStyles[variant] || variantStyles.info;

  const handleConfirm = () => {
    if (inputValue !== '' && inputValue !== null && !isLoading) {
      onConfirm(inputValue);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      onClick={() => {
        if (!isLoading) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-4 mb-4">
          <div className="text-4xl">{styles.icon}</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
        </div>
        
        {message && <p className="text-gray-600 mb-4">{message}</p>}
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {inputLabel}
          </label>
          <input
            type={inputType === 'password' ? 'password' : inputType}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={inputPlaceholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            autoFocus
            autoComplete={inputType === 'password' ? 'new-password' : 'off'}
          />
        </div>
        
        <div className="flex space-x-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={inputValue === '' || inputValue === null || isLoading}
            className={`px-4 py-2 rounded-lg transition-colors font-medium ${
              inputValue === '' || inputValue === null || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : styles.button
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputModal;

