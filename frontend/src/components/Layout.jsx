import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { HiChevronRight, HiMenu, HiX } from 'react-icons/hi';

const Layout = () => {
  const { user, logout, isAdmin, isStaff } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Auto-expand Products menu if on products or categories page
  const [expandedMenus, setExpandedMenus] = useState(() => {
    const path = location.pathname;
    if (path === '/products' || path === '/categories') {
      return { Products: true };
    }
    return {};
  });

  // Role-based navigation menu organized into logical groups
  const getNavigation = () => {
    if (isAdmin) {
      return [
        // Core Operations
        { name: 'Dashboard', path: '/dashboard', icon: '📊', group: 'Core' },
        { name: 'Sales', path: '/sales', icon: '💰', group: 'Core' },
        { name: 'Inventory', path: '/inventory', icon: '🗂️', group: 'Core' },
        
        // Product Management
        { 
          name: 'Products', 
          icon: '📦',
          group: 'Products',
          submenu: [
            { name: 'Product List', path: '/products', icon: '📋' },
            { name: 'Category List', path: '/categories', icon: '🏷️' }
          ]
        },
        { name: 'Suppliers', path: '/suppliers', icon: '🏢', group: 'Products' },
        
        // Administration
        { name: 'Reports', path: '/reports', icon: '📈', group: 'Admin' },
        { name: 'Users', path: '/users', icon: '👥', group: 'Admin' },
        { name: 'Settings', path: '/settings', icon: '⚙️', group: 'Admin' },
      ];
    } else if (isStaff) {
      return [
        // Core Operations
        { name: 'Dashboard', path: '/dashboard', icon: '📊', group: 'Core' },
        { name: 'Sales', path: '/sales', icon: '💰', group: 'Core' },
        { name: 'Inventory', path: '/inventory', icon: '🗂️', group: 'Core' },
      ];
    }
    return [];
  };

  const navigation = getNavigation();

  const isActive = (path) => location.pathname === path;

  const toggleMenu = (menuName) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  const isMenuExpanded = (menuName) => expandedMenus[menuName] || false;

  const hasActiveSubmenu = (submenu) => {
    if (!submenu) return false;
    return submenu.some(item => isActive(item.path));
  };

  // Group navigation items by their group property
  const groupedNavigation = navigation.reduce((acc, item) => {
    const group = item.group || 'Other';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {});

  // Define group order and labels
  const groupOrder = ['Core', 'Products', 'Admin'];
  const groupLabels = {
    'Core': 'Core Operations',
    'Products': 'Product Management',
    'Admin': 'Administration'
  };

  // Auto-expand Products menu when on products or categories page
  useEffect(() => {
    const path = location.pathname;
    if (path === '/products' || path === '/categories') {
      setExpandedMenus(prev => ({ ...prev, Products: true }));
    }
  }, [location.pathname]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-gray-900 text-white z-40 flex items-center justify-between p-4">
        <div className="flex items-center space-x-2">
          <img 
            src="/images/blcm-logo.png" 
            alt="BLCM Logo" 
            className="h-8 w-8 object-contain"
          />
          <h1 className="text-xl font-bold">BLCM</h1>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-gray-900 text-white z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img 
                  src="/images/blcm-logo.png" 
                  alt="BLCM Logo" 
                  className="h-10 w-10 object-contain"
                />
                <div>
                  <h1 className="text-2xl font-bold">BLCM</h1>
                  <p className="text-sm text-gray-400">Sales & Inventory</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
                aria-label="Close menu"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-4 overflow-y-auto sidebar-scroll">
            {groupOrder.map((groupKey) => {
              const groupItems = groupedNavigation[groupKey];
              if (!groupItems || groupItems.length === 0) return null;

              return (
                <div key={groupKey} className="space-y-2">
                  {/* Group Header */}
                  <div className="px-4 py-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {groupLabels[groupKey] || groupKey}
                    </h3>
                  </div>
                  
                  {/* Group Items */}
                  <div className="space-y-1">
                    {groupItems.map((item) => {
                      if (item.submenu) {
                        const isExpanded = isMenuExpanded(item.name);
                        const hasActive = hasActiveSubmenu(item.submenu);
                        
                        return (
                          <div key={item.name}>
                            <button
                              onClick={() => toggleMenu(item.name)}
                              className={`w-full flex items-center justify-between space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                hasActive
                                  ? 'bg-gray-800 text-white'
                                  : 'text-gray-300 hover:bg-gray-800'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <span className="text-xl">{item.icon}</span>
                                <span>{item.name}</span>
                              </div>
                              <HiChevronRight className={`text-sm transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                            {isExpanded && (
                              <div className="ml-4 mt-1 space-y-1">
                                {item.submenu.map((subItem) => (
                                  <Link
                                    key={subItem.path}
                                    to={subItem.path}
                                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                                      isActive(subItem.path)
                                        ? 'bg-gray-800 text-white'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                                    }`}
                                  >
                                    <span className="text-lg">{subItem.icon}</span>
                                    <span>{subItem.name}</span>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                            isActive(item.path)
                              ? 'bg-gray-800 text-white'
                              : 'text-gray-300 hover:bg-gray-800'
                          }`}
                        >
                          <span className="text-xl">{item.icon}</span>
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-800">
            <Link
              to="/profile"
              className={`flex items-center justify-between mb-4 p-3 rounded-lg transition-colors ${
                isActive('/profile')
                  ? 'bg-gray-800'
                  : 'hover:bg-gray-800 cursor-pointer'
              }`}
            >
              <div>
                <p className="font-semibold">{user?.username}</p>
                <p className="text-sm text-gray-400 capitalize">{user?.role}</p>
              </div>
            </Link>
            <button
              onClick={logout}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        <main className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

