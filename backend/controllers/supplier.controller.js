import Supplier from '../models/Supplier.model.js';

/**
 * @desc    Get all suppliers
 * @route   GET /api/suppliers
 * @access  Private
 */
export const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find()
      .sort({ companyName: 1 });
    
    res.json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single supplier
 * @route   GET /api/suppliers/:id
 * @access  Private
 */
export const getSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new supplier
 * @route   POST /api/suppliers
 * @access  Private/Admin
 */
export const createSupplier = async (req, res, next) => {
  try {
    const { 
      firstName, 
      lastName, 
      companyName, 
      companyEmail, 
      contactPosition, 
      contactDetails, 
      contactEmail,
      address,
      productSupplied,
      isActive 
    } = req.body;

    // Create supplier record
    const supplier = await Supplier.create({
      firstName,
      lastName,
      companyName,
      companyEmail,
      contactPosition,
      contactDetails,
      contactEmail,
      address,
      productSupplied,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update supplier
 * @route   PUT /api/suppliers/:id
 * @access  Private/Admin
 */
export const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete supplier
 * @route   DELETE /api/suppliers/:id
 * @access  Private/Admin
 */
export const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Delete supplier record
    await Supplier.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

