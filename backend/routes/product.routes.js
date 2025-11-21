import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../utils/validationHandler.js';
import * as productController from '../controllers/product.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/products
 * @desc    Get all products
 * @access  Private
 */
router.get('/', productController.getProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product
 * @access  Private
 */
router.get('/:id', productController.getProduct);

/**
 * @route   POST /api/products
 * @desc    Create new product (Admin or Supplier)
 * @access  Private/Admin/Supplier
 */
router.post('/', authorize('admin', 'supplier'), [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('price').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('markupPercentage').optional({ checkFalsy: true }).isFloat({ min: 0, max: 100 }).withMessage('Markup percentage must be between 0 and 100'),
  body('stockQuantity').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('supplier').optional().isMongoId().withMessage('Valid supplier ID is required'),
  handleValidationErrors
], productController.createProduct);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product (Admin or Supplier - suppliers can only update their own)
 * @access  Private/Admin/Supplier
 */
router.put('/:id', authorize('admin', 'supplier'), [
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('markupPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Markup percentage must be between 0 and 100'),
  body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('supplier').optional().isMongoId().withMessage('Valid supplier ID is required'),
  handleValidationErrors
], productController.updateProduct);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (Admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authorize('admin'), productController.deleteProduct);

export default router;

