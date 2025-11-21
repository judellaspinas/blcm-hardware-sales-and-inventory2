import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../utils/validationHandler.js';
import * as supplierController from '../controllers/supplier.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/suppliers
 * @desc    Get all suppliers
 * @access  Private
 */
router.get('/', supplierController.getSuppliers);

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get single supplier
 * @access  Private
 */
router.get('/:id', supplierController.getSupplier);

/**
 * @route   POST /api/suppliers
 * @desc    Create new supplier (Admin only)
 * @access  Private/Admin
 */
router.post('/', authorize('admin'), [
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body('companyEmail').trim().isEmail().withMessage('Please provide a valid email address'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('contactPosition').trim().notEmpty().withMessage('Contact position is required'),
  body('contactDetails').trim().notEmpty().withMessage('Contact details are required'),
  body('contactEmail').trim().isEmail().withMessage('Please provide a valid contact email address'),
  body('address.brgy').trim().notEmpty().withMessage('Barangay is required'),
  body('address.town').trim().notEmpty().withMessage('Town is required'),
  body('address.city').trim().notEmpty().withMessage('City is required'),
  body('address.province').trim().notEmpty().withMessage('Province is required'),
  body('address.zipcode').trim().notEmpty().withMessage('Zipcode is required'),
  body('productSupplied').trim().notEmpty().withMessage('Product supplied is required'),
  handleValidationErrors
], supplierController.createSupplier);

/**
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier (Admin only)
 * @access  Private/Admin
 */
router.put('/:id', authorize('admin'), [
  body('companyName').optional().trim().notEmpty().withMessage('Company name cannot be empty'),
  body('companyEmail').optional().trim().isEmail().withMessage('Please provide a valid email address'),
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('contactPosition').optional().trim().notEmpty().withMessage('Contact position cannot be empty'),
  body('contactDetails').optional().trim().notEmpty().withMessage('Contact details cannot be empty'),
  body('contactEmail').optional().trim().isEmail().withMessage('Please provide a valid contact email address'),
  body('address.brgy').optional().trim().notEmpty().withMessage('Barangay cannot be empty'),
  body('address.town').optional().trim().notEmpty().withMessage('Town cannot be empty'),
  body('address.city').optional().trim().notEmpty().withMessage('City cannot be empty'),
  body('address.province').optional().trim().notEmpty().withMessage('Province cannot be empty'),
  body('address.zipcode').optional().trim().notEmpty().withMessage('Zipcode cannot be empty'),
  body('productSupplied').optional().trim().notEmpty().withMessage('Product supplied cannot be empty'),
  handleValidationErrors
], supplierController.updateSupplier);

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Delete supplier (Admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authorize('admin'), supplierController.deleteSupplier);

export default router;

