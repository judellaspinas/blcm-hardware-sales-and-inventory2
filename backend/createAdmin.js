import mongoose from 'mongoose';
import User from './models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blcm');
    console.log('Connected to MongoDB');
    
    const adminExists = await User.findOne({ username: 'admin' });
    if (adminExists) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Password will be hashed by the pre-save hook
    const admin = await User.create({
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@blcm.com',
      phone: '1234567890',
      password: 'Admin@123', // Will be hashed automatically
      role: 'admin'
    });

    console.log('✅ Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: Admin@123');
    console.log('⚠️  Please change the password after first login!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();

