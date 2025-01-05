import { useState, useEffect } from "react";
import Axios from 'axios';
import Background from './Img/1.jpg';
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";
import { useNavigate } from 'react-router-dom';

const HistoryLogs = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const fetchHistoryLogs = async () => {
    try {
      const response = await Axios.get('http://localhost:8080/historyLogs/getAllHistoryLogs');
      if (response.data.successful) {
        setLogs(response.data.data);
        console.log("response.data.data: ", response.data.data)
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

  if (loading) {
    return <div className="rounded-md h-12 w-12 border-4 border-t-4 border-blue-500 animate-spin absolute"></div>;
  }

  if (error) {
    return <div className="grid h-screen place-content-center bg-white px-4">
      <div className="text-center">
        <p className="text-2xl font-bold tracking-tight text-gray-900 sm:text-4xl">Oh Nooo!</p>
        <p className="mt-4 text-gray-500">Error: {error}</p>
        <a
          onClick={() => navigate('/')}
          className="mt-6 inline-block rounded bg-customBlue1 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring">
          Go Back Home
        </a>
      </div>
    </div>;
  }

  return (
    <div className='bg-cover bg-no-repeat min-h-screen flex justify-center items-center' style={{ backgroundImage: `url(${Background})` }}>
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <TopMenu toggleSidebar={toggleSidebar} />

      <div className="bg-white bg-opacity-90 shadow-lg rounded-lg w-11/12 max-w-8xl p-8 overflow-hidden">
        <h1 className="text-3xl font-extrabold text-gray-800 text-center mb-6">History Logs</h1>
        {/* table div */}
        <div className="hidden md:block overflow-hidden rounded-lg">
          <div className="overflow-auto max-h-650">
            <table className="w-full text-left border-collapse">
              <thead className="bg-blue-600 text-white text-sm uppercase">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3">Page</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {logs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-100 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">{log.createdAt}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.AccountId}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.Page}</td>
                    <td className="px-6 py-4">{log.Details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* cards div */}
        <div className="block md:hidden space-y-4 max-h-450 overflow-auto">
          {logs.map((log, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
              <p className="text-sm text-gray-500 font-medium">
                <span className="font-bold text-gray-700">Timestamp: </span>{log.createdAt}
              </p>
              <p className="text-sm text-gray-500 font-medium mt-1">
                <span className="font-bold text-gray-700">Account: </span>{log.AccountId}
              </p>
              <p className="text-sm text-gray-500 font-medium mt-1">
                <span className="font-bold text-gray-700">Page: </span>{log.Page}
              </p>
              <p className="text-sm text-gray-500 font-medium mt-1">
                <span className="font-bold text-gray-700">Details: </span>{log.Details}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HistoryLogs;
