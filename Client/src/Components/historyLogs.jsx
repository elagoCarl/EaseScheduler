import { useState, useEffect } from "react";
import Axios from '../axiosConfig.js';
import dayjs from 'dayjs';
import Background from './Img/1.jpg';
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";
import { useNavigate } from 'react-router-dom';

const HistoryLogs = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const fetchHistoryLogs = async () => {
    try {
      setLoading(true);
      const response = await Axios.get('/historyLogs/getAllHistoryLogs');
      if (response.data.successful) {
        setLogs(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError("Error fetching history logs: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryLogs();
  }, []);

  const formatDate = (dateString) => {
    return dayjs(dateString).format('MMM D, YYYY h:mm A');
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedLogs = [...logs].sort((a, b) => {
    if (sortConfig.key === 'createdAt') {
      return sortConfig.direction === 'asc'
        ? new Date(a[sortConfig.key]) - new Date(b[sortConfig.key])
        : new Date(b[sortConfig.key]) - new Date(a[sortConfig.key]);
    }

    // For sorting by Account Email
    if (sortConfig.key === 'Account.Email') {
      const emailA = a.Account?.Email || '';
      const emailB = b.Account?.Email || '';
      return sortConfig.direction === 'asc'
        ? emailA.localeCompare(emailB)
        : emailB.localeCompare(emailA);
    }

    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const filteredLogs = sortedLogs.filter(log =>
    log.Account?.Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.Account?.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.Page?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.Details?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid h-screen place-content-center bg-white px-4">
        <div className="text-center">
          <p className="text-2xl font-bold tracking-tight text-gray-900 sm:text-4xl">Oh No!</p>
          <p className="mt-4 text-gray-500">Error: {error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 inline-block rounded bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring">
            Go Back Home
          </button>
          <button
            onClick={fetchHistoryLogs}
            className="mt-6 ml-4 inline-block rounded bg-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const SortIcon = ({ columnName }) => {
    if (sortConfig.key !== columnName) return <span className="text-gray-300 ml-4 mb-3">↕</span>;
    return sortConfig.direction === 'asc' ? <span className="ml-5 mb-2">↑</span> : <span className="ml-5 mb-2">↓</span>;
  };

  return (
    <div className="bg-cover bg-no-repeat min-h-screen bg-gray-800">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <TopMenu toggleSidebar={toggleSidebar} />

      <div className="container mx-auto px-4 py-8 pt-20 flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-gray-100">
          {/* Header with floating search bar */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-white">History Logs</h1>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-4 pl-18 pr-10 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-md"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute top-2.5 text-gray-400 hover:text-gray-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={fetchHistoryLogs}
                className="p-2.5 bg-white text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors duration-300 flex items-center justify-center shadow-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium text-gray-600">No logs found matching your search criteria.</p>
              <p className="text-gray-400 mt-1">Try adjusting your search or refresh the page</p>
            </div>
          ) : (
            <>
              {/* Table for medium screens and above */}
              <div className="hidden md:block">
                <div className="max-h-[60vh] overflow-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-700 text-sm uppercase sticky top-0">
                      <tr>
                        <th className="px-6 py-4 cursor-pointer" onClick={() => requestSort('createdAt')}>
                          <div className="flex items-center">
                            <span>Timestamp</span>
                            <SortIcon columnName="createdAt" />
                          </div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer" onClick={() => requestSort('Account.Email')}>
                          <div className="flex items-center">
                            <span>Email</span>
                            <SortIcon columnName="Account.Email" />
                          </div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer" onClick={() => requestSort('Page')}>
                          <div className="flex items-center">
                            <span>Page</span>
                            <SortIcon columnName="Page" />
                          </div>
                        </th>
                        <th className="px-6 py-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {filteredLogs.map((log, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="font-medium text-gray-900">{formatDate(log.createdAt)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="font-semibold text-indigo-600">{log.Account?.Email || 'N/A'}</span>
                            {log.Account?.Name && <span className="text-xs text-gray-500 block mt-1">{log.Account.Name}</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {log.Page}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="max-w-sm overflow-hidden text-ellipsis">{log.Details}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cards for small screens */}
              <div className="block md:hidden space-y-4 max-h-[60vh] overflow-auto p-4">
                {filteredLogs.map((log, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{log.Page}</span>
                      <p className="text-xs text-gray-400">{formatDate(log.createdAt)}</p>
                    </div>
                    <p className="text-sm font-medium text-indigo-600 mb-1">
                      {log.Account?.Email || 'N/A'}
                    </p>
                    {log.Account?.Name && <p className="text-xs text-gray-500 mb-2">{log.Account.Name}</p>}
                    <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
                      {log.Details}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
          
          <div className="px-6 py-3 bg-gray-50 text-right text-sm text-gray-500 border-t border-gray-100">
            Showing {filteredLogs.length} of {logs.length} logs
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryLogs;