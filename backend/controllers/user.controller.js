import User from '../models/User.model.js';
import Settings from '../models/Settings.model.js';
import { generatePassword } from '../utils/generatePassword.js';

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new user
 * @route   POST /api/users
 * @access  Private/Admin
 */
export const createUser = async (req, res, next) => {
  try {
    const { username, firstName, lastName, email, phone, password, role } = req.body;

    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: userExists.username === username 
          ? 'Username already exists' 
          : 'Email already exists'
      });
    }

    // Generate default password if not provided based on configured format
    let userPassword = password;
    if (!userPassword) {
      // Get password format from settings
      const settings = await Settings.getSettings();
      const passwordFormat = settings.defaultPasswordFormat || 'medium';

      // Generate password based on format
      userPassword = generatePassword(passwordFormat, username, firstName, lastName);
      
      if (!userPassword) {
        // Determine which fields are missing based on format
        let missingFields = [];
        if (passwordFormat === 'easy' && !username) {
          missingFields.push('username');
        } else if ((passwordFormat === 'medium' || passwordFormat === 'hard') && (!firstName || !lastName)) {
          if (!firstName) missingFields.push('first name');
          if (!lastName) missingFields.push('last name');
        }
        
        return res.status(400).json({
          success: false,
          message: `Password is required. Please provide a password or ensure ${missingFields.join(' and ')} ${missingFields.length === 1 ? 'is' : 'are'} provided for ${passwordFormat} format.`
        });
      }
    }

    // Ensure password is set (fallback safety check)
    if (!userPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password is required. Please provide a password or ensure required fields are provided.'
      });
    }

    const user = await User.create({ 
      username, 
      firstName, 
      lastName, 
      email, 
      phone, 
      password: userPassword, 
      role,
      isActive: true // Default status to Active
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { firstName, lastName, email, phone, role, isActive } = req.body;
    
    // Check if email is being updated and if it's already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

