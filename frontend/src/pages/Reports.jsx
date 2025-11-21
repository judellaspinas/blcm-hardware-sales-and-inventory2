import { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { formatCurrency, formatCurrencyDisplay, formatPaymentMethod, formatLocalDate } from '../utils/utils';

// Lazy load heavy libraries - only load when needed
const loadRecharts = () => import('recharts').then(module => ({
  LineChart: module.LineChart,
  Line: module.Line,
  BarChart: module.BarChart,
  Bar: module.Bar,
  XAxis: module.XAxis,
  YAxis: module.YAxis,
  CartesianGrid: module.CartesianGrid,
  Tooltip: module.Tooltip,
  Legend: module.Legend,
  ResponsiveContainer: module.ResponsiveContainer,
}));

const loadPDF = () => Promise.all([
  import('jspdf'),
  import('jspdf-autotable')
]).then(([jsPDFModule, autoTableModule]) => ({
  jsPDF: jsPDFModule.default,
  autoTable: autoTableModule.default,
}));

const loadDateFns = () => import('date-fns').then(module => ({
  format: module.format,
}));

// Chart components with lazy loading
const ChartWrapper = ({ reportData }) => {
  const [chartComponents, setChartComponents] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecharts().then(components => {
      setChartComponents(components);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-[300px]">Loading chart...</div>;
  }

  if (!chartComponents || !reportData?.data) return null;

  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = chartComponents;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={reportData.data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue (₱)" />
        <Line type="monotone" dataKey="sales" stroke="#82ca9d" name="Number of Sales" />
      </LineChart>
    </ResponsiveContainer>
  );
};

const Reports = () => {
  // Calculate default dates
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return formatLocalDate(date);
  };

  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(formatLocalDate(new Date()));
  const [reports, setReports] = useState({
    sales: null,
    inventory: null,
    topProducts: null,
    revenueTrends: null,
  });
  const [loading, setLoading] = useState({
    sales: false,
    inventory: false,
    topProducts: false,
    revenueTrends: false,
  });

  // Calculate sales performance insights
  const getSalesPerformanceInsights = () => {
    if (!reports.revenueTrends?.data || reports.revenueTrends.data.length < 2) {
      return {
        text: 'Insufficient data to analyze sales performance. Please select a period with at least 2 days of data.',
        type: 'info',
      };
    }

    if (!reports.sales?.summary) {
      return {
        text: 'Sales summary data is not available.',
        type: 'info',
      };
    }

    const trendData = reports.revenueTrends.data;
    const revenues = trendData.map(item => item.revenue || 0);
    
    const firstHalf = revenues.slice(0, Math.floor(revenues.length / 2));
    const secondHalf = revenues.slice(Math.floor(revenues.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    // Calculate days in period for consistent average daily revenue calculation
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // Use total revenue from sales summary divided by total days in period
    const avgDailyRevenue = reports.sales.summary.totalRevenue / daysDiff;
    const highestDay = Math.max(...revenues);
    const lowestDay = Math.min(...revenues);
    const highestDayIndex = revenues.indexOf(highestDay);
    const bestDay = trendData[highestDayIndex]?.date || 'N/A';

    const changePercent = firstHalfAvg > 0 
      ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 
      : 0;

    let insight = '';
    let type = 'info';

    if (Math.abs(changePercent) < 5) {
      insight = `Sales performance remained relatively stable with an average daily revenue of ${formatCurrencyDisplay(avgDailyRevenue)}. The best day generated ${formatCurrencyDisplay(highestDay)} while the lowest was ${formatCurrencyDisplay(lowestDay)}.`;
      type = 'info';
    } else if (changePercent > 0) {
      insight = `Sales performance shows a positive trend, increasing by approximately ${changePercent.toFixed(1)}% in the second half of the period. Average daily revenue is ${formatCurrencyDisplay(avgDailyRevenue)} with a peak of ${formatCurrencyDisplay(highestDay)} on ${bestDay}.`;
      type = 'success';
    } else {
      insight = `Sales performance shows a declining trend, decreasing by approximately ${Math.abs(changePercent).toFixed(1)}% in the second half of the period. Average daily revenue is ${formatCurrencyDisplay(avgDailyRevenue)}. Consider reviewing sales strategies.`;
      type = 'warning';
    }

    return { text: insight, type, avgDailyRevenue, highestDay, lowestDay, bestDay, changePercent };
  };

  // Calculate additional sales performance metrics
  const getSalesPerformanceMetrics = () => {
    if (!reports.sales?.summary || !reports.revenueTrends?.data) {
      return null;
    }

    const salesSummary = reports.sales.summary;
    const trendData = reports.revenueTrends.data;
    
    // Calculate days in period
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // Average daily revenue
    const avgDailyRevenue = salesSummary.totalRevenue / daysDiff;
    
    // Find best day
    const bestDayData = trendData.reduce((best, current) => 
      (current.revenue || 0) > (best.revenue || 0) ? current : best, 
      trendData[0] || { date: 'N/A', revenue: 0 }
    );
    
    // Calculate growth percentage (comparing first half vs second half)
    const revenues = trendData.map(item => item.revenue || 0);
    const firstHalf = revenues.slice(0, Math.floor(revenues.length / 2));
    const secondHalf = revenues.slice(Math.floor(revenues.length / 2));
    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length : 0;
    const growthPercent = firstHalfAvg > 0 
      ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 
      : 0;

    return {
      avgDailyRevenue,
      bestDay: bestDayData.date,
      bestDayRevenue: bestDayData.revenue || 0,
      growthPercent,
      daysInPeriod: daysDiff
    };
  };

  // Fetch all reports on mount and when dates change
  useEffect(() => {
    fetchAllReports();
  }, [startDate, endDate]);

  const fetchAllReports = async () => {
    // Fetch all reports in parallel
    setLoading({
      sales: true,
      inventory: true,
      topProducts: true,
      revenueTrends: true,
    });

    try {
      const [salesRes, inventoryRes, topProductsRes, revenueTrendsRes] = await Promise.allSettled([
        axios.get(`/reports/sales?startDate=${startDate}&endDate=${endDate}`),
        axios.get('/reports/inventory'),
        axios.get(`/reports/top-products?startDate=${startDate}&endDate=${endDate}&limit=10`),
        axios.get(`/reports/revenue-trends?startDate=${startDate}&endDate=${endDate}&groupBy=day`),
      ]);

      setReports({
        sales: salesRes.status === 'fulfilled' ? salesRes.value.data : null,
        inventory: inventoryRes.status === 'fulfilled' ? inventoryRes.value.data : null,
        topProducts: topProductsRes.status === 'fulfilled' ? topProductsRes.value.data : null,
        revenueTrends: revenueTrendsRes.status === 'fulfilled' ? revenueTrendsRes.value.data : null,
      });

      // Show error toast for any failed requests
      if (salesRes.status === 'rejected') {
        console.error('Error fetching sales report:', salesRes.reason);
      }
      if (inventoryRes.status === 'rejected') {
        console.error('Error fetching inventory report:', inventoryRes.reason);
      }
      if (topProductsRes.status === 'rejected') {
        console.error('Error fetching top products report:', topProductsRes.reason);
      }
      if (revenueTrendsRes.status === 'rejected') {
        console.error('Error fetching revenue trends report:', revenueTrendsRes.reason);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading({
        sales: false,
        inventory: false,
        topProducts: false,
        revenueTrends: false,
      });
    }
  };

  const exportSalesToPDF = async () => {
    if (!reports.sales) {
      toast.error('No sales report data available');
      return;
    }

    try {
      const { jsPDF, autoTable } = await loadPDF();
      const { format } = await loadDateFns();
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let yPosition = margin;

      // Title
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('Sales Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Period
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const periodText = reports.sales.period
        ? `Period: ${format(new Date(reports.sales.period.startDate), 'MMMM dd, yyyy')} to ${format(new Date(reports.sales.period.endDate), 'MMMM dd, yyyy')}`
        : `Period: ${format(new Date(startDate), 'MMMM dd, yyyy')} to ${format(new Date(endDate), 'MMMM dd, yyyy')}`;
      doc.text(periodText, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;

      // Generated date
      doc.text(`Generated on: ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Summary Section
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Summary', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const summaryData = [
        ['Total Transactions', (reports.sales.summary?.totalSales ?? 0).toString()],
        ['Total Sales', formatCurrency(reports.sales.summary?.totalRevenue ?? 0)],
        ['Profit', formatCurrency(reports.sales.summary?.profit ?? 0)],
        ['Total VAT (12%)', formatCurrency(reports.sales.summary?.totalVAT ?? 0)]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 }
      });

      yPosition = doc.lastAutoTable.finalY + 10;

      // Transactions List
      if (reports.sales.data && reports.sales.data.length > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Transactions', margin, yPosition);
        yPosition += 8;

        const transactionsData = reports.sales.data.map(sale => {
          const saleDate = sale.createdAt ? format(new Date(sale.createdAt), 'MM/dd/yy HH:mm') : '-';
          const customer = sale.customerName || 'Walk-in';
          const truncatedCustomer = customer.length > 15 ? customer.substring(0, 12) + '...' : customer;
          
          const itemsText = sale.items && sale.items.length > 0
            ? sale.items.map(item => {
                const productName = item.product?.name || 'Unknown';
                return `• ${productName} (${item.quantity}x)`;
              }).join('\n')
            : 'No items';

          const paymentShort = sale.paymentMethod === 'mobile_payment' ? 'Mobile' : formatPaymentMethod(sale.paymentMethod || 'cash');
          const staffShort = sale.cashier?.username || '-';
          const truncatedStaff = staffShort.length > 10 ? staffShort.substring(0, 7) + '...' : staffShort;

          return [
            sale.saleNumber || '-',
            saleDate,
            truncatedCustomer,
            itemsText,
            formatCurrency(sale.subtotal || 0),
            formatCurrency(sale.tax || 0),
            formatCurrency(sale.total || 0),
            paymentShort,
            truncatedStaff
          ];
        });

        autoTable(doc, {
          startY: yPosition,
          head: [['Sale #', 'Date', 'Customer', 'Items', 'Subtotal', 'Tax', 'Total', 'Payment', 'Admin/Staff']],
          body: transactionsData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 7 },
          margin: { left: margin, right: margin },
          tableWidth: 'wrap',
          styles: { fontSize: 6, cellPadding: 1 },
          columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 22 },
            2: { cellWidth: 20 },
            3: { cellWidth: 45, cellMinHeight: 8 },
            4: { cellWidth: 18 },
            5: { cellWidth: 15 },
            6: { cellWidth: 18 },
            7: { cellWidth: 18 },
            8: { cellWidth: 18 }
          },
          didParseCell: function (data) {
            data.cell.styles.cellPadding = { top: 1, bottom: 1, left: 1, right: 1 };
            if (data.column.index === 3) {
              data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 1, right: 1 };
            }
          }
        });
      }

      const fileName = `Sales_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      toast.success('Sales report exported to PDF successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to export PDF. Please try again.');
    }
  };

  const isLoading = Object.values(loading).some(l => l);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Reports & Analytics</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-gray-600">Loading reports...</p>
        </div>
      )}

      {/* Sales Report Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-xl font-semibold">Sales Report</h2>
          {reports.sales && (
            <button
              onClick={exportSalesToPDF}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
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
          )}
        </div>
        {loading.sales ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          </div>
        ) : reports.sales?.summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-gray-600 text-sm mb-1">Total Transactions</div>
              <div className="text-2xl font-bold">{reports.sales.summary.totalSales ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-gray-600 text-sm mb-1">Total Sales</div>
              <div className="text-2xl font-bold">{formatCurrencyDisplay(reports.sales.summary.totalRevenue ?? 0)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-gray-600 text-sm mb-1">Profit</div>
              <div className="text-2xl font-bold">{formatCurrencyDisplay(reports.sales.summary.profit ?? 0)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-gray-600 text-sm mb-1">Total VAT (12%)</div>
              <div className="text-2xl font-bold">{formatCurrencyDisplay(reports.sales.summary.totalVAT ?? 0)}</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No sales data available for the selected period.</p>
          </div>
        )}
      </div>

      {/* Inventory Report Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Inventory Report</h2>
        {loading.inventory ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          </div>
        ) : reports.inventory?.summary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-gray-600 text-sm mb-1">Total Products</div>
                <div className="text-2xl font-bold">{reports.inventory.summary.totalProducts ?? 0}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-gray-600 text-sm mb-1">Total Stock Value</div>
                <div className="text-2xl font-bold">{formatCurrencyDisplay(reports.inventory.summary.totalStockValue ?? 0)}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-gray-600 text-sm mb-1">Low Stock Items</div>
                <div className="text-2xl font-bold text-orange-600">{reports.inventory.summary.lowStockCount ?? 0}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-gray-600 text-sm mb-1">Out of Stock</div>
                <div className="text-2xl font-bold text-red-600">{reports.inventory.summary.outOfStockCount ?? 0}</div>
              </div>
            </div>
            {(reports.inventory.summary.lowStockCount > 0 || reports.inventory.summary.outOfStockCount > 0) && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Alert:</strong> You have {reports.inventory.summary.lowStockCount} low stock items and {reports.inventory.summary.outOfStockCount} out of stock items that need attention.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No inventory data available.</p>
          </div>
        )}
      </div>

      {/* Sales Performance Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Sales Performance</h2>
        {loading.revenueTrends ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          </div>
        ) : reports.revenueTrends?.data && reports.revenueTrends.data.length > 0 ? (
          <div className="space-y-6">
            {/* Key Insights */}
            {(() => {
              const insights = getSalesPerformanceInsights();
              if (!insights) return null;
              
              const insightColors = {
                success: 'bg-green-50 border-green-200 text-green-800',
                warning: 'bg-orange-50 border-orange-200 text-orange-800',
                info: 'bg-blue-50 border-blue-200 text-blue-800',
              };
              
              const insightIcons = {
                success: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
                warning: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                ),
                info: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              };
              
              return (
                <div className={`p-4 rounded-lg border-l-4 ${insightColors[insights.type]}`}>
                  <div className="flex items-start gap-3">
                    {insightIcons[insights.type]}
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Key Insights</h3>
                      <p className="text-sm leading-relaxed">{insights.text}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Performance Metrics */}
            {(() => {
              const metrics = getSalesPerformanceMetrics();
              if (!metrics) return null;
              
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="text-gray-600 text-sm mb-1">Avg. Daily Revenue</div>
                    <div className="text-2xl font-bold">{formatCurrencyDisplay(metrics.avgDailyRevenue)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="text-gray-600 text-sm mb-1">Growth Rate</div>
                    <div className={`text-2xl font-bold ${metrics.growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.growthPercent >= 0 ? '+' : ''}{metrics.growthPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Best Day Performance */}
            {(() => {
              const metrics = getSalesPerformanceMetrics();
              if (!metrics || !metrics.bestDay || metrics.bestDay === 'N/A') return null;
              
              return (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-blue-700 text-sm font-medium mb-1">Best Performing Day</div>
                      <div className="text-blue-900 text-lg font-semibold">{metrics.bestDay}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-700 text-sm font-medium mb-1">Revenue</div>
                      <div className="text-blue-900 text-xl font-bold">{formatCurrencyDisplay(metrics.bestDayRevenue)}</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Line Chart */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Revenue & Sales Trend</h3>
              <Suspense fallback={<div className="flex items-center justify-center h-[300px]">Loading chart...</div>}>
                <ChartWrapper reportData={reports.revenueTrends} />
              </Suspense>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No sales performance data available for the selected period.</p>
          </div>
        )}
      </div>

      {/* Top Products Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Top Selling Products</h2>
        {loading.topProducts ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          </div>
        ) : reports.topProducts?.data && reports.topProducts.data.length > 0 ? (
          <div className="space-y-3">
            {reports.topProducts.count !== undefined && (
              <p className="text-sm text-gray-600 mb-4">
                Showing top {reports.topProducts.data.length} of {reports.topProducts.count} products with sales
              </p>
            )}
            {reports.topProducts.data.map((product, index) => (
              <div
                key={product.productId || product._id || index}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-700 font-bold">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {product.productName || product.name || 'Unknown Product'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Revenue: {formatCurrencyDisplay(product.totalRevenue || 0)}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm text-gray-500">Units Sold</p>
                  <p className="text-xl font-bold text-gray-900">
                    {product.totalQuantity || 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No product sales data available for the selected period.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
