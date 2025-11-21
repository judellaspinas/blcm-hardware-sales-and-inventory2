import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import Pagination from '../components/Pagination';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [paginatedCategories, setPaginatedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingCategory, setViewingCategory] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subCategories, setSubCategories] = useState([]);
  const [newSubCategory, setNewSubCategory] = useState('');
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/categories');
      setCategories(response.data.data);
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const submitData = {
        ...data,
        subCategories: subCategories.filter(subCat => subCat.trim() !== '')
      };
      
      if (editingCategory) {
        await axios.put(`/categories/${editingCategory._id}`, submitData);
        toast.success('Category updated successfully');
      } else {
        await axios.post('/categories', submitData);
        toast.success('Category created successfully');
      }
      setShowModal(false);
      setEditingCategory(null);
      setSubCategories([]);
      setNewSubCategory('');
      reset();
      fetchCategories();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setSubCategories(category.subCategories || []);
    setNewSubCategory('');
    reset(category);
    setShowModal(true);
  };

  const addSubCategory = () => {
    if (newSubCategory.trim()) {
      setSubCategories([...subCategories, newSubCategory.trim()]);
      setNewSubCategory('');
    }
  };

  const removeSubCategory = (index) => {
    setSubCategories(subCategories.filter((_, i) => i !== index));
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingCategory(null);
    setSubCategories([]);
    setNewSubCategory('');
    reset();
  };

  const handleView = (category) => {
    setViewingCategory(category);
    setShowViewModal(true);
  };

  const toggleActive = async (category) => {
    try {
      await axios.put(`/categories/${category._id}`, {
        isActive: !category.isActive
      });
      toast.success(`Category ${category.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchCategories();
    } catch (error) {
      // Error handled by axios interceptor
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Categories</h1>
        <button
          onClick={() => {
            setEditingCategory(null);
            setSubCategories([]);
            setNewSubCategory('');
            reset();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full sm:w-auto"
        >
          Add Category
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedCategories.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                  No categories found. Create your first category!
                </td>
              </tr>
            ) : (
              paginatedCategories.map((category) => (
                <tr key={category._id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{category.name}</td>
                  <td className="px-6 py-4">{category.description || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        category.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(category)}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        title="View Category Details"
                        aria-label="View Category Details"
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
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Category"
                        aria-label="Edit Category"
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
                      <button
                        onClick={() => toggleActive(category)}
                        className={`p-2 rounded transition-colors ${
                          category.isActive
                            ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50'
                            : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                        }`}
                        title={category.isActive ? 'Deactivate Category' : 'Activate Category'}
                        aria-label={category.isActive ? 'Deactivate Category' : 'Activate Category'}
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
                            d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        <Pagination 
          data={categories} 
          itemsPerPage={10}
          onPageChange={setPaginatedCategories}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  {...register('name', {
                    required: 'Category name is required',
                    minLength: {
                      value: 2,
                      message: 'Category name must be at least 2 characters'
                    },
                    maxLength: {
                      value: 50,
                      message: 'Category name cannot exceed 50 characters'
                    }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errors.name && (
                  <p className="text-red-600 text-sm">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  {...register('description', {
                    maxLength: {
                      value: 200,
                      message: 'Description cannot exceed 200 characters'
                    }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                />
                {errors.description && (
                  <p className="text-red-600 text-sm">{errors.description.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sub-Categories</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubCategory}
                      onChange={(e) => setNewSubCategory(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSubCategory();
                        }
                      }}
                      placeholder="Enter sub-category name"
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={addSubCategory}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                  {subCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
                      {subCategories.map((subCat, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-white border rounded-lg"
                        >
                          <span className="text-sm">{subCat}</span>
                          <button
                            type="button"
                            onClick={() => removeSubCategory(index)}
                            className="text-red-600 hover:text-red-800"
                            aria-label="Remove sub-category"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
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
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (editingCategory ? 'Updating...' : 'Creating...') : (editingCategory ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={handleModalClose}
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

      {/* View Category Details Modal */}
      {showViewModal && viewingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold">Category Details</h2>
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingCategory(null);
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
                  <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                  <p className="text-sm text-gray-900 font-medium">{viewingCategory.name || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    viewingCategory.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {viewingCategory.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                <p className="text-sm text-gray-900">{viewingCategory.description || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Sub-Categories</label>
                {viewingCategory.subCategories && viewingCategory.subCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
                    {viewingCategory.subCategories.map((subCat, index) => (
                      <span
                        key={index}
                        className="inline-block px-3 py-1 bg-white border rounded-lg text-sm"
                      >
                        {subCat}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No sub-categories added</p>
                )}
              </div>
              {viewingCategory.createdAt && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Created At</label>
                    <p className="text-sm text-gray-900">
                      {new Date(viewingCategory.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {viewingCategory.updatedAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Last Updated</label>
                      <p className="text-sm text-gray-900">
                        {new Date(viewingCategory.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingCategory(null);
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;

