import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import InputModal from '../components/InputModal';
import Pagination from '../components/Pagination';
import { formatCurrencyDisplay } from '../utils/utils';

const Inventory = () => {
  const { isAdmin } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [paginatedInventory, setPaginatedInventory] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [stockHistory, setStockHistory] = useState([]);
  const [paginatedStockHistory, setPaginatedStockHistory] = useState([]);
  const [stockHistoryLoading, setStockHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('dateDelivered');
  const [sortOrder, setSortOrder] = useState('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Combined form state
  const [stockQuantity, setStockQuantity] = useState('');
  const [dateDelivered, setDateDelivered] = useState('');
  const [price, setPrice] = useState('');
  const [markupPercentage, setMarkupPercentage] = useState('');
  
  // Determine if user can update stock
  const canUpdateStock = isAdmin;

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventory();
    } else if (activeTab === 'history') {
      fetchStockHistory();
    }
  }, [lowStockOnly, activeTab]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchStockHistory();
    }
  }, [searchQuery, sortBy, sortOrder, startDate, endDate, activeTab]);

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`/inventory${lowStockOnly ? '?lowStock=true' : ''}`);
      setInventory(response.data.data);
      setSummary(response.data.summary || {});
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const fetchStockHistory = async () => {
    setStockHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await axios.get(`/inventory/stock-history?${params.toString()}`);
      setStockHistory(response.data.data);
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setStockHistoryLoading(false);
    }
  };

  const updateProduct = async (productId, quantity, dateDelivered, price, markupPercentage) => {
    setIsUpdating(true);
    try {
      const updates = [];
      
      // Update stock if quantity and date are provided
      if (quantity && dateDelivered) {
        await axios.put(`/inventory/${productId}/stock`, { 
          quantity: parseInt(quantity),
          dateDelivered 
        });
        updates.push('stock');
      }
      
      // Update price if price or markupPercentage is provided
      if (price || markupPercentage) {
        await axios.put(`/inventory/${productId}/price`, { 
          price: price ? parseFloat(price) : undefined,
          markupPercentage: markupPercentage ? parseFloat(markupPercentage) : undefined
        });
        updates.push('price');
      }
      
      if (updates.length > 0) {
        const messages = [];
        if (updates.includes('stock')) messages.push('Stock added');
        if (updates.includes('price')) messages.push('Price updated');
        toast.success(messages.join(' and ') + ' successfully');
      }
      
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      setStockQuantity('');
      setDateDelivered('');
      setPrice('');
      setMarkupPercentage('');
      fetchInventory();
      if (activeTab === 'history') {
        fetchStockHistory();
      }
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper function to check if product has valid prices
  const hasValidPrices = (product) => {
    if (!product) return false;
    const hasBasePrice = product.price !== null && product.price !== undefined && product.price > 0;
    const hasMarkupPercentage = product.markupPercentage !== null && product.markupPercentage !== undefined && product.markupPercentage >= 0;
    return hasBasePrice && hasMarkupPercentage;
  };

  const handleEditClick = (product) => {
    setSelectedProduct(product);
    setStockQuantity('');
    setDateDelivered(new Date().toISOString().split('T')[0]);
    setPrice(product.price?.toString() || '');
    setMarkupPercentage(product.markupPercentage?.toString() || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedProduct) return;
    
    // Validate stock inputs if provided
    if (stockQuantity || dateDelivered) {
      if (!stockQuantity || !dateDelivered) {
        toast.error('Please provide both stock quantity and date delivered');
        return;
      }
      
      if (isNaN(stockQuantity) || parseInt(stockQuantity) <= 0) {
        toast.error('Please enter a valid stock quantity');
        return;
      }
      
      // Check if base price and markup percentage are set before adding stock
      const currentPrice = price || selectedProduct.price;
      const currentMarkupPercentage = markupPercentage !== '' ? markupPercentage : selectedProduct.markupPercentage;
      if (!currentPrice || currentMarkupPercentage === null || currentMarkupPercentage === undefined || parseFloat(currentPrice) <= 0 || parseFloat(currentMarkupPercentage) < 0) {
        toast.error('Please set both base price and markup percentage for this product before adding stock');
        return;
      }
    }
    
    // Validate price inputs if provided
    if (price && (isNaN(price) || parseFloat(price) < 0)) {
      toast.error('Please enter a valid price');
      return;
    }
    if (markupPercentage && (isNaN(markupPercentage) || parseFloat(markupPercentage) < 0 || parseFloat(markupPercentage) > 100)) {
      toast.error('Please enter a valid markup percentage (0-100)');
      return;
    }
    
    // Check if at least one field is being updated
    const hasStockUpdate = stockQuantity && dateDelivered;
    const hasPriceUpdate = price || markupPercentage;
    
    if (!hasStockUpdate && !hasPriceUpdate) {
      toast.error('Please fill in at least one field to update');
      return;
    }
    
    updateProduct(
      selectedProduct._id, 
      stockQuantity, 
      dateDelivered, 
      price, 
      markupPercentage
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && activeTab === 'inventory') {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Inventory</h1>
        {activeTab === 'inventory' && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="lowStock"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="lowStock" className="text-sm">Show low stock only</label>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'inventory'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Stock History
          </button>
        </nav>
      </div>

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Total Products</div>
              <div className="text-3xl font-bold mt-2">{summary.totalProducts || 0}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Low Stock Alerts</div>
              <div className="text-3xl font-bold mt-2 text-orange-600">
                {summary.lowStockProducts || 0}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Out of Stock</div>
              <div className="text-3xl font-bold mt-2 text-red-600">
                {summary.outOfStockProducts || 0}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                    {isAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Low Stock Threshold</th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    {canUpdateStock && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedInventory.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? (canUpdateStock ? 7 : 6) : (canUpdateStock ? 6 : 5)} className="px-6 py-4 text-center text-gray-500">
                        No inventory items found
                      </td>
                    </tr>
                  ) : (
                    paginatedInventory.map((product) => {
                      const isLowStock = product.stockQuantity <= product.lowStockThreshold;
                      const isOutOfStock = product.stockQuantity === 0;
                      const basePrice = product.price || 0;
                      const markupPercentage = product.markupPercentage || 0;
                      const totalPrice = basePrice + (basePrice * (markupPercentage / 100));
                      
                      return (
                        <tr key={product._id}>
                          <td className="px-6 py-4 whitespace-nowrap font-semibold">{product.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{product.category || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            ₱{totalPrice.toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap font-semibold ${
                            isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : ''
                          }`}>
                            {product.stockQuantity}
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4 whitespace-nowrap">{product.lowStockThreshold}</td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isOutOfStock ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Out of Stock</span>
                            ) : isLowStock ? (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">Low Stock</span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">In Stock</span>
                            )}
                          </td>
                          {canUpdateStock && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleEditClick(product)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="Edit Product"
                                aria-label="Edit Product"
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination 
              data={inventory} 
              itemsPerPage={10}
              onPageChange={setPaginatedInventory}
            />
          </div>
        </>
      )}

      {/* Stock History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Search and Filter Controls */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div className="lg:col-span-2">
                <input
                  type="text"
                  placeholder="Search by product name or transaction ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <input
                  type="date"
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <input
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="dateDelivered">Sort by Date Delivered</option>
                  <option value="createdAt">Sort by Created At</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            {(searchQuery || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            )}
          </div>

          {stockHistoryLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Delivered</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added At</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedStockHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No stock history found
                        </td>
                      </tr>
                    ) : (
                      paginatedStockHistory.map((history) => (
                        <tr key={history._id}>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{history.transactionId}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-semibold">{history.productName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{history.stockQuantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-semibold">{formatCurrencyDisplay(history.totalCost || 0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatDate(history.dateDelivered)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(history.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination 
                data={stockHistory} 
                itemsPerPage={10}
                onPageChange={setPaginatedStockHistory}
              />
            </>
          )}
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div 
            className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="text-4xl">✏️</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Edit Product</h3>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Update stock and/or price for {selectedProduct?.name || 'this product'}
            </p>
            
            {/* Stock Section */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Stock Information</h4>
              
              {/* Price validation warning for stock */}
              {selectedProduct && !hasValidPrices(selectedProduct) && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <strong>⚠️ Warning:</strong> Base price and markup percentage must be set before adding stock.
                  </p>
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="Enter quantity to add"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Delivered
                </label>
                <input
                  type="date"
                  value={dateDelivered}
                  onChange={(e) => setDateDelivered(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            
            {/* Price Section */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Price Information</h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter base price"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Markup Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={markupPercentage}
                  onChange={(e) => setMarkupPercentage(e.target.value)}
                  placeholder="Enter markup percentage"
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Total Price = Base Price + (Base Price × Markup %)
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => {
                  if (!isUpdating) {
                    setIsEditModalOpen(false);
                    setSelectedProduct(null);
                    setStockQuantity('');
                    setDateDelivered('');
                    setPrice('');
                    setMarkupPercentage('');
                  }
                }}
                disabled={isUpdating}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={isUpdating}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  isUpdating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isUpdating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
