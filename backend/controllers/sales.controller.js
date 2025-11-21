import Sale from '../models/Sale.model.js';
import Product from '../models/Product.model.js';
import Settings from '../models/Settings.model.js';
import { generateSaleNumber } from '../utils/generateSaleNumber.js';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

/**
 * @desc    Get all sales
 * @route   GET /api/sales
 * @access  Private
 */
export const getSales = async (req, res, next) => {
  try {
    const { startDate, endDate, cashier, isVoid, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        // Parse date string (YYYY-MM-DD) and set to local midnight
        const [year, month, day] = startDate.split('-').map(Number);
        const start = new Date(year, month - 1, day, 0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        // Parse date string (YYYY-MM-DD) and set to local end of day
        const [year, month, day] = endDate.split('-').map(Number);
        const end = new Date(year, month - 1, day, 23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (cashier) filter.cashier = cashier;

    // Filter by void status if provided
    if (isVoid !== undefined) {
      filter.isVoid = isVoid === 'true' || isVoid === true;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Use Promise.all for parallel execution
    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .populate('cashier', 'username')
        .populate('items.product', 'name price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Sale.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: sales.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: sales
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single sale
 * @route   GET /api/sales/:id
 * @access  Private
 */
export const getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('cashier', 'username')
      .populate('items.product');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new sale
 * @route   POST /api/sales
 * @access  Private/Supplier/Staff
 */
export const createSale = async (req, res, next) => {
  try {
    const { items, paymentMethod, customerName, customerEmail, customerPhone, tinNumber, cashRendered } = req.body;

    // Fetch all products at once to avoid N+1 query problem
    const productIds = items.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    // Validate all products exist
    if (products.length !== items.length) {
      const foundIds = products.map(p => p._id.toString());
      const missingId = productIds.find(id => !foundIds.includes(id.toString()));
      return res.status(404).json({
        success: false,
        message: `Product with ID ${missingId} not found`
      });
    }

    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Validate stock and calculate totals
    let subtotal = 0;
    const saleItems = [];

    for (const item of items) {
      const product = productMap.get(item.product.toString());
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.product} not found`
        });
      }

      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`
        });
      }

      // Selling price = base price + (base price * markup percentage / 100)
      // Total cost = base price + (base price * markup percentage)
      const basePrice = product.price || 0;
      const markupPercentage = product.markupPercentage || 0;
      const sellingPrice = basePrice + (basePrice * (markupPercentage / 100));
      const itemSubtotal = sellingPrice * item.quantity;
      subtotal += itemSubtotal;

      saleItems.push({
        product: product._id,
        quantity: item.quantity,
        price: sellingPrice,
        subtotal: itemSubtotal
      });

      // Update product stock in memory
      product.stockQuantity -= item.quantity;
    }

    // Bulk update all products at once
    await Promise.all(products.map(product => product.save()));

    // Calculate VAT (12%)
    const vatRate = 0.12;
    const discount = 0; // No discount
    const tax = subtotal * vatRate;
    const total = subtotal + tax;

    const saleNumber = await generateSaleNumber();

    const sale = await Sale.create({
      saleNumber,
      customerName,
      customerEmail,
      customerPhone,
      tinNumber,
      items: saleItems,
      subtotal,
      discount: 0, // No discount
      tax, // 12% VAT
      total,
      paymentMethod,
      cashRendered: paymentMethod === 'cash' ? cashRendered : undefined,
      cashier: req.user._id,
      receiptGenerated: true
    });

    await sale.populate('cashier', 'username');
    await sale.populate('items.product', 'name price');

    res.status(201).json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Void a sale (revert stock and mark as void)
 * @route   PATCH /api/sales/:id/void
 * @access  Private/Admin/Staff
 */
export const voidSale = async (req, res, next) => {
  try {
    const { superAdminCode } = req.body;

    // Verify SuperAdmin code
    const settings = await Settings.getSettings();
    
    if (!settings.superAdminCode) {
      return res.status(400).json({
        success: false,
        message: 'SuperAdmin code has not been set. Please contact an administrator.'
      });
    }

    if (!superAdminCode) {
      return res.status(400).json({
        success: false,
        message: 'SuperAdmin code is required to void a sale'
      });
    }

    const isValidCode = await settings.verifySuperAdminCode(superAdminCode);
    
    if (!isValidCode) {
      return res.status(401).json({
        success: false,
        message: 'Invalid SuperAdmin code'
      });
    }

    const sale = await Sale.findById(req.params.id)
      .populate('items.product', 'name stockQuantity');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.isVoid) {
      return res.status(400).json({
        success: false,
        message: 'Sale is already voided'
      });
    }

    // Revert stock quantities for all products in the sale (bulk operation)
    const productIds = sale.items.map(item => {
      return item.product._id || item.product;
    });
    
    const products = await Product.find({ _id: { $in: productIds } });
    
    if (products.length !== productIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more products not found'
      });
    }

    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p._id.toString(), p]));
    
    // Update stock quantities in memory
    for (const item of sale.items) {
      const productId = (item.product._id || item.product).toString();
      const product = productMap.get(productId);
      
      if (product) {
        product.stockQuantity += item.quantity;
      }
    }

    // Bulk update all products at once
    await Promise.all(products.map(product => product.save()));

    // Mark sale as void
    sale.isVoid = true;
    sale.voidedAt = new Date();
    sale.voidedBy = req.user._id;
    await sale.save();

    await sale.populate('cashier', 'username');
    await sale.populate('voidedBy', 'username');
    await sale.populate('items.product', 'name price');

    res.json({
      success: true,
      message: 'Sale voided successfully. Stock quantities have been restored.',
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Format currency for PDF
 */
const formatCurrency = (value) => {
  const numValue = parseFloat(value) || 0;
  return `PHP ${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format payment method
 */
const formatPaymentMethod = (method) => {
  const methods = {
    cash: 'Cash',
    card: 'Card',
    mobile_payment: 'Mobile Payment',
    other: 'Other'
  };
  return methods[method] || method;
};

/**
 * @desc    Export sale receipt as PDF
 * @route   GET /api/sales/:id/pdf
 * @access  Private
 */
export const exportSalePDF = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('cashier', 'username')
      .populate('items.product');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let yPosition = margin;

    // Header - matching modal style
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('BLCM Sales and Inventory System', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Sales Receipt', pageWidth / 2, yPosition, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPosition += 8;

    // Draw a line separator
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Receipt Details
    doc.setFontSize(9);
    const saleNumberLabel = 'Sale Number:';
    const saleNumberValue = sale.saleNumber;
    doc.text(saleNumberLabel, margin, yPosition);
    doc.text(saleNumberValue, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 6;
    
    const transactionDate = new Date(sale.createdAt);
    const dateLabel = 'Transaction Date:';
    const dateValue = transactionDate.toLocaleString();
    doc.text(dateLabel, margin, yPosition);
    doc.text(dateValue, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 10;

    // Customer Details Section
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('Customer Details', margin, yPosition);
    yPosition += 8;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    // Display customer fields in order: Name, Contact Number, TIN Number, Email
    let hasCustomerInfo = false;
    
    if (sale.customerName) {
      doc.setTextColor(100, 100, 100);
      doc.text('Name:', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.text(sale.customerName, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 6;
      hasCustomerInfo = true;
    }
    
    if (sale.customerPhone) {
      doc.setTextColor(100, 100, 100);
      doc.text('Contact Number:', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.text(sale.customerPhone, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 6;
      hasCustomerInfo = true;
    }
    
    if (sale.tinNumber) {
      doc.setTextColor(100, 100, 100);
      doc.text('TIN Number:', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.text(sale.tinNumber, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 6;
      hasCustomerInfo = true;
    }
    
    if (sale.customerEmail) {
      doc.setTextColor(100, 100, 100);
      doc.text('Email:', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.text(sale.customerEmail, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 6;
      hasCustomerInfo = true;
    }
    
    // Show "Walk-in Customer" only if no customer information is provided
    if (!hasCustomerInfo) {
      doc.setTextColor(100, 100, 100);
      doc.text('Walk-in Customer', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 6;
    }
    
    yPosition += 4;

    // Items Section
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('Items', margin, yPosition);
    yPosition += 8;
    
    // Table headers
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    const col1 = margin;
    const col2 = margin + 80;
    const col3 = margin + 120;
    const col4 = pageWidth - margin;
    
    doc.text('Item', col1, yPosition);
    doc.text('Qty', col2, yPosition, { align: 'center' });
    doc.text('Price', col3, yPosition, { align: 'right' });
    doc.text('Subtotal', col4, yPosition, { align: 'right' });
    yPosition += 6;
    
    // Draw line under headers
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
    
    // Items rows
    doc.setFont(undefined, 'normal');
    sale.items.forEach((item) => {
      const productName = item.product?.name || 'Unknown Product';
      const quantity = item.quantity || 0;
      const price = item.price || item.product?.price || 0;
      const subtotal = item.subtotal || (price * quantity);
      
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = margin;
      }

      // Truncate product name if too long
      const maxNameWidth = 70;
      let displayName = productName;
      if (doc.getTextWidth(productName) > maxNameWidth) {
        while (doc.getTextWidth(displayName + '...') > maxNameWidth && displayName.length > 0) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      
      doc.text(displayName, col1, yPosition);
      doc.text(quantity.toString(), col2, yPosition, { align: 'center' });
      doc.text(formatCurrency(price), col3, yPosition, { align: 'right' });
      doc.setFont(undefined, 'bold');
      doc.text(formatCurrency(subtotal), col4, yPosition, { align: 'right' });
      doc.setFont(undefined, 'normal');
      yPosition += 6;
    });

    yPosition += 6;

    // Totals Section
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(9);
    doc.text('Subtotal:', margin, yPosition);
    doc.text(formatCurrency(sale.subtotal), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 7;
    
    if (sale.discount > 0) {
      doc.text('Discount:', margin, yPosition);
      doc.text(formatCurrency(sale.discount), pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 7;
    }
    
    doc.text('Tax (VAT):', margin, yPosition);
    doc.text(formatCurrency(sale.tax), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 7;
    
    // Total with border-t style
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Total:', margin, yPosition);
    doc.text(formatCurrency(sale.total), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 10;

    // Cash Rendered and Change (only for cash payments)
    if (sale.paymentMethod === 'cash' && sale.cashRendered) {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text('Cash Rendered:', margin, yPosition);
      doc.text(formatCurrency(sale.cashRendered), pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 7;
      
      const change = Math.max(0, sale.cashRendered - sale.total);
      if (change > 0) {
        doc.setFont(undefined, 'bold');
        doc.text('Change:', margin, yPosition);
        doc.text(formatCurrency(change), pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 10;
      } else {
        yPosition += 4;
      }
    } else {
      yPosition += 4;
    }

    // Payment Method Section
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('Payment Method:', margin, yPosition);
    doc.setFont(undefined, 'normal');
    const paymentMethod = formatPaymentMethod(sale.paymentMethod);
    doc.text(paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 10;

    // Status (if voided)
    if (sale.isVoid) {
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      doc.setFillColor(254, 226, 226);
      doc.roundedRect(margin, yPosition - 4, pageWidth - (margin * 2), 8, 2, 2, 'F');
      doc.setTextColor(220, 38, 38);
      doc.setFont(undefined, 'bold');
      doc.text('VOIDED', pageWidth / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPosition += 10;
    }

    // Footer
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your purchase!', pageWidth / 2, yPosition, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Set response headers
    const fileName = `Receipt_${sale.saleNumber}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

