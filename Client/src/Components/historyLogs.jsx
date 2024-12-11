import React, { useState, useEffect } from "react";
import Axios from 'axios'; // Import Axios
import Background from './Img/1.jpg'; // Replace with your actual image path
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";

const HistoryLogs = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [logs, setLogs] = useState([]); // State to store fetched logs
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error state

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // Function to fetch history logs from the server
  const fetchHistoryLogs = async () => {
    try {
      const response = await Axios.get('http://localhost:8080/historyLogs/getAllCourses'); // Replace with your backend API endpoint
      console.log("response", response.data)
      if (response.data.successful) {
        setLogs(response.data.data); // Update logs state with the fetched data
      } else {
        setError(response.data.message); // Set error message if the response is not successful
      }
    } catch (err) {
      setError("Error fetching history logs: " + err.message); // Catch errors and set error message
    } finally {
      setLoading(false); // Set loading to false after request is complete
    }
  };

  // Fetch logs when the component mounts
  useEffect(() => {
    fetchHistoryLogs();
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Display loading message while fetching data
  }

  if (error) {
    return <div>Error: {error}</div>; // Display error message if there's an issue
  }

  return (
    <div className='bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto'
      style={{ backgroundImage: `url(${Background})` }}>
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Top Menu */}
      <TopMenu toggleSidebar={toggleSidebar} />

      <div className="bg-white bg-opacity-90 shadow-lg rounded-lg m-auto w-11/12 p-8">
        {/* Title */}
        <h1 className="text-3xl font-extrabold text-gray-800 text-center mb-6">
          History Logs
        </h1>

        {/* Table for Larger Screens */}
        <div className="hidden md:block overflow-x-auto rounded-lg">
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
                <tr
                  key={index}
                  className="hover:bg-gray-100 transition-colors duration-200"
                >
                  <td className="px-6 py-4 whitespace-nowrap">{log.createdAt}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.AccountId}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.Page}</td>
                  <td className="px-6 py-4">{log.Details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card View for Smaller Screens */}
        <div className="block md:hidden space-y-4">
          {logs.map((log, index) => (
            <div
              key={index}
              className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <p className="text-sm text-gray-500 font-medium">
                <span className="font-bold text-gray-700">Timestamp: </span>
                {log.createdAt}
              </p>
              <p className="text-sm text-gray-500 font-medium mt-1">
                <span className="font-bold text-gray-700">Account: </span>
                {log.AccountId}
              </p>
              <p className="text-sm text-gray-500 font-medium mt-1">
                <span className="font-bold text-gray-700">Page: </span>
                {log.Page}
              </p>
              <p className="text-sm text-gray-500 font-medium mt-1">
                <span className="font-bold text-gray-700">Details: </span>
                {log.Details}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HistoryLogs;
