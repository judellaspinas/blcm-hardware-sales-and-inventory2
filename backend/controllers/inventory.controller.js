import Product from '../models/Product.model.js';
import StockHistory from '../models/StockHistory.model.js';
import Settings from '../models/Settings.model.js';
import crypto from 'crypto';

/**
 * @desc    Get inventory status
 * @route   GET /api/inventory
 * @access  Private
 */
export const getInventory = async (req, res, next) => {
  try {
    const { lowStock } = req.query;
    const filter = { isActive: true };

    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$stockQuantity', '$lowStockThreshold'] };
    }

    const products = await Product.find(filter)
      .populate('supplier', 'companyName')
      .sort({ stockQuantity: 1 });

    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.stockQuantity <= p.lowStockThreshold).length;
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0).length;

    res.json({
      success: true,
      summary: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts
      },
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product stock
 * @route   PUT /api/inventory/:id/stock
 * @access  Private/Admin
 */
export const updateStock = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const { quantity, dateDelivered } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock quantity must be greater than 0'
      });
    }

    if (!dateDelivered) {
      return res.status(400).json({
        success: false,
        message: 'Date delivered is required'
      });
    }

    // Add stock quantity
    product.stockQuantity += parseInt(quantity);

    await product.save();
    await product.populate('supplier', 'companyName');

    // Calculate and track cost of goods (base price × quantity)
    // Base price is what company pays supplier
    const costOfGoods = product.price * parseInt(quantity);
    
    // Update total cost of goods in settings
    const settings = await Settings.getSettings();
    settings.totalCostOfGoods += costOfGoods;
    await settings.save();

    // Create stock history entry
    const randomString = crypto.randomBytes(4).toString('hex').toUpperCase();
    const transactionId = `STK-${Date.now()}-${randomString}`;
    await StockHistory.create({
      transactionId,
      product: product._id,
      productName: product.name,
      stockQuantity: parseInt(quantity),
      dateDelivered: new Date(dateDelivered),
      totalCost: costOfGoods,
      addedBy: req.user._id
    });

    res.json({
      success: true,
      data: product,
      message: 'Stock added successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product price and markup percentage
 * @route   PUT /api/inventory/:id/price
 * @access  Private/Admin
 */
export const updateProductPrice = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const { price, markupPercentage } = req.body;

    // Store old prices for history tracking
    const oldPrice = product.price || 0;
    const oldMarkupPercentage = product.markupPercentage || 0;
    let newPrice = oldPrice;
    let newMarkupPercentage = oldMarkupPercentage;

    if (price !== undefined) {
      if (price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price cannot be negative'
        });
      }
      newPrice = parseFloat(price);
      product.price = newPrice;
    }

    if (markupPercentage !== undefined) {
      if (markupPercentage < 0) {
        return res.status(400).json({
          success: false,
          message: 'Markup percentage cannot be negative'
        });
      }
      if (markupPercentage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Markup percentage cannot exceed 100%'
        });
      }
      newMarkupPercentage = parseFloat(markupPercentage);
      product.markupPercentage = newMarkupPercentage;
    }

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
    }

    await product.save();
    await product.populate('supplier', 'companyName');

    res.json({
      success: true,
      data: product,
      message: 'Product price updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get stock history
 * @route   GET /api/inventory/stock-history
 * @access  Private
 */
export const getStockHistory = async (req, res, next) => {
  try {
    const { search, sortBy = 'dateDelivered', sortOrder = 'desc', startDate, endDate } = req.query;
    
    const filter = {};

    // Search by product name or transaction ID
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.dateDelivered = {};
      if (startDate) {
        filter.dateDelivered.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.dateDelivered.$lte = end;
      }
    }

    // Sort options
    const sortOptions = {};
    if (sortBy === 'dateDelivered') {
      sortOptions.dateDelivered = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'createdAt') {
      sortOptions.createdAt = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.dateDelivered = -1; // Default sort
    }

    const stockHistory = await StockHistory.find(filter)
      .populate('product', 'name')
      .populate('addedBy', 'username firstName lastName')
      .sort(sortOptions);

    res.json({
      success: true,
      count: stockHistory.length,
      data: stockHistory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get low stock alerts
 * @route   GET /api/inventory/alerts
 * @access  Private
 */
export const getLowStockAlerts = async (req, res, next) => {
  try {
    const filter = {
      isActive: true,
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] }
    };

    const products = await Product.find(filter)
      .populate('supplier', 'companyName')
      .sort({ stockQuantity: 1 });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

