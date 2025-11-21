import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  subCategories: {
    type: [String],
    default: [],
    set: function(subCategories) {
      // Trim and filter out empty strings
      return subCategories
        .map(subCat => subCat?.trim())
        .filter(subCat => subCat && subCat.length > 0);
    },
    validate: {
      validator: function(subCategories) {
        // Each sub-category should be a non-empty string
        return subCategories.every(subCat => subCat && subCat.trim().length > 0);
      },
      message: 'Sub-categories must be non-empty strings'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
categorySchema.index({ name: 1 });
categorySchema.index({ isActive: 1 });

export default mongoose.model('Category', categorySchema);

