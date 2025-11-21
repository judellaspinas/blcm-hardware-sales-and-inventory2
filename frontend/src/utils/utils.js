/**
 * Utility functions for common operations across the application
 */

/**
 * Formats a date object as YYYY-MM-DD in local timezone
 * @param {Date} date - The date object to format
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a currency value with PHP symbol and locale formatting
 * Used for PDF exports and detailed reports
 * @param {number|string} value - The numeric value to format
 * @returns {string} Formatted currency string (e.g., "PHP 1,234.56")
 */
export const formatCurrency = (value) => {
  const numValue = parseFloat(value) || 0;
  return `PHP ${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Formats a currency value for display with peso symbol
 * Used for UI display (simpler format)
 * @param {number|string} value - The numeric value to format
 * @returns {string} Formatted currency string (e.g., "₱1,234.56")
 */
export const formatCurrencyDisplay = (value) => {
  const numValue = parseFloat(value) || 0;
  return `₱${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Formats a payment method string to a human-readable format
 * @param {string} method - The payment method code
 * @returns {string} Formatted payment method name
 */
export const formatPaymentMethod = (method) => {
  const methods = {
    cash: 'Cash',
    card: 'Card',
    mobile_payment: 'Mobile Payment',
    other: 'Other'
  };
  return methods[method] || method;
};

/**
 * Formats a date to a localized date string
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '-';
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString();
};

