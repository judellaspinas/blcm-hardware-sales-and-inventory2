import User from '../models/User.model.js';
import { generateToken } from '../utils/generateToken.js';

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Debug logging (remove in production if needed)
    if (process.env.NODE_ENV === 'development') {
      console.log('Login attempt:', { username, hasPassword: !!password });
    }

    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is inactive
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact an administrator.'
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      await user.save(); // Save auto-unlock if time passed
      
      if (user.accountLocked) {
        const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Account is locked. Try again in ${minutesLeft} minute(s)`,
          lockedUntil: user.lockedUntil
        });
      }
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      await user.incrementFailedAttempts();
      
      const attemptsLeft = 3 - user.failedLoginAttempts;
      return res.status(401).json({
        success: false,
        message: `Invalid credentials. ${attemptsLeft > 0 ? attemptsLeft + ' attempt(s) left.' : 'Account locked.'}`
      });
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await user.resetFailedAttempts();
    }

    const token = generateToken(user._id);

    // Check environment
    const isProduction = process.env.NODE_ENV === 'production';
    // Set httpOnly cookie (for web clients)
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Only send over HTTPS in production
      sameSite: isProduction ? 'none' : 'lax', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (matches JWT_EXPIRE)
    };

    res.cookie('token', token, cookieOptions);

    // Return token in response body for mobile clients
    // Web clients will use the cookie, mobile clients will use the token from body
    res.json({
      success: true,
      token, // Include token for mobile apps
      user: {
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
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res, next) => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('token', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      expires: new Date(0) // Expire immediately
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset locked account (Admin only)
 * @route   POST /api/auth/reset-account/:userId
 * @access  Private/Admin
 */
export const resetAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.resetFailedAttempts();

    res.json({
      success: true,
      message: 'Account unlocked successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { firstName, lastName, email, phone, username } = req.body;
    
    // Check if username is being updated and if it's already taken
    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
      user.username = username;
    }
    
    // Check if email is being updated and if it's already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
      user.email = email;
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
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
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    next(error);
  }
};

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password
 * @access  Private
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters'
      });
    }

    // Get user with password field
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

