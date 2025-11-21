import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const settingsSchema = new mongoose.Schema({
  superAdminCode: {
    type: String,
    default: null,
    trim: true
  },
  totalCostOfGoods: {
    type: Number,
    default: 0,
    min: [0, 'Total cost of goods cannot be negative']
  },
  defaultPasswordFormat: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
    trim: true
  }
}, {
  timestamps: true
});

// Hash superAdminCode before saving
settingsSchema.pre('save', async function(next) {
  if (!this.isModified('superAdminCode')) return next();
  
  // If code is being set, hash it
  if (this.superAdminCode) {
    const salt = await bcrypt.genSalt(10);
    this.superAdminCode = await bcrypt.hash(this.superAdminCode, salt);
  }
  
  next();
});

// Method to verify superAdminCode
settingsSchema.methods.verifySuperAdminCode = async function(enteredCode) {
  if (!this.superAdminCode) {
    return false;
  }
  return await bcrypt.compare(enteredCode, this.superAdminCode);
};

// Static method to get or create settings (singleton pattern)
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model('Settings', settingsSchema);

