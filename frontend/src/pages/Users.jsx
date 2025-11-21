import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [paginatedUsers, setPaginatedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, userId: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingAccount, setIsResettingAccount] = useState(false);
  const [passwordFormat, setPasswordFormat] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchUsers();
    fetchPasswordFormat();
  }, []);

  const fetchPasswordFormat = async () => {
    try {
      const response = await axios.get('/settings/password-format');
      setPasswordFormat(response.data.data.format || 'medium');
    } catch (error) {
      // Default to medium if fetch fails
      setPasswordFormat('medium');
    }
  };

  const getPasswordFormatDescription = (format) => {
    switch (format) {
      case 'easy':
        return '$Username1 (e.g., if username is john.doe, the password will be "$John.doe1")';
      case 'medium':
        return 'Firstname.Lastname01 (e.g., if first name is john and last name is doe, the password will be "John.Doe01")';
      case 'hard':
        return 'Firstname.Lastname123 (e.g., if first name is john and last name is doe, the password will be "John.Doe123")';
      default:
        return 'Firstname.Lastname01 (e.g., if first name is john and last name is doe, the password will be "John.Doe01")';
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data.data);
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Convert isActive to boolean if it exists
      const dataToSend = { ...data };
      if (dataToSend.isActive !== undefined) {
        dataToSend.isActive = dataToSend.isActive === true || dataToSend.isActive === 'true';
      }
      
      if (editingUser) {
        await axios.put(`/users/${editingUser._id}`, dataToSend);
        toast.success('User updated successfully');
      } else {
        await axios.post('/users', dataToSend);
        toast.success('User created successfully');
      }
      setShowModal(false);
      setEditingUser(null);
      reset();
      fetchUsers();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleEdit = (user) => {
    setEditingUser(user);
    reset({ 
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role, 
      isActive: user.isActive ? 'true' : 'false'
    });
    setShowModal(true);
  };

  const handleView = (user) => {
    setViewingUser(user);
    setShowViewModal(true);
  };

  const handleResetAccount = (userId) => {
    setConfirmModal({ isOpen: true, userId });
  };

  const confirmResetAccount = async () => {
    setIsResettingAccount(true);
    try {
      await axios.post(`/auth/reset-account/${confirmModal.userId}`);
      toast.success('Account unlocked successfully');
      setConfirmModal({ isOpen: false, userId: null });
      fetchUsers();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsResettingAccount(false);
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
        <button
          onClick={() => {
            setEditingUser(null);
            reset();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add User
        </button>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-500 mt-0.5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700 mb-2">
              <strong>Important:</strong> Please notify new users to update their password immediately after their first login for security purposes.
            </p>
            {passwordFormat && (
              <p className="text-sm text-blue-700">
                <strong>Default Password Format:</strong> {getPasswordFormatDescription(passwordFormat)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Locked</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isActive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.accountLocked ? (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Locked</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Unlocked</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(user)}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        title="View User"
                        aria-label="View User"
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
                        onClick={() => handleEdit(user)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        title="Edit User"
                        aria-label="Edit User"
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
                      {user.accountLocked && (
                        <button
                          onClick={() => handleResetAccount(user._id)}
                          className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors"
                          title="Unlock Account"
                          aria-label="Unlock Account"
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
                              d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
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
          data={users} 
          itemsPerPage={10}
          onPageChange={setPaginatedUsers}
        />
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => {
          if (!isResettingAccount) {
            setConfirmModal({ isOpen: false, userId: null });
          }
        }}
        onConfirm={confirmResetAccount}
        title="Reset Account Lock"
        message="Are you sure you want to unlock this user's account? This will reset their failed login attempts."
        confirmText="Unlock Account"
        variant="warning"
        isLoading={isResettingAccount}
      />

      {/* View User Details Modal */}
      {showViewModal && viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">User Details</h2>
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingUser(null);
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
                  <label className="block text-sm font-medium text-gray-500 mb-1">Username</label>
                  <p className="text-base text-gray-900">{viewingUser.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                  <p className="text-base text-gray-900">
                    {viewingUser.firstName} {viewingUser.lastName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
                  <p className="text-base text-gray-900">{viewingUser.firstName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
                  <p className="text-base text-gray-900">{viewingUser.lastName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                  <p className="text-base text-gray-900">{viewingUser.email || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                  <p className="text-base text-gray-900">{viewingUser.phone || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                  <p className="text-base text-gray-900 capitalize">{viewingUser.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <p className="text-base">
                    {viewingUser.isActive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">Inactive</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Failed Login Attempts</label>
                  <p className="text-base text-gray-900">{viewingUser.failedLoginAttempts || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Account Locked</label>
                  <p className="text-base">
                    {viewingUser.accountLocked ? (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">Locked</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Unlocked</span>
                    )}
                  </p>
                </div>
                {viewingUser.lockedUntil && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Locked Until</label>
                    <p className="text-base text-gray-900">
                      {new Date(viewingUser.lockedUntil).toLocaleString()}
                    </p>
                  </div>
                )}
                {viewingUser.createdAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Created At</label>
                    <p className="text-base text-gray-900">
                      {new Date(viewingUser.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {viewingUser.updatedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Last Updated</label>
                    <p className="text-base text-gray-900">
                      {new Date(viewingUser.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingUser(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold">
                {editingUser ? 'Edit User' : 'Add User'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingUser(null);
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
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-1">Username *</label>
                  <input
                    {...register('username', {
                      required: 'Username is required',
                      minLength: { value: 3, message: 'Username must be at least 3 characters' }
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {errors.username && (
                    <p className="text-red-600 text-sm">{errors.username.message}</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input
                    {...register('firstName', {
                      required: 'First name is required'
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {errors.firstName && (
                    <p className="text-red-600 text-sm">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input
                    {...register('lastName', {
                      required: 'Last name is required'
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {errors.lastName && (
                    <p className="text-red-600 text-sm">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: 'Please provide a valid email address'
                    }
                  })}
                  type="email"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errors.email && (
                  <p className="text-red-600 text-sm">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone *</label>
                <input
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^\d{1,11}$/,
                      message: 'Phone number must contain only digits and be maximum 11 digits'
                    },
                    maxLength: {
                      value: 11,
                      message: 'Phone number must be maximum 11 digits'
                    }
                  })}
                  type="tel"
                  maxLength={11}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter phone number (max 11 digits)"
                />
                {errors.phone && (
                  <p className="text-red-600 text-sm">{errors.phone.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select
                  {...register('role', { required: 'Role is required' })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
                {errors.role && (
                  <p className="text-red-600 text-sm">{errors.role.message}</p>
                )}
              </div>
              {editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-1">Status *</label>
                  <select
                    {...register('isActive', { 
                      setValueAs: (value) => value === 'true' || value === true 
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  {errors.isActive && (
                    <p className="text-red-600 text-sm">{errors.isActive.message}</p>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (editingUser ? 'Updating...' : 'Creating...') : (editingUser ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
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

export default Users;


