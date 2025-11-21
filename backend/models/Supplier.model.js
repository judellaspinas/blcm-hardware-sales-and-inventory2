import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  companyEmail: {
    type: String,
    required: [true, 'Company email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  contactPosition: {
    type: String,
    required: [true, 'Contact position is required'],
    trim: true
  },
  contactDetails: {
    type: String,
    required: [true, 'Contact details are required'],
    trim: true
  },
  contactEmail: {
    type: String,
    required: [true, 'Contact email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  address: {
    brgy: {
      type: String,
      required: [true, 'Barangay is required'],
      trim: true
    },
    town: {
      type: String,
      required: [true, 'Town is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    province: {
      type: String,
      required: [true, 'Province is required'],
      trim: true
    },
    zipcode: {
      type: String,
      required: [true, 'Zipcode is required'],
      trim: true
    }
  },
  productSupplied: {
    type: String,
    required: [true, 'Product supplied is required'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Supplier', supplierSchema);

