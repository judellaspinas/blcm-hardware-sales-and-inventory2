import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import Pagination from '../components/Pagination';
import { formatProductSupplied, parseProductSupplied } from '../constants/supplierCategories';

const Suppliers = () => {
  const { isAdmin } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [paginatedSuppliers, setPaginatedSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedRootCategory, setSelectedRootCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  
  // Watch root category to reset sub category when it changes
  const watchedRootCategory = watch('rootCategory');
  
  useEffect(() => {
    if (watchedRootCategory !== selectedRootCategory) {
      setSelectedRootCategory(watchedRootCategory || '');
      setSelectedSubCategory('');
      setValue('subCategory', '');
    }
  }, [watchedRootCategory, selectedRootCategory, setValue]);

  // Fetch categories from database
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/categories?isActive=true');
      setCategories(response.data.data);
    } catch (error) {
      // Error handled by axios interceptor
    }
  };

  // Get sub-categories for selected root category
  const getSubCategoriesForCategory = (categoryName) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.subCategories || [];
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Reset pagination when tab changes
  useEffect(() => {
    setPaginatedSuppliers([]);
  }, [activeTab]);

  // Filter suppliers based on active tab
  const filteredSuppliers = suppliers.filter(supplier => {
    if (activeTab === 'active') {
      return supplier.isActive !== false; // Default to true if undefined
    } else {
      return supplier.isActive === false;
    }
  });

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get('/suppliers');
      setSuppliers(response.data.data);
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Structure address object
      const address = {
        brgy: data.brgy,
        town: data.town,
        city: data.city,
        province: data.province,
        zipcode: data.zipcode
      };

      // Format product supplied from root and sub category
      const productSupplied = formatProductSupplied(data.rootCategory, data.subCategory);

      // Ensure isActive is always a boolean
      const submitData = {
        companyName: data.companyName,
        companyEmail: data.companyEmail,
        firstName: data.firstName,
        lastName: data.lastName,
        contactPosition: data.contactPosition,
        contactDetails: data.contactDetails,
        contactEmail: data.contactEmail,
        address,
        productSupplied,
        isActive: data.isActive !== undefined ? data.isActive : true
      };
      
      if (editingSupplier) {
        await axios.put(`/suppliers/${editingSupplier._id}`, submitData);
        toast.success('Supplier updated successfully');
      } else {
        await axios.post('/suppliers', submitData);
        toast.success('Supplier created successfully');
      }
      setShowModal(false);
      setEditingSupplier(null);
      reset();
      fetchSuppliers();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    
    // Parse existing productSupplied to get root and sub category
    const { rootCategory, subCategory } = parseProductSupplied(supplier.productSupplied || '');
    setSelectedRootCategory(rootCategory);
    setSelectedSubCategory(subCategory);
    
    reset({
      companyName: supplier.companyName,
      companyEmail: supplier.companyEmail,
      firstName: supplier.firstName,
      lastName: supplier.lastName,
      contactPosition: supplier.contactPosition,
      contactDetails: supplier.contactDetails,
      contactEmail: supplier.contactEmail,
      brgy: supplier.address?.brgy || '',
      town: supplier.address?.town || '',
      city: supplier.address?.city || '',
      province: supplier.address?.province || '',
      zipcode: supplier.address?.zipcode || '',
      rootCategory,
      subCategory,
      isActive: supplier.isActive !== false // Default to true if undefined
    });
    setShowModal(true);
  };

  const handleView = (supplier) => {
    setViewingSupplier(supplier);
    setShowViewModal(true);
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Suppliers</h1>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingSupplier(null);
              setSelectedRootCategory('');
              setSelectedSubCategory('');
              reset();
              setShowModal(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Add Supplier
          </button>
        )}
      </div>

      {/* Tabs for Active/Inactive Suppliers */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Suppliers
          </button>
          <button
            onClick={() => setActiveTab('inactive')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'inactive'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Inactive Suppliers
          </button>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Supplied</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedSuppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No suppliers found
                </td>
              </tr>
            ) : (
              paginatedSuppliers.map((supplier) => (
                <tr key={supplier._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{supplier.firstName} {supplier.lastName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{supplier.companyName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{supplier.companyEmail || '-'}</td>
                  <td className="px-6 py-4">{supplier.contactDetails || '-'}</td>
                  <td className="px-6 py-4">{supplier.contactEmail || '-'}</td>
                  <td className="px-6 py-4">{supplier.productSupplied || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(supplier)}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        title="View Supplier Details"
                        aria-label="View Supplier Details"
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
                      {isAdmin && (
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Supplier"
                          aria-label="Edit Supplier"
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
          data={filteredSuppliers} 
          itemsPerPage={10}
          onPageChange={setPaginatedSuppliers}
        />
      </div>

      {/* View Supplier Details Modal */}
      {showViewModal && viewingSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold">Supplier Details</h2>
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingSupplier(null);
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Company Name</label>
                  <p className="text-sm text-gray-900">{viewingSupplier.companyName || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Company Email</label>
                  <p className="text-sm text-gray-900">{viewingSupplier.companyEmail || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
                  <p className="text-sm text-gray-900">{viewingSupplier.firstName || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
                  <p className="text-sm text-gray-900">{viewingSupplier.lastName || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Contact Position</label>
                  <p className="text-sm text-gray-900">{viewingSupplier.contactPosition || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Contact Number</label>
                  <p className="text-sm text-gray-900">{viewingSupplier.contactDetails || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Contact Email</label>
                  <p className="text-sm text-gray-900">{viewingSupplier.contactEmail || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Product Supplied</label>
                  <p className="text-sm text-gray-900">{viewingSupplier.productSupplied || '-'}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                <div className="bg-gray-50 p-3 rounded-lg">
                  {viewingSupplier.address ? (
                    <div className="space-y-1 text-sm text-gray-900">
                      <p><span className="font-medium">Barangay:</span> {viewingSupplier.address.brgy || '-'}</p>
                      <p><span className="font-medium">Town:</span> {viewingSupplier.address.town || '-'}</p>
                      <p><span className="font-medium">City:</span> {viewingSupplier.address.city || '-'}</p>
                      <p><span className="font-medium">Province:</span> {viewingSupplier.address.province || '-'}</p>
                      <p><span className="font-medium">Zipcode:</span> {viewingSupplier.address.zipcode || '-'}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No address provided</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  viewingSupplier.isActive !== false 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {viewingSupplier.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingSupplier(null);
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold">
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingSupplier(null);
                  setSelectedRootCategory('');
                  setSelectedSubCategory('');
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
              <div>
                <label className="block text-sm font-medium mb-0.5">Company Name *</label>
                <input
                  {...register('companyName', { required: 'Company name is required' })}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm"
                />
                {errors.companyName && (
                  <p className="text-red-600 text-xs mt-0.5">{errors.companyName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-0.5">Company Email *</label>
                <input
                  {...register('companyEmail', {
                    required: 'Company email is required',
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: 'Please provide a valid email address'
                    }
                  })}
                  type="email"
                  className="w-full px-3 py-1.5 border rounded-lg text-sm"
                />
                {errors.companyEmail && (
                  <p className="text-red-600 text-xs mt-0.5">{errors.companyEmail.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-0.5">First Name *</label>
                  <input
                    {...register('firstName', { required: 'First name is required' })}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm"
                  />
                  {errors.firstName && (
                    <p className="text-red-600 text-xs mt-0.5">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-0.5">Last Name *</label>
                  <input
                    {...register('lastName', { required: 'Last name is required' })}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm"
                  />
                  {errors.lastName && (
                    <p className="text-red-600 text-xs mt-0.5">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-0.5">Contact Position *</label>
                <input
                  {...register('contactPosition', { required: 'Contact position is required' })}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm"
                  placeholder="e.g., Manager, Director, etc."
                />
                {errors.contactPosition && (
                  <p className="text-red-600 text-xs mt-0.5">{errors.contactPosition.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-0.5">Contact Number *</label>
                  <input
                    {...register('contactDetails', {
                      required: 'Contact number is required',
                      pattern: {
                        value: /^\d{1,11}$/,
                        message: 'Contact number must contain only digits and be maximum 11 digits'
                      },
                      maxLength: {
                        value: 11,
                        message: 'Contact number must be maximum 11 digits'
                      }
                    })}
                    type="tel"
                    maxLength={11}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    placeholder="Enter contact number (max 11 digits)"
                    onChange={(e) => {
                      // Only allow digits and limit to 11 characters
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setValue('contactDetails', value, { shouldValidate: true });
                    }}
                  />
                  {errors.contactDetails && (
                    <p className="text-red-600 text-xs mt-0.5">{errors.contactDetails.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-0.5">Contact Email *</label>
                  <input
                    {...register('contactEmail', {
                      required: 'Contact email is required',
                      pattern: {
                        value: /^\S+@\S+\.\S+$/,
                        message: 'Please provide a valid email address'
                      }
                    })}
                    type="email"
                    className="w-full px-3 py-1.5 border rounded-lg text-sm"
                  />
                  {errors.contactEmail && (
                    <p className="text-red-600 text-xs mt-0.5">{errors.contactEmail.message}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-0.5 text-gray-600">Barangay *</label>
                    <input
                      {...register('brgy', { required: 'Barangay is required' })}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    />
                    {errors.brgy && (
                      <p className="text-red-600 text-xs mt-0.5">{errors.brgy.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5 text-gray-600">Town *</label>
                    <input
                      {...register('town', { required: 'Town is required' })}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    />
                    {errors.town && (
                      <p className="text-red-600 text-xs mt-0.5">{errors.town.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5 text-gray-600">City *</label>
                    <input
                      {...register('city', { required: 'City is required' })}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    />
                    {errors.city && (
                      <p className="text-red-600 text-xs mt-0.5">{errors.city.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5 text-gray-600">Province *</label>
                    <input
                      {...register('province', { required: 'Province is required' })}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    />
                    {errors.province && (
                      <p className="text-red-600 text-xs mt-0.5">{errors.province.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5 text-gray-600">Zipcode *</label>
                    <input
                      {...register('zipcode', { required: 'Zipcode is required' })}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    />
                    {errors.zipcode && (
                      <p className="text-red-600 text-xs mt-0.5">{errors.zipcode.message}</p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Product Supplied *</label>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium mb-0.5 text-gray-600">Category *</label>
                <select
                  {...register('rootCategory', { required: 'Category is required' })}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm"
                  value={selectedRootCategory}
                  onChange={(e) => {
                    setSelectedRootCategory(e.target.value);
                    setSelectedSubCategory('');
                    setValue('rootCategory', e.target.value);
                    setValue('subCategory', '');
                  }}
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category._id} value={category.name}>{category.name}</option>
                  ))}
                </select>
                    {errors.rootCategory && (
                      <p className="text-red-600 text-xs mt-0.5">{errors.rootCategory.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5 text-gray-600">Sub-Category *</label>
                    <select
                      {...register('subCategory', { required: 'Sub-category is required' })}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                      disabled={!selectedRootCategory}
                      value={selectedSubCategory}
                      onChange={(e) => {
                        setSelectedSubCategory(e.target.value);
                        setValue('subCategory', e.target.value);
                      }}
                    >
                      <option value="">Select Sub-Category</option>
                      {selectedRootCategory && getSubCategoriesForCategory(selectedRootCategory).map(subCat => (
                        <option key={subCat} value={subCat}>{subCat}</option>
                      ))}
                    </select>
                    {errors.subCategory && (
                      <p className="text-red-600 text-xs mt-0.5">{errors.subCategory.message}</p>
                    )}
                    {!selectedRootCategory && (
                      <p className="text-gray-500 text-xs mt-0.5">Please select a category first</p>
                    )}
                  </div>
                </div>
              </div>
              {editingSupplier && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    {...register('isActive')}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Active Supplier
                  </label>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (editingSupplier ? 'Updating...' : 'Creating...') : (editingSupplier ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSupplier(null);
                    setSelectedRootCategory('');
                    setSelectedSubCategory('');
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
    </div>
  );
};

export default Suppliers;

