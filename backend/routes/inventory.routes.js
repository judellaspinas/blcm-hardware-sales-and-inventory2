import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../utils/validationHandler.js';
import * as inventoryController from '../controllers/inventory.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/inventory
 * @desc    Get inventory status
 * @access  Private
 */
router.get('/', inventoryController.getInventory);

/**
 * @route   PUT /api/inventory/:id/stock
 * @desc    Update product stock (Admin or Supplier - suppliers can only update their own)
 * @access  Private/Admin/Supplier
 */
router.put('/:id/stock', authorize('admin', 'supplier'), [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('dateDelivered').notEmpty().withMessage('Date delivered is required'),
  handleValidationErrors
], inventoryController.updateStock);

/**
 * @route   PUT /api/inventory/:id/price
 * @desc    Update product price and markup percentage
 * @access  Private/Admin
 */
router.put('/:id/price', authorize('admin'), [
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('markupPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Markup percentage must be between 0 and 100'),
  handleValidationErrors
], inventoryController.updateProductPrice);

/**
 * @route   GET /api/inventory/stock-history
 * @desc    Get stock history
 * @access  Private
 */
router.get('/stock-history', inventoryController.getStockHistory);

/**
 * @route   GET /api/inventory/alerts
 * @desc    Get low stock alerts
 * @access  Private
 */
router.get('/alerts', inventoryController.getLowStockAlerts);

export default router;

