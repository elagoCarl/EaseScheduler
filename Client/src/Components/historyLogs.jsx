import { useState, useEffect } from "react";
import Axios from 'axios';
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
      const response = await Axios.get('http://localhost:8080/historyLogs/getAllHistoryLogs');
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

    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const filteredLogs = sortedLogs.filter(log =>
    log.AccountId?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.Page?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.Details?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="rounded-md h-12 w-12 border-4 border-t-4 border-blue-500 animate-spin"></div>
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
            className="mt-6 inline-block rounded bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring">
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
    if (sortConfig.key !== columnName) return <span className="text-gray-300">↕</span>;
    return sortConfig.direction === 'asc' ? <span>↑</span> : <span>↓</span>;
  };

  return (
    <div className="bg-cover bg-no-repeat min-h-screen" style={{ backgroundImage: `url(${Background})` }}>
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <TopMenu toggleSidebar={toggleSidebar} />

      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="bg-white bg-opacity-95 shadow-lg rounded-lg w-full p-4 md:p-8 my-60">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 text-center mb-4">History Logs</h1>

          <div className="mb-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={fetchHistoryLogs}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
            >
              <span className="mr-2">↻</span> Refresh
            </button>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No logs found matching your search criteria.
            </div>
          ) : (
            <>
              {/* Table for medium screens and above */}
              <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200">
                <div className="overflow-auto max-h-[70vh]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-blue-600 text-white text-sm uppercase sticky top-0">
                      <tr>
                        <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('createdAt')}>
                          <div className="flex items-center">
                            Timestamp <SortIcon columnName="createdAt" />
                          </div>
                        </th>
                        <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('AccountId')}>
                          <div className="flex items-center">
                            Account <SortIcon columnName="AccountId" />
                          </div>
                        </th>
                        <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('Page')}>
                          <div className="flex items-center">
                            Page <SortIcon columnName="Page" />
                          </div>
                        </th>
                        <th className="px-6 py-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-700 bg-white">
                      {filteredLogs.map((log, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{log.AccountId}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{log.Page}</td>
                          <td className="px-6 py-4">{log.Details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cards for small screens */}
              <div className="block md:hidden space-y-4 max-h-[70vh] overflow-auto">
                {filteredLogs.map((log, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <p className="text-xs text-gray-400">{formatDate(log.createdAt)}</p>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{log.Page}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mt-2">
                      <span className="font-bold">Account: </span>{log.AccountId}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 border-t pt-2">
                      {log.Details}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-right text-sm text-gray-500">
                Showing {filteredLogs.length} of {logs.length} logs
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryLogs;