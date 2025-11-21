import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useForm, Controller } from 'react-hook-form';
import Select from 'react-select';
import Pagination from '../components/Pagination';
import { STANDARD_UNITS, SUB_CATEGORIES, formatProductDescription } from '../constants/units';

const Products = () => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [paginatedProducts, setPaginatedProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, productId: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm();
  
  // Determine if user can add/edit products
  const canManageProducts = isAdmin;

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/products');
      setProducts(response.data.data);
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search term and category
  useEffect(() => {
    let filtered = [...products];

    // Filter by search term (name, brand, SKU, description)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(searchLower) ||
        product.brand?.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(product => 
        product.category === selectedCategory
      );
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory]);

  const fetchSuppliers = async () => {
    try {
      // Only fetch suppliers if user is admin (suppliers don't need the dropdown)
      if (isAdmin) {
        const response = await axios.get('/suppliers?isActive=true');
        setSuppliers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/categories?isActive=true');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const productData = {
        ...data,
        price: data.price && data.price !== '' ? parseFloat(data.price) : undefined,
        markupPercentage: data.markupPercentage && data.markupPercentage !== '' ? parseFloat(data.markupPercentage) : undefined,
        stockQuantity: data.stockQuantity && data.stockQuantity !== '' ? parseInt(data.stockQuantity) : undefined,
        lowStockThreshold: parseInt(data.lowStockThreshold) || 10,
        category: data.category || undefined,
        unit: data.unit || undefined,
        subCategory: data.subCategory || undefined,
        amount: data.amount && data.amount !== '' ? parseFloat(data.amount) : undefined,
        brand: data.brand || undefined
      };

      // Remove undefined values before sending
      Object.keys(productData).forEach(key => {
        if (productData[key] === undefined) {
          delete productData[key];
        }
      });


      if (editingProduct) {
        await axios.put(`/products/${editingProduct._id}`, productData);
        toast.success('Product updated successfully');
      } else {
        await axios.post('/products', productData);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      const updatedProductId = editingProduct?._id;
      setEditingProduct(null);
      reset();
      await fetchProducts();
      // If we were viewing a product, refresh it to show updated pricing history
      if (viewingProduct && updatedProductId && viewingProduct._id === updatedProductId) {
        try {
          const response = await axios.get(`/products/${updatedProductId}`);
          setViewingProduct(response.data.data);
        } catch (error) {
          // Error handled by axios interceptor
        }
      }
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    // Fetch categories and suppliers again in case new ones were added
    fetchCategories();
    fetchSuppliers();
    const categoryName = typeof product.category === 'string' ? product.category : product.category?.value || product.category;
    const unitName = typeof product.unit === 'string' ? product.unit : product.unit?.value || product.unit;
    
    const formData = {
      ...product,
      category: categoryName || '',
      unit: unitName || '',
      subCategory: product.subCategory || '',
      amount: product.amount || ''
    };
    
    // Only set supplier field for admins
    if (isAdmin) {
      formData.supplier = product.supplier?._id || product.supplier;
    }
    
    reset(formData);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, productId: id });
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await axios.delete(`/products/${confirmModal.productId}`);
      toast.success('Product deleted successfully');
      setConfirmModal({ isOpen: false, productId: null });
      fetchProducts();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
        {canManageProducts && (
          <button
            onClick={() => {
              setEditingProduct(null);
              reset();
              fetchCategories(); // Refresh categories when opening modal
              fetchSuppliers(); // Refresh suppliers when opening modal
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full sm:w-auto"
          >
            Add Product
          </button>
        )}
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Products
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, brand, SKU, or description..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label="Clear search"
                >
                  <svg
                    className="h-5 w-5 text-gray-400 hover:text-gray-600"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Category
            </label>
            <Select
              value={selectedCategory ? { value: selectedCategory, label: selectedCategory } : null}
              onChange={(option) => setSelectedCategory(option ? option.value : '')}
              options={categories.map(cat => ({
                value: cat.name,
                label: cat.name
              }))}
              isClearable
              isSearchable
              placeholder="All Categories"
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || selectedCategory) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {searchTerm && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                Search: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                  aria-label="Remove search filter"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </span>
            )}
            {selectedCategory && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                Category: {selectedCategory}
                <button
                  onClick={() => setSelectedCategory('')}
                  className="ml-2 text-green-600 hover:text-green-800"
                  aria-label="Remove category filter"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
              }}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredProducts.length} of {products.length} product{products.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specification</th>
              {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={isAdmin && canManageProducts ? 6 : isAdmin ? 5 : canManageProducts ? 5 : 4} className="px-6 py-4 text-center text-gray-500">
                  No products found
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product) => (
                <tr key={product._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{product.brand || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{product.category || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatProductDescription(product) || '-'}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.supplier?.companyName || '-'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={async () => {
                          try {
                            // Fetch full product data including pricing history
                            const response = await axios.get(`/products/${product._id}`);
                            setViewingProduct(response.data.data);
                            setActiveTab('details');
                          } catch (error) {
                            // Fallback to product from list if fetch fails
                            setViewingProduct(product);
                            setActiveTab('details');
                          }
                        }}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        title="View Product Details"
                        aria-label="View Product Details"
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
                      {canManageProducts && (
                        <button
                          onClick={() => handleEdit(product)}
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
          data={filteredProducts} 
          itemsPerPage={10}
          onPageChange={setPaginatedProducts}
        />
      </div>

      {showModal && canManageProducts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingProduct(null);
                  reset();
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
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  {...register('name', { required: 'Product name is required' })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errors.name && (
                  <p className="text-red-600 text-sm">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Product Brand</label>
                <input
                  {...register('brand')}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter product brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  {...register('description')}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => {
                    const categoryOptions = categories.map(cat => ({
                      value: cat.name,
                      label: cat.name
                    }));

                    return (
                      <Select
                        {...field}
                        options={categoryOptions}
                        isClearable
                        isSearchable
                        placeholder="Select or search for a category"
                        className="react-select-container"
                        classNamePrefix="react-select"
                        value={categoryOptions.find(option => option.value === field.value) || null}
                        onChange={(selectedOption) => {
                          field.onChange(selectedOption ? selectedOption.value : '');
                        }}
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: '42px',
                            borderColor: errors.category ? '#ef4444' : base.borderColor,
                            '&:hover': {
                              borderColor: errors.category ? '#ef4444' : base.borderColor
                            }
                          })
                        }}
                      />
                    );
                  }}
                />
                {errors.category && (
                  <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <Controller
                  name="unit"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={STANDARD_UNITS}
                      isClearable
                      isSearchable
                      placeholder="Select or search for a unit"
                      className="react-select-container"
                      classNamePrefix="react-select"
                      value={STANDARD_UNITS.find(option => option.value === field.value) || null}
                      onChange={(selectedOption) => {
                        field.onChange(selectedOption ? selectedOption.value : '');
                      }}
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '42px',
                          borderColor: errors.unit ? '#ef4444' : base.borderColor,
                          '&:hover': {
                            borderColor: errors.unit ? '#ef4444' : base.borderColor
                          }
                        })
                      }}
                    />
                  )}
                />
                {errors.unit && (
                  <p className="text-red-600 text-sm mt-1">{errors.unit.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sub Category</label>
                <Controller
                  name="subCategory"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={SUB_CATEGORIES}
                      isClearable
                      isSearchable
                      placeholder="Select or search for a sub-category"
                      className="react-select-container"
                      classNamePrefix="react-select"
                      value={SUB_CATEGORIES.find(option => option.value === field.value) || null}
                      onChange={(selectedOption) => {
                        field.onChange(selectedOption ? selectedOption.value : '');
                      }}
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '42px',
                          borderColor: errors.subCategory ? '#ef4444' : base.borderColor,
                          '&:hover': {
                            borderColor: errors.subCategory ? '#ef4444' : base.borderColor
                          }
                        })
                      }}
                    />
                  )}
                />
                {errors.subCategory && (
                  <p className="text-red-600 text-sm mt-1">{errors.subCategory.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  {...register('amount', { 
                    min: { value: 0, message: 'Amount cannot be negative' }
                  })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., 3"
                />
                {errors.amount && (
                  <p className="text-red-600 text-sm mt-1">{errors.amount.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  The quantity/amount in the selected unit (e.g., 3 for 3L)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Low Stock Threshold</label>
                <input
                  {...register('lowStockThreshold', { min: 0 })}
                  type="number"
                  defaultValue={10}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier *</label>
                  <Controller
                    name="supplier"
                    control={control}
                    rules={{ required: isAdmin ? 'Supplier is required' : false }}
                    render={({ field }) => {
                      const supplierOptions = suppliers.map(supplier => ({
                        value: supplier._id,
                        label: supplier.companyName
                      }));

                      return (
                        <Select
                          {...field}
                          options={supplierOptions}
                          isClearable
                          isSearchable
                          placeholder="Select or search for a supplier"
                          className="react-select-container"
                          classNamePrefix="react-select"
                          value={supplierOptions.find(option => option.value === field.value) || null}
                          onChange={(selectedOption) => {
                            field.onChange(selectedOption ? selectedOption.value : '');
                          }}
                          styles={{
                            control: (base) => ({
                              ...base,
                              minHeight: '42px',
                              borderColor: errors.supplier ? '#ef4444' : base.borderColor,
                              '&:hover': {
                                borderColor: errors.supplier ? '#ef4444' : base.borderColor
                              }
                            })
                          }}
                        />
                      );
                    }}
                  />
                  {errors.supplier && (
                    <p className="text-red-600 text-sm mt-1">{errors.supplier.message}</p>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (editingProduct ? 'Updating...' : 'Creating...') : (editingProduct ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    reset();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Product Details Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">Product Details</h2>
              <button
                type="button"
                onClick={() => {
                  setViewingProduct(null);
                  setActiveTab('details');
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
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

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="flex space-x-4" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'details'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('pricing-history')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'pricing-history'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pricing History
                </button>
              </nav>
            </div>

            <div className="space-y-4">
              {activeTab === 'details' && (
                <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{viewingProduct.name || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Brand</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{viewingProduct.brand || '-'}</p>
                </div>

                {viewingProduct.sku && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">SKU</label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{viewingProduct.sku}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{viewingProduct.category || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Unit</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{viewingProduct.unit || '-'}</p>
                </div>

                {viewingProduct.subCategory && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Sub Category</label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{viewingProduct.subCategory}</p>
                  </div>
                )}

                {viewingProduct.amount && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Amount</label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{viewingProduct.amount}</p>
                  </div>
                )}

                {(viewingProduct.unit || viewingProduct.subCategory || viewingProduct.amount) && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Full Specification</label>
                    <p className="text-gray-900 bg-blue-50 px-3 py-2 rounded-lg font-medium">
                      {formatProductDescription(viewingProduct)}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Base Price</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                    {viewingProduct.price !== undefined && viewingProduct.price !== null
                      ? `₱${parseFloat(viewingProduct.price).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Markup Percentage</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                    {viewingProduct.markupPercentage !== undefined && viewingProduct.markupPercentage !== null
                      ? `${parseFloat(viewingProduct.markupPercentage).toFixed(2)}%`
                      : '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Markup Amount</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                    {viewingProduct.price !== undefined && viewingProduct.price !== null && viewingProduct.markupPercentage !== undefined && viewingProduct.markupPercentage !== null
                      ? `₱${((viewingProduct.price || 0) * ((viewingProduct.markupPercentage || 0) / 100)).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Total Price</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg font-semibold">
                    {viewingProduct.price !== undefined && viewingProduct.price !== null
                      ? `₱${((viewingProduct.price || 0) + ((viewingProduct.price || 0) * ((viewingProduct.markupPercentage || 0) / 100))).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Stock Quantity</label>
                  <p className={`px-3 py-2 rounded-lg ${
                    viewingProduct.stockQuantity !== undefined && viewingProduct.stockQuantity <= (viewingProduct.lowStockThreshold || 10)
                      ? 'bg-red-50 text-red-700 font-semibold'
                      : 'bg-gray-50 text-gray-900'
                  }`}>
                    {viewingProduct.stockQuantity !== undefined && viewingProduct.stockQuantity !== null
                      ? viewingProduct.stockQuantity.toLocaleString()
                      : '0'}
                    {viewingProduct.stockQuantity !== undefined && viewingProduct.stockQuantity <= (viewingProduct.lowStockThreshold || 10)
                      ? ' (Low Stock)'
                      : ''}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Low Stock Threshold</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                    {viewingProduct.lowStockThreshold !== undefined && viewingProduct.lowStockThreshold !== null
                      ? viewingProduct.lowStockThreshold.toLocaleString()
                      : '10'}
                  </p>
                </div>

                {isAdmin && viewingProduct.supplier && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Supplier</label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {viewingProduct.supplier?.companyName || '-'}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <p className={`px-3 py-2 rounded-lg inline-block ${
                    viewingProduct.isActive !== false
                      ? 'bg-green-50 text-green-700 font-semibold'
                      : 'bg-red-50 text-red-700 font-semibold'
                  }`}>
                    {viewingProduct.isActive !== false ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>

              {viewingProduct.description && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg whitespace-pre-wrap">
                    {viewingProduct.description}
                  </p>
                </div>
              )}

              {(viewingProduct.createdAt || viewingProduct.updatedAt) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  {viewingProduct.createdAt && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Created At</label>
                      <p className="text-gray-600 text-sm">
                        {new Date(viewingProduct.createdAt).toLocaleString('en-NG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  {viewingProduct.updatedAt && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Last Updated</label>
                      <p className="text-gray-600 text-sm">
                        {new Date(viewingProduct.updatedAt).toLocaleString('en-NG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setViewingProduct(null);
                    setActiveTab('details');
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
                </>
              )}

              {activeTab === 'pricing-history' && (
                <div className="space-y-4">
                  {viewingProduct.pricingHistory && viewingProduct.pricingHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Base Price
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Markup Percentage
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Updated At
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {[...viewingProduct.pricingHistory].reverse().map((entry, index) => (
                            <tr key={index} className={index === 0 ? 'bg-blue-50' : ''}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                ₱{parseFloat(entry.basePrice || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {parseFloat(entry.markupPercentage || 0).toFixed(2)}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(entry.updatedAt).toLocaleString('en-NG', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {viewingProduct.pricingHistory.length > 0 && (
                        <p className="mt-2 text-xs text-gray-500 italic">
                          * Most recent entry highlighted in blue
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No pricing history available for this product.</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setViewingProduct(null);
                        setActiveTab('details');
                      }}
                      className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;

