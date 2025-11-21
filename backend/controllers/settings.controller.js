import Settings from '../models/Settings.model.js';
import User from '../models/User.model.js';

/**
 * @desc    Get SuperAdmin code status
 * @route   GET /api/settings/superadmin-code
 * @access  Private/Admin
 */
export const getSuperAdminCode = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    
    res.json({
      success: true,
      data: {
        isSet: !!settings.superAdminCode,
        // Don't return the actual code for security
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set or update SuperAdmin code
 * @route   POST /api/settings/superadmin-code
 * @access  Private/Admin
 */
export const setSuperAdminCode = async (req, res, next) => {
  try {
    const { currentCode, newCode, confirmCode } = req.body;

    // Get or create settings
    const settings = await Settings.getSettings();
    const codeIsSet = !!settings.superAdminCode;

    // If code is already set, require current code verification
    if (codeIsSet) {
      if (!currentCode || !newCode || !confirmCode) {
        return res.status(400).json({
          success: false,
          message: 'Current code, new code, and confirm code are required'
        });
      }

      // Verify current code
      const isCurrentCodeValid = await settings.verifySuperAdminCode(currentCode);
      if (!isCurrentCodeValid) {
        return res.status(401).json({
          success: false,
          message: 'Current SuperAdmin code is incorrect'
        });
      }

      // Validate that new code and confirm code match
      if (newCode !== confirmCode) {
        return res.status(400).json({
          success: false,
          message: 'New code and confirm code do not match'
        });
      }

      // Use newCode for validation and setting
      const codeToSet = newCode;
      
      // Validate code format: must contain uppercase, lowercase, and digits
      const hasUpperCase = /[A-Z]/.test(codeToSet);
      const hasLowerCase = /[a-z]/.test(codeToSet);
      const hasDigits = /[0-9]/.test(codeToSet);

      if (!hasUpperCase || !hasLowerCase || !hasDigits) {
        return res.status(400).json({
          success: false,
          message: 'SuperAdmin code must contain uppercase letters, lowercase letters, and digits'
        });
      }

      // Validate minimum length
      if (codeToSet.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'SuperAdmin code must be at least 6 characters long'
        });
      }

      // Set the new code (will be hashed by pre-save hook)
      settings.superAdminCode = codeToSet;
      await settings.save();

      res.json({
        success: true,
        message: 'SuperAdmin code has been updated successfully',
        data: {
          isSet: true
        }
      });
    } else {
      // First time setting the code - only newCode is required
      if (!newCode) {
        return res.status(400).json({
          success: false,
          message: 'SuperAdmin code is required'
        });
      }

      // Validate code format: must contain uppercase, lowercase, and digits
      const hasUpperCase = /[A-Z]/.test(newCode);
      const hasLowerCase = /[a-z]/.test(newCode);
      const hasDigits = /[0-9]/.test(newCode);

      if (!hasUpperCase || !hasLowerCase || !hasDigits) {
        return res.status(400).json({
          success: false,
          message: 'SuperAdmin code must contain uppercase letters, lowercase letters, and digits'
        });
      }

      // Validate minimum length
      if (newCode.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'SuperAdmin code must be at least 6 characters long'
        });
      }

      // Set the code (will be hashed by pre-save hook)
      settings.superAdminCode = newCode;
      await settings.save();

      res.json({
        success: true,
        message: 'SuperAdmin code has been set successfully',
        data: {
          isSet: true
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify SuperAdmin code
 * @route   POST /api/settings/verify-code
 * @access  Private
 */
export const verifySuperAdminCode = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'SuperAdmin code is required'
      });
    }

    const settings = await Settings.getSettings();

    if (!settings.superAdminCode) {
      return res.status(400).json({
        success: false,
        message: 'SuperAdmin code has not been set'
      });
    }

    const isValid = await settings.verifySuperAdminCode(code);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid SuperAdmin code'
      });
    }

    res.json({
      success: true,
      message: 'SuperAdmin code verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get default password format
 * @route   GET /api/settings/password-format
 * @access  Private/Admin
 */
export const getPasswordFormat = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    
    res.json({
      success: true,
      data: {
        format: settings.defaultPasswordFormat || 'medium'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set default password format
 * @route   POST /api/settings/password-format
 * @access  Private/Admin
 */
export const setPasswordFormat = async (req, res, next) => {
  try {
    const { format } = req.body;

    if (!format) {
      return res.status(400).json({
        success: false,
        message: 'Password format is required'
      });
    }

    if (!['easy', 'medium', 'hard'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Password format must be one of: easy, medium, hard'
      });
    }

    const settings = await Settings.getSettings();
    settings.defaultPasswordFormat = format;
    await settings.save();

    res.json({
      success: true,
      message: 'Default password format has been updated successfully',
      data: {
        format: settings.defaultPasswordFormat
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset SuperAdmin code (requires admin password)
 * @route   DELETE /api/settings/superadmin-code
 * @access  Private/Admin
 */
export const resetSuperAdminCode = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Admin password is required to reset the SuperAdmin code'
      });
    }

    // Get the logged-in user with password field
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify the admin's password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. SuperAdmin code reset failed.'
      });
    }

    // Get settings and clear the SuperAdmin code
    const settings = await Settings.getSettings();
    settings.superAdminCode = null;
    await settings.save();

    res.json({
      success: true,
      message: 'SuperAdmin code has been reset successfully',
      data: {
        isSet: false
      }
    });
  } catch (error) {
    next(error);
  }
};

