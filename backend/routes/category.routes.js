import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../utils/validationHandler.js';
import * as categoryController from '../controllers/category.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Private
 */
router.get('/', categoryController.getCategories);

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category
 * @access  Private
 */
router.get('/:id', categoryController.getCategory);

/**
 * @route   POST /api/categories
 * @desc    Create new category (Admin only)
 * @access  Private/Admin
 */
router.post('/', authorize('admin'), [
  body('name').trim().notEmpty().withMessage('Category name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Category name must be between 2 and 50 characters'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
  handleValidationErrors
], categoryController.createCategory);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category (Admin only)
 * @access  Private/Admin
 */
router.put('/:id', authorize('admin'), [
  body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty')
    .isLength({ min: 2, max: 50 }).withMessage('Category name must be between 2 and 50 characters'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
  handleValidationErrors
], categoryController.updateCategory);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category (Admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authorize('admin'), categoryController.deleteCategory);

export default router;

