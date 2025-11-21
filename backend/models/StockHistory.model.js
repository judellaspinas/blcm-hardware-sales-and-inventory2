import mongoose from 'mongoose';

const stockHistorySchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  stockQuantity: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [1, 'Stock quantity must be at least 1']
  },
  dateDelivered: {
    type: Date,
    required: [true, 'Date delivered is required']
  },
  totalCost: {
    type: Number,
    required: true,
    min: [0, 'Total cost cannot be negative']
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
stockHistorySchema.index({ transactionId: 1 });
stockHistorySchema.index({ product: 1 });
stockHistorySchema.index({ dateDelivered: -1 });
stockHistorySchema.index({ productName: 1 });
stockHistorySchema.index({ createdAt: -1 });

export default mongoose.model('StockHistory', stockHistorySchema);

