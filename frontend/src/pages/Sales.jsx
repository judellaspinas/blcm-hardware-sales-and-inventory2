import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import ConfirmModal from '../components/ConfirmModal';
import InputModal from '../components/InputModal';
import Pagination from '../components/Pagination';
import { formatCurrencyDisplay, formatCurrency, formatDate, formatPaymentMethod } from '../utils/utils';

const Sales = () => {
  const { isStaff, isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [paginatedSales, setPaginatedSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cart, setCart] = useState([]);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [saleToVoid, setSaleToVoid] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedSaleItems, setSelectedSaleItems] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'voided'
  const [currentStep, setCurrentStep] = useState(1); // 1 for product details, 2 for customer info
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const voidStatus = activeTab === 'voided' ? true : false;
    setLoading(true);
    fetchSales(voidStatus);
  }, [activeTab]);

  const fetchSales = async (voidStatus = false) => {
    try {
      const params = { isVoid: voidStatus };
      const response = await axios.get('/sales', { params });
      setSales(response.data.data);
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/products?isActive=true');
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch products');
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product._id === product._id);
    // Calculate selling price: base price + (base price * markup percentage / 100)
    const basePrice = product.price || 0;
    const markupPercentage = product.markupPercentage || 0;
    const sellingPrice = basePrice + (basePrice * (markupPercentage / 100));
    if (existingItem) {
      setCart(cart.map(item =>
        item.product._id === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, price: sellingPrice }]);
    }
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.product._id !== productId));
    } else {
      setCart(cart.map(item =>
        item.product._id === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vatRate = 0.12; // 12% VAT
    const vat = subtotal * vatRate;
    const total = subtotal + vat;
    return {
      subtotal,
      discount: 0,
      vat,
      total
    };
  };

  const onSubmit = async (data) => {
    if (cart.length === 0) {
      toast.error('Please add items to cart');
      return;
    }

    setIsSubmitting(true);
    try {
      const totals = calculateTotal();
      const saleData = {
        customerName: data.customerName || undefined,
        customerPhone: data.contactNumber || undefined,
        tinNumber: data.tinNumber || undefined,
        paymentMethod: data.paymentMethod,
        cashRendered: data.paymentMethod === 'cash' && data.cashRendered ? parseFloat(data.cashRendered) : undefined,
        items: cart.map(item => ({
          product: item.product._id,
          quantity: item.quantity
        })),
        subtotal: totals.subtotal,
        discount: 0,
        tax: totals.vat,
        total: totals.total
      };

      await axios.post('/sales', saleData);
      toast.success('Sale processed successfully!');
      setShowModal(false);
      setCart([]);
      reset();
      const voidStatus = activeTab === 'voided' ? true : false;
      fetchSales(voidStatus);
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    if (cart.length === 0) {
      toast.error('Please add items to cart before proceeding');
      return;
    }
    setCurrentStep(2);
  };

  const handlePreviousStep = () => {
    setCurrentStep(1);
  };

  const calculateChange = () => {
    const totals = calculateTotal();
    const cashRendered = parseFloat(watch('cashRendered') || 0);
    if (watch('paymentMethod') === 'cash' && cashRendered > 0) {
      return Math.max(0, cashRendered - totals.total);
    }
    return 0;
  };

  const reset = () => {
    setCart([]);
    setProductSearchQuery('');
    setCurrentStep(1);
    setValue('customerName', '');
    setValue('contactNumber', '');
    setValue('tinNumber', '');
    setValue('paymentMethod', 'cash');
    setValue('cashRendered', '');
  };

  const handleVoidClick = (sale) => {
    setSaleToVoid(sale);
    // Show code input modal first
    setShowCodeModal(true);
  };

  const handleCodeConfirm = async (code) => {
    if (!saleToVoid || !code) return;

    setIsVoiding(true);
    try {
      await axios.patch(`/sales/${saleToVoid._id}/void`, { superAdminCode: code });
      toast.success('Sale voided successfully. Stock quantities have been restored.');
      setShowCodeModal(false);
      setSaleToVoid(null);
      const voidStatus = activeTab === 'voided' ? true : false;
      fetchSales(voidStatus);
    } catch (error) {
      // Error handled by axios interceptor
      // Keep modal open on error so user can retry with correct code
    } finally {
      setIsVoiding(false);
    }
  };

  const handleVoidConfirm = async () => {
    // This is now handled by handleCodeConfirm
    // Keeping for backward compatibility but should not be called
    if (!saleToVoid) return;

    setIsVoiding(true);
    try {
      await axios.patch(`/sales/${saleToVoid._id}/void`);
      toast.success('Sale voided successfully. Stock quantities have been restored.');
      setShowVoidModal(false);
      setSaleToVoid(null);
      const voidStatus = activeTab === 'voided' ? true : false;
      fetchSales(voidStatus);
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsVoiding(false);
    }
  };

  const handleViewReceipt = async (sale) => {
    try {
      // Fetch full sale details with populated product data
      const response = await axios.get(`/sales/${sale._id}`);
      setSelectedSale(response.data.data);
      setShowReceiptModal(true);
    } catch (error) {
      // Error handled by axios interceptor
    }
  };

  const handleViewItems = (sale) => {
    setSelectedSaleItems(sale);
    setShowItemsModal(true);
  };

  const exportReceiptToPDF = async () => {
    if (!selectedSale) {
      toast.error('No receipt data available');
      return;
    }

    try {
      const response = await axios.get(`/sales/${selectedSale._id}/pdf`, {
        responseType: 'blob',
      });

      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_${selectedSale.saleNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Receipt exported to PDF successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to export PDF. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  const totals = calculateTotal();

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Sales</h1>
        {(isStaff || isAdmin) && (
          <button
            onClick={() => {
              reset();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full sm:w-auto"
          >
            New Sale
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Sales
          </button>
          <button
            onClick={() => setActiveTab('voided')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'voided'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Voided Sales
          </button>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedSales.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  No sales found
                </td>
              </tr>
            ) : (
              paginatedSales.map((sale) => (
                <tr key={sale._id} className={sale.isVoid ? 'bg-gray-100 opacity-75' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleViewReceipt(sale)}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                    >
                      {sale.saleNumber}
                    </button>
                  </td>
                  <td className="px-6 py-4">{sale.items.length} item(s)</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">{formatCurrencyDisplay(sale.total)}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{sale.paymentMethod}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {sale.isVoid ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Void
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDate(sale.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewItems(sale)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        title="View Items"
                        aria-label="View Items"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                      {(isStaff || isAdmin) && !sale.isVoid && (
                        <button
                          onClick={() => handleVoidClick(sale)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Void Sale"
                          aria-label="Void Sale"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        <Pagination 
          data={sales} 
          itemsPerPage={10}
          onPageChange={setPaginatedSales}
        />
      </div>

      {showModal && (isStaff || isAdmin) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold">New Sale</h2>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setShowModal(false);
                }}
                disabled={isSubmitting}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Step Indicator */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep >= 1 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-200 border-gray-300 text-gray-500'
                  }`}>
                    <span className="font-semibold">1</span>
                  </div>
                  <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep >= 2 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-200 border-gray-300 text-gray-500'
                  }`}>
                    <span className="font-semibold">2</span>
                  </div>
                </div>
              </div>

              {/* Step 1: Product Details */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Add Products</h3>
                    <div className="mb-3">
                      <input
                        type="text"
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        placeholder="Search products..."
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {products
                        .filter(p => p.stockQuantity > 0)
                        .filter(p => 
                          productSearchQuery === '' || 
                          p.name.toLowerCase().includes(productSearchQuery.toLowerCase())
                        )
                        .map((product) => {
                          // Calculate selling price: base price + (base price * markup percentage / 100)
                          const basePrice = product.price || 0;
                          const markupPercentage = product.markupPercentage || 0;
                          const sellingPrice = basePrice + (basePrice * (markupPercentage / 100));
                          return (
                            <button
                              key={product._id}
                              type="button"
                              onClick={() => addToCart(product)}
                              className="text-left p-2 border rounded hover:bg-gray-50"
                            >
                              <div className="font-semibold">{product.name}</div>
                              <div className="text-sm text-gray-600">{formatCurrencyDisplay(sellingPrice)}</div>
                              <div className="text-xs text-gray-500">Stock: {product.stockQuantity}</div>
                            </button>
                          );
                        })}
                      {productSearchQuery !== '' && products
                        .filter(p => p.stockQuantity > 0)
                        .filter(p => 
                          p.name.toLowerCase().includes(productSearchQuery.toLowerCase())
                        ).length === 0 && (
                        <div className="col-span-full text-center text-gray-500 py-4">
                          No products found matching "{productSearchQuery}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Cart Summary</h3>
                    {cart.length === 0 ? (
                      <p className="text-gray-500">No items in cart</p>
                    ) : (
                      <div className="space-y-2">
                        {cart.map((item) => (
                          <div key={item.product._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <div className="font-semibold">{item.product.name}</div>
                              <div className="text-sm text-gray-600">{formatCurrencyDisplay(item.price)} each</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.product._id, item.quantity - 1)}
                                className="px-2 py-1 bg-gray-200 rounded"
                              >
                                -
                              </button>
                              <span className="w-12 text-center">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.product._id, item.quantity + 1)}
                                disabled={item.quantity >= item.product.stockQuantity}
                                className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
                              >
                                +
                              </button>
                              <span className="w-20 text-right font-semibold">
                                {formatCurrencyDisplay(item.price * item.quantity)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Customer Info */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer Name (Optional)</label>
                    <input
                      {...register('customerName')}
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Contact Number (Optional)</label>
                    <input
                      {...register('contactNumber')}
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter contact number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">TIN Number (Optional)</label>
                    <input
                      {...register('tinNumber')}
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter TIN number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Method *</label>
                    <select
                      {...register('paymentMethod', { required: 'Payment method is required' })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="mobile_payment">Mobile Payment</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.paymentMethod && (
                      <p className="text-red-500 text-xs mt-1">{errors.paymentMethod.message}</p>
                    )}
                  </div>
                  {watch('paymentMethod') === 'cash' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Cash Rendered *</label>
                      <input
                        {...register('cashRendered', {
                          required: watch('paymentMethod') === 'cash' ? 'Cash rendered is required' : false,
                          validate: (value) => {
                            if (watch('paymentMethod') === 'cash') {
                              const totals = calculateTotal();
                              const cashAmount = parseFloat(value || 0);
                              if (cashAmount < totals.total) {
                                return `Cash rendered must be at least ${formatCurrencyDisplay(totals.total)}`;
                              }
                            }
                            return true;
                          },
                          valueAsNumber: true
                        })}
                        type="number"
                        step="0.01"
                        min={0}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter amount paid"
                      />
                      {errors.cashRendered && (
                        <p className="text-red-500 text-xs mt-1">{errors.cashRendered.message}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Summary Section - Always Visible */}
              <div className="border-t pt-4 mt-6">
                <div className="flex justify-between mb-2">
                  <span>Subtotal:</span>
                  <span>{formatCurrencyDisplay(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>VAT (12%):</span>
                  <span>{formatCurrencyDisplay(totals.vat)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-2 mb-2">
                  <span>Total:</span>
                  <span>{formatCurrencyDisplay(totals.total)}</span>
                </div>
                {watch('paymentMethod') === 'cash' && watch('cashRendered') && parseFloat(watch('cashRendered') || 0) > 0 && (
                  <div className="flex justify-between text-lg font-semibold text-green-600 border-t pt-2">
                    <span>Change:</span>
                    <span>{formatCurrencyDisplay(calculateChange())}</span>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                {currentStep === 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        reset();
                        setShowModal(false);
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={cart.length === 0}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handlePreviousStep}
                      disabled={isSubmitting}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Processing...' : 'Process Sale'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <InputModal
        isOpen={showCodeModal}
        onClose={() => {
          if (!isVoiding) {
            setShowCodeModal(false);
            setSaleToVoid(null);
          }
        }}
        onConfirm={handleCodeConfirm}
        title="SuperAdmin Code Required"
        message={`Please enter the SuperAdmin code to void sale ${saleToVoid?.saleNumber}. This action will restore stock quantities and cannot be undone.`}
        inputLabel="SuperAdmin Code"
        inputType="password"
        inputPlaceholder="Enter SuperAdmin code"
        confirmText="Verify & Void"
        cancelText="Cancel"
        variant="warning"
        isLoading={isVoiding}
      />

      <ConfirmModal
        isOpen={showVoidModal}
        onClose={() => {
          if (!isVoiding) {
            setShowVoidModal(false);
            setSaleToVoid(null);
          }
        }}
        onConfirm={handleVoidConfirm}
        title="Void Sale"
        message={`Are you sure you want to void sale ${saleToVoid?.saleNumber}? This will restore the stock quantities and exclude this sale from revenue reports. This action cannot be undone.`}
        confirmText="Void Sale"
        cancelText="Cancel"
        variant="warning"
        isLoading={isVoiding}
      />

      {/* Receipt Modal */}
      {showReceiptModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Digital Receipt</h2>
              <div className="flex gap-2 items-center">
                <button
                  onClick={exportReceiptToPDF}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Export PDF
                </button>
                <button
                  onClick={() => {
                    setShowReceiptModal(false);
                    setSelectedSale(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-2"
                  aria-label="Close modal"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h3 className="text-xl font-bold mb-2">BLCM Sales and Inventory System</h3>
                <p className="text-sm text-gray-600">Digital Receipt</p>
              </div>

              {/* Receipt Details */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Sale Number:</span>
                  <span>{selectedSale.saleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Transaction Date:</span>
                  <span>{new Date(selectedSale.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Customer Details */}
              {(selectedSale.customerName || selectedSale.customerPhone || selectedSale.tinNumber || selectedSale.customerEmail) && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Customer Details</h4>
                  <div className="space-y-2 text-sm">
                    {selectedSale.customerName && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span>{selectedSale.customerName}</span>
                      </div>
                    )}
                    {selectedSale.customerPhone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contact Number:</span>
                        <span>{selectedSale.customerPhone}</span>
                      </div>
                    )}
                    {selectedSale.tinNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">TIN Number:</span>
                        <span>{selectedSale.tinNumber}</span>
                      </div>
                    )}
                    {selectedSale.customerEmail && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span>{selectedSale.customerEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!selectedSale.customerName && !selectedSale.customerPhone && !selectedSale.tinNumber && !selectedSale.customerEmail && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Customer Details</h4>
                  <div className="text-sm text-gray-600">Walk-in Customer</div>
                </div>
              )}

              {/* Items */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Items</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Item</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Qty</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Price</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedSale.items.map((item, index) => {
                        const productName = item.product?.name || 'Unknown Product';
                        const quantity = item.quantity || 0;
                        const price = item.price || item.product?.price || 0;
                        const subtotal = item.subtotal || (price * quantity);
                        
                        return (
                          <tr key={index}>
                            <td className="px-4 py-2">{productName}</td>
                            <td className="px-4 py-2 text-center">{quantity}</td>
                            <td className="px-4 py-2 text-right">{formatCurrencyDisplay(price)}</td>
                            <td className="px-4 py-2 text-right font-semibold">{formatCurrencyDisplay(subtotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrencyDisplay(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>{formatCurrencyDisplay(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax (VAT):</span>
                  <span>{formatCurrencyDisplay(selectedSale.tax)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span>{formatCurrencyDisplay(selectedSale.total)}</span>
                </div>
                {selectedSale.paymentMethod === 'cash' && selectedSale.cashRendered && (
                  <>
                    <div className="flex justify-between mt-2">
                      <span>Cash Rendered:</span>
                      <span>{formatCurrencyDisplay(selectedSale.cashRendered)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold border-t pt-2 mt-2">
                      <span>Change:</span>
                      <span>{formatCurrencyDisplay(Math.max(0, selectedSale.cashRendered - selectedSale.total))}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Payment Method */}
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold">Payment Method:</span>
                  <span className="capitalize">{formatPaymentMethod(selectedSale.paymentMethod)}</span>
                </div>
              </div>

              {/* Status */}
              {selectedSale.isVoid && (
                <div className="border-t pt-4">
                  <div className="bg-red-100 text-red-800 px-4 py-2 rounded text-center font-semibold">
                    VOIDED
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="border-t pt-4 text-center text-sm text-gray-600">
                <p>Thank you for your purchase!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items View Modal */}
      {showItemsModal && selectedSaleItems && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Sale Items - {selectedSaleItems.saleNumber}</h2>
              <button
                onClick={() => {
                  setShowItemsModal(false);
                  setSelectedSaleItems(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors p-2"
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Item</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Quantity</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Unit Price</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedSaleItems.items && selectedSaleItems.items.length > 0 ? (
                      selectedSaleItems.items.map((item, index) => {
                        const productName = item.product?.name || 'Unknown Product';
                        const quantity = item.quantity || 0;
                        const price = item.price || item.product?.price || 0;
                        const subtotal = item.subtotal || (price * quantity);
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">{productName}</td>
                            <td className="px-4 py-3 text-center">{quantity}</td>
                            <td className="px-4 py-3 text-right">{formatCurrencyDisplay(price)}</td>
                            <td className="px-4 py-3 text-right font-semibold">{formatCurrencyDisplay(subtotal)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-4 py-4 text-center text-gray-500">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {selectedSaleItems.items && selectedSaleItems.items.length > 0 && (
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="3" className="px-4 py-3 text-right font-semibold">
                          Total:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-lg">
                          {formatCurrencyDisplay(selectedSaleItems.total)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;

