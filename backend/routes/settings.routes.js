import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../utils/validationHandler.js';
import * as settingsController from '../controllers/settings.controller.js';

const router = express.Router();

/**
 * @route   GET /api/settings/password-format
 * @desc    Get default password format (public for login page)
 * @access  Public
 */
router.get('/password-format', settingsController.getPasswordFormat);

// All other routes require authentication
router.use(protect);

/**
 * @route   GET /api/settings/superadmin-code
 * @desc    Get SuperAdmin code status
 * @access  Private/Admin
 */
router.get('/superadmin-code', authorize('admin'), settingsController.getSuperAdminCode);

/**
 * @route   POST /api/settings/superadmin-code
 * @desc    Set or update SuperAdmin code
 * @access  Private/Admin
 * @note    Validation is handled in the controller since requirements differ based on whether code is already set
 */
router.post('/superadmin-code', authorize('admin'), settingsController.setSuperAdminCode);

/**
 * @route   POST /api/settings/verify-code
 * @desc    Verify SuperAdmin code
 * @access  Private
 */
router.post('/verify-code', [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('SuperAdmin code is required'),
  handleValidationErrors
], settingsController.verifySuperAdminCode);

/**
 * @route   POST /api/settings/password-format
 * @desc    Set default password format
 * @access  Private/Admin
 */
router.post('/password-format', authorize('admin'), [
  body('format')
    .trim()
    .notEmpty()
    .withMessage('Password format is required')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Password format must be one of: easy, medium, hard'),
  handleValidationErrors
], settingsController.setPasswordFormat);

/**
 * @route   DELETE /api/settings/superadmin-code
 * @desc    Reset SuperAdmin code (requires admin password)
 * @access  Private/Admin
 */
router.delete('/superadmin-code', authorize('admin'), [
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Admin password is required to reset the SuperAdmin code'),
  handleValidationErrors
], settingsController.resetSuperAdminCode);

export default router;

