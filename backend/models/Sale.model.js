import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  subtotal: {
    type: Number,
    required: true
  }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    unique: true,
    required: true
  },
  customerName: {
    type: String,
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  customerPhone: {
    type: String,
    trim: true,
    maxlength: [11, 'Phone number must be maximum 11 digits'],
    match: [/^\d+$/, 'Phone number must contain only digits']
  },
  tinNumber: {
    type: String,
    trim: true
  },
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile_payment', 'other'],
    required: [true, 'Payment method is required']
  },
  cashRendered: {
    type: Number,
    min: [0, 'Cash rendered cannot be negative']
  },
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiptGenerated: {
    type: Boolean,
    default: false
  },
  isVoid: {
    type: Boolean,
    default: false
  },
  voidedAt: {
    type: Date
  },
  voidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
saleSchema.index({ saleNumber: 1 });
saleSchema.index({ createdAt: -1 });
saleSchema.index({ cashier: 1 });
// Compound indexes for common query patterns
saleSchema.index({ createdAt: -1, isVoid: 1 }); // For reports filtering by date and void status
saleSchema.index({ cashier: 1, createdAt: -1 }); // For cashier-specific queries with date sorting

export default mongoose.model('Sale', saleSchema);

