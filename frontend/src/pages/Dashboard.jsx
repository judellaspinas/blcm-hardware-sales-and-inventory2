import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatLocalDate, formatCurrencyDisplay } from '../utils/utils';

const Dashboard = () => {
  const { isStaff, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    dailySales: 0,
    weeklySales: 0,
    yearlySales: 0
  });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to load before fetching dashboard data
    if (!authLoading) {
      fetchDashboardData();
    }
  }, [authLoading]);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      const todayStr = formatLocalDate(today);

      // Calculate date ranges
      // Daily: Today
      const dailyStart = new Date(today);
      dailyStart.setHours(0, 0, 0, 0);
      const dailyStartStr = formatLocalDate(dailyStart);

      // Weekly: Last 7 days
      const weeklyStart = new Date(today);
      weeklyStart.setDate(today.getDate() - 7);
      const weeklyStartStr = formatLocalDate(weeklyStart);

      // Yearly: Start of current year
      const yearlyStart = new Date(today.getFullYear(), 0, 1);
      const yearlyStartStr = formatLocalDate(yearlyStart);

      const promises = [
        axios.get('/products'),
        axios.get('/inventory/alerts'),
        axios.get(`/sales?startDate=${dailyStartStr}&endDate=${todayStr}`),
        axios.get(`/sales?startDate=${weeklyStartStr}&endDate=${todayStr}`),
        axios.get(`/sales?startDate=${yearlyStartStr}&endDate=${todayStr}`)
      ];

      const results = await Promise.all(promises);
      const [productsRes, inventoryRes, dailySalesRes, weeklySalesRes, yearlySalesRes] = results;

      // Calculate daily sales (today)
      let dailySales = 0;
      if (dailySalesRes?.data?.data) {
        const validDailySales = dailySalesRes.data.data.filter(sale => !sale.isVoid);
        dailySales = validDailySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      }

      // Calculate weekly sales (last 7 days)
      let weeklySales = 0;
      if (weeklySalesRes?.data?.data) {
        const validWeeklySales = weeklySalesRes.data.data.filter(sale => !sale.isVoid);
        weeklySales = validWeeklySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      }

      // Calculate yearly sales (current year)
      let yearlySales = 0;
      if (yearlySalesRes?.data?.data) {
        const validYearlySales = yearlySalesRes.data.data.filter(sale => !sale.isVoid);
        yearlySales = validYearlySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      }

      // Get low stock items (limit to 3 for display)
      const lowStockProducts = inventoryRes.data.data || [];
      setLowStockItems(lowStockProducts.slice(0, 3));

      setStats({
        totalProducts: productsRes.data.count || 0,
        lowStockProducts: inventoryRes.data.count || 0,
        dailySales,
        weeklySales,
        yearlySales
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Products</p>
              <p className="text-3xl font-bold mt-2">{stats.totalProducts}</p>
            </div>
            <span className="text-4xl">📦</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Daily Sales</p>
              <p className="text-3xl font-bold mt-2">{formatCurrencyDisplay(stats.dailySales)}</p>
            </div>
            <span className="text-4xl">📊</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Weekly Sales</p>
              <p className="text-3xl font-bold mt-2">{formatCurrencyDisplay(stats.weeklySales)}</p>
            </div>
            <span className="text-4xl">📈</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Yearly Sales</p>
              <p className="text-3xl font-bold mt-2">{formatCurrencyDisplay(stats.yearlySales)}</p>
            </div>
            <span className="text-4xl">💰</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <ul className="space-y-2">
            {!isStaff && (
              <li>
                <Link to="/products" className="flex items-center space-x-2 hover:text-blue-600 transition-colors">
                  <span>📦</span>
                  <span>Manage Products</span>
                </Link>
              </li>
            )}
            <li>
              <Link to="/sales" className="flex items-center space-x-2 hover:text-blue-600 transition-colors">
                <span>💰</span>
                <span>Process Sale</span>
              </Link>
            </li>
            <li>
              <Link to="/inventory" className="flex items-center space-x-2 hover:text-blue-600 transition-colors">
                <span>📋</span>
                <span>Check Inventory</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Low Stock Alert</h2>
          {stats.lowStockProducts > 0 ? (
            <div className="space-y-4">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800 font-medium mb-2">
                  ⚠️ {stats.lowStockProducts} {stats.lowStockProducts === 1 ? 'item' : 'items'} {stats.lowStockProducts === 1 ? 'is' : 'are'} running low on stock
                </p>
              </div>
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div key={item._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-600">
                        Stock: {item.stockQuantity} / Threshold: {item.lowStockThreshold}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      item.stockQuantity === 0 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {item.stockQuantity === 0 ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  </div>
                ))}
              </div>
              <Link 
                to="/inventory" 
                className="block text-center text-blue-600 hover:text-blue-800 font-medium text-sm mt-2"
              >
                {stats.lowStockProducts > 3 
                  ? `See more (${stats.lowStockProducts - 3} more ${stats.lowStockProducts - 3 === 1 ? 'item' : 'items'})`
                  : 'See more'}
              </Link>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 text-sm">All items are well stocked</p>
              <Link 
                to="/inventory" 
                className="text-blue-600 hover:text-blue-800 font-medium text-sm mt-2 inline-block"
              >
                View Inventory
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

