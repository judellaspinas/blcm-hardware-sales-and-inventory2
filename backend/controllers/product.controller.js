import Product from '../models/Product.model.js';
import Supplier from '../models/Supplier.model.js';

/**
 * @desc    Get all products
 * @route   GET /api/products
 * @access  Private
 */
export const getProducts = async (req, res, next) => {
  try {
    const { category, supplier, lowStock, isActive } = req.query;
    const filter = {};

    if (supplier) {
      filter.supplier = supplier;
    }

    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$stockQuantity', '$lowStockThreshold'] };
    }

    const products = await Product.find(filter)
      .populate('supplier', 'companyName')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product
 * @route   GET /api/products/:id
 * @access  Private
 */
export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('supplier');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private/Admin
 */
export const createProduct = async (req, res, next) => {
  try {
    const supplierId = req.body.supplier;

    // Verify supplier exists
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    const productData = {
      ...req.body,
      supplier: supplierId
    };

    // Set default values for optional fields if not provided
    // This ensures they don't trigger validation errors
    if (!('price' in req.body) || productData.price === undefined || productData.price === null || productData.price === '') {
      productData.price = 0;
    }
    if (!('markupPercentage' in req.body) || productData.markupPercentage === undefined || productData.markupPercentage === null || productData.markupPercentage === '') {
      productData.markupPercentage = 0;
    }
    if (!('stockQuantity' in req.body) || productData.stockQuantity === undefined || productData.stockQuantity === null || productData.stockQuantity === '') {
      productData.stockQuantity = 0;
    }

    // Add initial pricing history entry
    productData.pricingHistory = [{
      basePrice: productData.price,
      markupPercentage: productData.markupPercentage,
      updatedAt: new Date()
    }];

    const product = await Product.create(productData);
    await product.populate('supplier', 'companyName');

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Verify supplier exists if they're trying to change it
    if (req.body.supplier) {
      const supplier = await Supplier.findById(req.body.supplier);
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found'
        });
      }
    }

    // Check if price or markupPercentage has changed
    const oldPrice = product.price || 0;
    const oldMarkupPercentage = product.markupPercentage || 0;
    const newPrice = req.body.price !== undefined ? parseFloat(req.body.price) || 0 : oldPrice;
    const newMarkupPercentage = req.body.markupPercentage !== undefined ? parseFloat(req.body.markupPercentage) || 0 : oldMarkupPercentage;

    // Track price changes in pricing history (use Number comparison to handle floating point precision)
    const priceChanged = Number(newPrice) !== Number(oldPrice) || Number(newMarkupPercentage) !== Number(oldMarkupPercentage);
    
    if (priceChanged) {
      // Initialize pricingHistory if it doesn't exist
      if (!product.pricingHistory || product.pricingHistory.length === 0) {
        product.pricingHistory = [{
          basePrice: oldPrice,
          markupPercentage: oldMarkupPercentage,
          updatedAt: product.createdAt || new Date()
        }];
      }
      
      // Add new pricing history entry
      product.pricingHistory.push({
        basePrice: newPrice,
        markupPercentage: newMarkupPercentage,
        updatedAt: new Date()
      });
      
      // Update the product with pricing history
      req.body.pricingHistory = product.pricingHistory;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('supplier', 'companyName');

    res.json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

