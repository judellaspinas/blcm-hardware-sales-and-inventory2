import Sale from '../models/Sale.model.js';

/**
 * Generate unique sale number
 * Format: SALE-YYYYMMDD-XXXX (e.g., SALE-20241215-0001)
 */
export const generateSaleNumber = async () => {
  // Get current date in YYYYMMDD format (using local timezone)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Find all sales with the same date prefix
  const datePrefix = `SALE-${dateStr}-`;
  const existingSales = await Sale.find({
    saleNumber: { $regex: `^${datePrefix}` }
  }).select('saleNumber').lean();

  // Extract sequence numbers and find the maximum
  let maxSequence = 0;
  existingSales.forEach(sale => {
    const sequenceStr = sale.saleNumber.replace(datePrefix, '');
    const sequence = parseInt(sequenceStr, 10);
    if (!isNaN(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  });

  // Generate next sequence number
  const nextSequence = maxSequence + 1;
  return `${datePrefix}${String(nextSequence).padStart(4, '0')}`;
};

