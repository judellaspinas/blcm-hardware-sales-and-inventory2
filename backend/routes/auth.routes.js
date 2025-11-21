import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../utils/validationHandler.js';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
], authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', protect, authController.getMe);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', protect, authController.logout);

/**
 * @route   POST /api/auth/reset-account/:userId
 * @desc    Reset locked account (Admin only)
 * @access  Private/Admin
 */
router.post('/reset-account/:userId', protect, authorize('admin'), authController.resetAccount);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', [
  protect,
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().trim().isEmail().withMessage('Please provide a valid email address'),
  body('phone')
    .optional()
    .trim()
    .notEmpty().withMessage('Phone cannot be empty')
    .isLength({ max: 11 }).withMessage('Phone number must be maximum 11 digits')
    .matches(/^\d+$/).withMessage('Phone number must contain only digits'),
  body('username').optional().trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  handleValidationErrors
], authController.updateProfile);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password
 * @access  Private
 */
router.post('/reset-password', [
  protect,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  handleValidationErrors
], authController.resetPassword);

export default router;

