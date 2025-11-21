import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

const Settings = () => {
  const [codeStatus, setCodeStatus] = useState({ isSet: false });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordFormat, setPasswordFormat] = useState('medium');
  const [isSavingFormat, setIsSavingFormat] = useState(false);
  const [healthStatus, setHealthStatus] = useState({
    api: 'checking',
    database: 'checking',
    loading: true
  });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm();

  const checkHealth = useCallback(async () => {
    try {
      const response = await axios.get('/health/detailed', {
        timeout: 10000 // 10 second timeout for health check
      });
      
      const dbStatus = response.data.database === 'connected' ? 'connected' : 'disconnected';
      const apiStatus = response.data.status === 'OK' ? 'running' : 'error';
      
      setHealthStatus({
        api: apiStatus,
        database: dbStatus,
        loading: false
      });
    } catch (error) {
      // If health check fails, mark both as error
      setHealthStatus({
        api: 'error',
        database: 'error',
        loading: false
      });
    }
  }, []);

  useEffect(() => {
    fetchCodeStatus();
    fetchPasswordFormat();
    checkHealth();
    
    // Set up periodic health check every 30 seconds
    const healthInterval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(healthInterval);
  }, [checkHealth]);

  const fetchCodeStatus = async () => {
    try {
      const response = await axios.get('/settings/superadmin-code');
      setCodeStatus(response.data.data);
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const fetchPasswordFormat = async () => {
    try {
      const response = await axios.get('/settings/password-format');
      setPasswordFormat(response.data.data.format || 'medium');
    } catch (error) {
      // Error handled by axios interceptor
    }
  };

  const handleFormatChange = async (format) => {
    setIsSavingFormat(true);
    try {
      await axios.post('/settings/password-format', { format });
      setPasswordFormat(format);
      toast.success('Default password format has been updated successfully');
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsSavingFormat(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const payload = codeStatus.isSet
        ? {
            currentCode: data.currentCode,
            newCode: data.newCode,
            confirmCode: data.confirmCode
          }
        : {
            newCode: data.newCode
          };

      await axios.post('/settings/superadmin-code', payload);
      toast.success(codeStatus.isSet 
        ? 'SuperAdmin code has been updated successfully'
        : 'SuperAdmin code has been set successfully');
      reset();
      fetchCodeStatus();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom validation for code format
  const validateCode = (value) => {
    if (!value) {
      return 'SuperAdmin code is required';
    }
    if (value.length < 6) {
      return 'SuperAdmin code must be at least 6 characters long';
    }
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasDigits = /[0-9]/.test(value);
    
    if (!hasUpperCase || !hasLowerCase || !hasDigits) {
      return 'SuperAdmin code must contain uppercase letters, lowercase letters, and digits';
    }
    return true;
  };

  // Custom validation for confirm code
  const validateConfirmCode = (value) => {
    const newCode = watch('newCode');
    if (!value) {
      return 'Please confirm the new code';
    }
    if (value !== newCode) {
      return 'New codes do not match';
    }
    return true;
  };

  const currentCodeValue = watch('currentCode');
  const newCodeValue = watch('newCode');
  const confirmCodeValue = watch('confirmCode');

  const handleResetCode = async () => {
    if (!resetPassword) {
      toast.error('Please enter your admin password');
      return;
    }

    setIsResetting(true);
    try {
      await axios.delete('/settings/superadmin-code', {
        data: { password: resetPassword }
      });
      toast.success('SuperAdmin code has been reset successfully');
      setIsResetModalOpen(false);
      setResetPassword('');
      fetchCodeStatus();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsResetting(false);
    }
  };

  const handleCloseResetModal = () => {
    setIsResetModalOpen(false);
    setResetPassword('');
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-2">Manage system settings and configurations</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">SuperAdmin Code</h2>
        <p className="text-gray-600 mb-6">
          {codeStatus.isSet 
            ? 'Update the SuperAdmin code that staff members must enter when voiding sales transactions. You must enter your current code, then provide and confirm the new code.'
            : 'Set a SuperAdmin code that staff members must enter when voiding sales transactions. The code must contain uppercase letters, lowercase letters, and digits.'}
        </p>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Code Status</p>
              <p className="text-sm text-gray-600 mt-1">
                {codeStatus.isSet 
                  ? 'SuperAdmin code is currently set' 
                  : 'SuperAdmin code has not been set'}
              </p>
            </div>
            <div>
              {codeStatus.isSet ? (
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                  Active
                </span>
              ) : (
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  Not Set
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {codeStatus.isSet && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current SuperAdmin Code
              </label>
              <input
                {...register('currentCode', {
                  required: 'Current SuperAdmin code is required'
                })}
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter current SuperAdmin code"
                autoComplete="current-password"
              />
              {errors.currentCode && (
                <p className="text-red-500 text-sm mt-1">{errors.currentCode.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {codeStatus.isSet ? 'New SuperAdmin Code' : 'SuperAdmin Code'}
            </label>
            <input
              {...register('newCode', {
                validate: validateCode
              })}
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter SuperAdmin code (uppercase, lowercase, digits)"
              autoComplete="new-password"
            />
            {errors.newCode && (
              <p className="text-red-500 text-sm mt-1">{errors.newCode.message}</p>
            )}
            {newCodeValue && (
              <div className="mt-2 text-sm text-gray-600">
                <p className="mb-1">Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li className={/[A-Z]/.test(newCodeValue) ? 'text-green-600' : 'text-gray-400'}>
                    Contains uppercase letters
                  </li>
                  <li className={/[a-z]/.test(newCodeValue) ? 'text-green-600' : 'text-gray-400'}>
                    Contains lowercase letters
                  </li>
                  <li className={/[0-9]/.test(newCodeValue) ? 'text-green-600' : 'text-gray-400'}>
                    Contains digits
                  </li>
                  <li className={newCodeValue.length >= 6 ? 'text-green-600' : 'text-gray-400'}>
                    At least 6 characters ({newCodeValue.length}/6)
                  </li>
                </ul>
              </div>
            )}
          </div>

          {codeStatus.isSet && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New SuperAdmin Code
              </label>
              <input
                {...register('confirmCode', {
                  validate: validateConfirmCode
                })}
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm new SuperAdmin code"
                autoComplete="new-password"
              />
              {errors.confirmCode && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmCode.message}</p>
              )}
              {confirmCodeValue && newCodeValue && confirmCodeValue === newCodeValue && (
                <p className="text-green-600 text-sm mt-1">✓ Codes match</p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : codeStatus.isSet ? 'Update Code' : 'Set Code'}
              </button>
              <button
                type="button"
                onClick={() => reset()}
                disabled={isSubmitting}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            </div>
            {codeStatus.isSet && (
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                disabled={isSubmitting}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Code
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Default Password Format</h2>
        <p className="text-gray-600 mb-6">
          Configure the default password format for new users. This format will be used when creating users without specifying a password.
        </p>

        <div className="space-y-4">
          <div
            onClick={() => !isSavingFormat && handleFormatChange('easy')}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              passwordFormat === 'easy'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${isSavingFormat ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    checked={passwordFormat === 'easy'}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleFormatChange('easy');
                    }}
                    disabled={isSavingFormat}
                    className="w-4 h-4 text-blue-600 pointer-events-none"
                  />
                  <span className="font-semibold text-gray-800">
                    Easy Format
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                    Easy
                  </span>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  $Username1 (e.g., if username is john.doe, the password will be "$John.doe1")
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => !isSavingFormat && handleFormatChange('medium')}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              passwordFormat === 'medium'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${isSavingFormat ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    checked={passwordFormat === 'medium'}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleFormatChange('medium');
                    }}
                    disabled={isSavingFormat}
                    className="w-4 h-4 text-blue-600 pointer-events-none"
                  />
                  <span className="font-semibold text-gray-800">
                    Medium Format
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                    Medium
                  </span>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  Firstname.Lastname01 (e.g., if first name is john and last name is doe, the password will be "John.Doe01")
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => !isSavingFormat && handleFormatChange('hard')}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              passwordFormat === 'hard'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${isSavingFormat ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    checked={passwordFormat === 'hard'}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleFormatChange('hard');
                    }}
                    disabled={isSavingFormat}
                    className="w-4 h-4 text-blue-600 pointer-events-none"
                  />
                  <span className="font-semibold text-gray-800">
                    Hard Format
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                    Hard
                  </span>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  Firstname.Lastname123 (e.g., if first name is john and last name is doe, the password will be "John.Doe123")
                </p>
              </div>
            </div>
          </div>
        </div>

        {isSavingFormat && (
          <p className="text-sm text-gray-500 mt-4">Saving...</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <p className="text-gray-600 mb-4">
          Monitor the health and connectivity status of the system components.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="font-medium">Database</span>
            </div>
            {healthStatus.loading ? (
              <span className="text-gray-500 text-sm">Checking...</span>
            ) : healthStatus.database === 'connected' ? (
              <span className="text-green-600 text-sm font-medium">● Connected</span>
            ) : (
              <span className="text-red-600 text-sm font-medium">● Disconnected</span>
            )}
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="font-medium">API</span>
            </div>
            {healthStatus.loading ? (
              <span className="text-gray-500 text-sm">Checking...</span>
            ) : healthStatus.api === 'running' ? (
              <span className="text-green-600 text-sm font-medium">● Running</span>
            ) : (
              <span className="text-red-600 text-sm font-medium">● Error</span>
            )}
          </div>
        </div>
      </div>

      {/* Reset SuperAdmin Code Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseResetModal}>
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reset SuperAdmin Code</h3>
            <p className="text-gray-600 mb-4">
              To reset the SuperAdmin code, please enter your admin account password. This will clear the current SuperAdmin code.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Enter your admin password"
                autoComplete="current-password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && resetPassword && !isResetting) {
                    handleResetCode();
                  }
                }}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={handleCloseResetModal}
                disabled={isResetting}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleResetCode}
                disabled={isResetting || !resetPassword}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResetting ? 'Resetting...' : 'Reset Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

