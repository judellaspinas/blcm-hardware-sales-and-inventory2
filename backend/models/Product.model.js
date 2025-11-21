import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'Price cannot be negative']
  },
  markupPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Markup percentage cannot be negative'],
    max: [100, 'Markup percentage cannot exceed 100%']
  },
  stockQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Stock quantity cannot be negative']
  },
  category: {
    type: String,
    trim: true
  },
  unit: {
    type: String,
    trim: true
  },
  subCategory: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    min: [0, 'Amount cannot be negative']
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier is required']
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: [0, 'Low stock threshold cannot be negative']
  },
  sku: {
    type: String,
    unique: true,
    trim: true,
    sparse: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  pricingHistory: [{
    basePrice: {
      type: Number,
      required: true,
      min: [0, 'Base price cannot be negative']
    },
    markupPercentage: {
      type: Number,
      required: true,
      min: [0, 'Markup percentage cannot be negative'],
      max: [100, 'Markup percentage cannot exceed 100%']
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Virtual for calculating markup amount
productSchema.virtual('markupAmount').get(function() {
  return (this.price || 0) * ((this.markupPercentage || 0) / 100);
});

// Virtual for calculating total price (base price + markup amount)
productSchema.virtual('totalPrice').get(function() {
  const basePrice = this.price || 0;
  const markupAmount = basePrice * ((this.markupPercentage || 0) / 100);
  return basePrice + markupAmount;
});

// Ensure virtual fields are included in JSON output
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// Index for faster queries
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ unit: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ supplier: 1 });
// Compound indexes for common query patterns
productSchema.index({ isActive: 1, category: 1 }); // For filtered product listings
productSchema.index({ stockQuantity: 1, lowStockThreshold: 1 }); // For low stock queries
productSchema.index({ isActive: 1, supplier: 1 }); // For supplier-specific active products

export default mongoose.model('Product', productSchema);

