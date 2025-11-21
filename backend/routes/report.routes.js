import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import * as reportController from '../controllers/report.controller.js';

const router = express.Router();

// All routes require authentication and admin access
router.use(protect);
router.use(authorize('admin'));

/**
 * @route   GET /api/reports/sales
 * @desc    Get sales report
 * @access  Private/Admin
 */
router.get('/sales', reportController.getSalesReport);

/**
 * @route   GET /api/reports/inventory
 * @desc    Get inventory report
 * @access  Private/Admin
 */
router.get('/inventory', reportController.getInventoryReport);

/**
 * @route   GET /api/reports/top-products
 * @desc    Get top selling products
 * @access  Private/Admin
 */
router.get('/top-products', reportController.getTopProducts);

/**
 * @route   GET /api/reports/revenue-trends
 * @desc    Get revenue trends
 * @access  Private/Admin
 */
router.get('/revenue-trends', reportController.getRevenueTrends);

export default router;

