import { useState, useEffect, useMemo, useRef } from 'react';

/**
 * Reusable Pagination Component
 * @param {Object} props
 * @param {Array} props.data - The full array of data to paginate
 * @param {number} props.itemsPerPage - Number of items per page (default: 10)
 * @param {Function} props.onPageChange - Callback when page changes, receives paginated data
 * @param {string} props.className - Additional CSS classes
 */
const Pagination = ({ 
  data = [], 
  itemsPerPage = 10, 
  onPageChange,
  className = '' 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPageState, setItemsPerPageState] = useState(itemsPerPage);
  
  // Store the latest onPageChange callback in a ref to avoid dependency issues
  const onPageChangeRef = useRef(onPageChange);
  
  // Update ref when callback changes
  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  const totalPages = Math.ceil(data.length / itemsPerPageState);
  const startIndex = (currentPage - 1) * itemsPerPageState;
  const endIndex = startIndex + itemsPerPageState;
  
  // Memoize paginatedData to prevent unnecessary re-renders and infinite loops
  const paginatedData = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);
  
  const startItem = data.length > 0 ? startIndex + 1 : 0;
  const endItem = Math.min(endIndex, data.length);

  // Reset to page 1 when data length changes or itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, itemsPerPageState]);

  // Notify parent component of paginated data changes
  // Use ref to avoid dependency on onPageChange function reference
  useEffect(() => {
    if (onPageChangeRef.current) {
      onPageChangeRef.current(paginatedData);
    }
  }, [paginatedData]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Scroll to top of table on page change
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = parseInt(e.target.value, 10);
    setItemsPerPageState(newItemsPerPage);
    setCurrentPage(1);
  };

  if (data.length === 0) {
    return null;
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, last page, and pages around current
      if (currentPage <= 3) {
        // Near the start
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className={`bg-white rounded-lg shadow px-4 sm:px-6 py-4 mt-4 ${className}`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Items per page selector and info */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <label htmlFor="itemsPerPage" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Items per page:
            </label>
            <select
              id="itemsPerPage"
              value={itemsPerPageState}
              onChange={handleItemsPerPageChange}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:border-gray-400"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="text-sm text-gray-600 font-medium">
            Showing <span className="font-semibold text-gray-900">{startItem}</span> to{' '}
            <span className="font-semibold text-gray-900">{endItem}</span> of{' '}
            <span className="font-semibold text-gray-900">{data.length}</span> entries
          </div>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all shadow-sm disabled:shadow-none"
            aria-label="Previous page"
          >
            Previous
          </button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500 font-medium">
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-4 py-2 min-w-[2.5rem] border rounded-lg text-sm font-medium transition-all shadow-sm ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-md'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100'
                  }`}
                  aria-label={`Go to page ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all shadow-sm disabled:shadow-none"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;

