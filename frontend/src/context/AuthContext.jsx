import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Get API URL from environment or use default
// In production, VITE_API_URL must be set in Vercel environment variables
// Normalize URL to always end with /api
const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  // Remove trailing slashes
  const baseUrl = envUrl.replace(/\/+$/, '');
  // Ensure it ends with /api
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

const API_URL = getApiUrl();

// Log API URL in development for debugging
if (import.meta.env.DEV) {
  console.log('API URL:', API_URL);
}

// Configure axios defaults
axios.defaults.baseURL = API_URL;
// Enable credentials (cookies) for all requests
axios.defaults.withCredentials = true;
// Set timeout to 90 seconds (90000ms) for Render's slow cold starts
// Render free tier can take 30-60s to wake up, so we need longer timeouts
// This prevents infinite hangs while allowing Render enough time to respond
axios.defaults.timeout = 90000; // 90 seconds

// Axios response interceptor for global error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Skip toast for login endpoint - errors are handled in login function
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    
    // Handle timeout errors (check before network errors)
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      if (!isLoginEndpoint) {
        toast.error('Request timeout after 90 seconds. The server may be starting up. Please try again in a moment.');
      }
      return Promise.reject(error);
    }
    
    // Handle network errors (connection issues, no response, etc.)
    if (!error.response) {
      if (!isLoginEndpoint) {
        toast.error('Network error. Please check your connection.');
      }
      return Promise.reject(error);
    }

    // Handle different HTTP status codes
    const status = error.response?.status;
    const message = error.response?.data?.message || 'An error occurred';

    // Skip toast notifications for login endpoint errors
    if (isLoginEndpoint) {
      return Promise.reject(error);
    }

    switch (status) {
      case 400:
        toast.error(message || 'Bad request. Please check your input.');
        break;
      case 401:
        // Don't show toast for 401 on login page
        if (!window.location.pathname.includes('/login')) {
          // Check if this is a SuperAdmin code error (from void endpoint or settings)
          const isVoidEndpoint = error.config?.url?.includes('/sales/') && error.config?.url?.includes('/void');
          const isSuperAdminError = message?.toLowerCase().includes('superadmin') || 
                                    message?.toLowerCase().includes('super admin') ||
                                    isVoidEndpoint;
          
          if (isSuperAdminError) {
            // Show the actual error message from backend for SuperAdmin code errors
            toast.error(message || 'Invalid SuperAdmin code');
          } else {
            // For actual authentication errors, show session expired
            toast.error('Session expired. Please login again.');
          }
        }
        break;
      case 403:
        toast.error('Access denied. You do not have permission to perform this action.');
        break;
      case 404:
        toast.error(message || 'Resource not found.');
        break;
      case 423:
        toast.error(message || 'Account is locked.');
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      default:
        toast.error(message || 'An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated by fetching user data
    // Cookie will be sent automatically with credentials enabled
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      // Use longer timeout for auth check since Render can be slow on cold starts
      // This is critical for initial page load, so we give it more time
      const response = await axios.get('/auth/me', {
        timeout: 90000 // 90 seconds - same as global timeout for Render compatibility
      });
      
      setUser(response.data.user);
    } catch (error) {
      // If authentication fails, clear user state
      // Cookie will be automatically handled by browser
      setUser(null);
      
      // Log error in development for debugging
      if (import.meta.env.DEV) {
        console.error('Auth check failed:', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post('/auth/login', { username, password });
      const { user } = response.data;
      
      // Token is now stored in httpOnly cookie, no need to manage it in frontend
      setUser(user);
      
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      // Show error toast for login failures (interceptor skips login endpoint)
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      const status = error.response?.status;
      
      // Show appropriate error message based on status
      if (status === 423) {
        toast.error(message || 'Account is locked.');
      } else if (status === 403) {
        toast.error(message || 'Access denied. Your account may be inactive.');
      } else if (status === 401) {
        toast.error(message || 'Invalid credentials.');
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('Request timeout after 90 seconds. The server may be starting up. Please try again.');
      } else if (!error.response) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(message);
      }
      
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      // Call backend logout to clear httpOnly cookie
      await axios.post('/auth/logout');
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      // Even if logout fails, clear local state
      setUser(null);
      // Error toast is handled by interceptor
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/auth/profile', profileData);
      const { user: updatedUser } = response.data;
      setUser(updatedUser);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      return { success: false, message };
    }
  };

  const resetPassword = async (currentPassword, newPassword) => {
    try {
      await axios.post('/auth/reset-password', {
        currentPassword,
        newPassword
      });
      toast.success('Password reset successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset password';
      return { success: false, message };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateProfile,
    resetPassword,
    fetchUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'staff'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

