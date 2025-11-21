import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
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
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    maxlength: [11, 'Phone number must be maximum 11 digits'],
    match: [/^\d+$/, 'Phone number must contain only digits']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },
  role: {
    type: String,
    enum: ['admin', 'staff'],
    default: 'staff',
    required: true
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLocked: {
    type: Boolean,
    default: false
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to increment failed login attempts
userSchema.methods.incrementFailedAttempts = async function() {
  this.failedLoginAttempts += 1;
  
  if (this.failedLoginAttempts >= 3) {
    this.accountLocked = true;
    // Lock for 30 minutes
    this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  
  await this.save();
};

// Method to reset failed attempts
userSchema.methods.resetFailedAttempts = async function() {
  this.failedLoginAttempts = 0;
  this.accountLocked = false;
  this.lockedUntil = null;
  await this.save();
};

// Check if account is still locked
userSchema.methods.isAccountLocked = function() {
  if (!this.accountLocked) return false;
  
  if (this.lockedUntil && this.lockedUntil > new Date()) {
    return true;
  }
  
  // Auto-unlock if lock period has passed
  this.accountLocked = false;
  this.lockedUntil = null;
  this.failedLoginAttempts = 0;
  return false;
};

export default mongoose.model('User', userSchema);

