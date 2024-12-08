import React from 'react';
import Background from './Img/4.jpg'; // Replace with your actual image path

const HistoryLogs = () => {
  // Sample data for history logs
  const logs = [
    {
      timestamp: '2024-12-05 10:30 AM',
      account: 'john.doe@example.com',
      page: 'Create Account',
      details: 'User created an account successfully.',
    },
    {
      timestamp: '2024-12-05 11:00 AM',
      account: 'jane.smith@example.com',
      page: 'Login',
      details: 'User logged in.',
    },
    {
      timestamp: '2024-12-05 11:30 AM',
      account: 'admin@example.com',
      page: 'Admin Dashboard',
      details: 'Admin viewed the dashboard statistics.',
    },
    // Add more logs as needed
  ];

  return (
    <div
      className="bg-cover bg-center bg-no-repeat min-h-screen w-screen flex items-center justify-center"
      style={{ backgroundImage: `url(${Background})` }}
    >
      <div className="bg-white bg-opacity-90 shadow-lg rounded-lg w-11/12 max-w-6xl p-8">
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
                  <td className="px-6 py-4 whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.account}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.page}</td>
                  <td className="px-6 py-4">{log.details}</td>
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
                {log.timestamp}
              </p>
              <p className="text-sm text-gray-500 font-medium mt-1">
                <span className="font-bold text-gray-700">Account: </span>
                {log.account}
              </p>
              <p className="text-sm text-gray-500 font-medium mt-1">
                <span className="font-bold text-gray-700">Page: </span>
                {log.page}
              </p>
              <p className="text-sm text-gray-500 font-medium mt-1">
                <span className="font-bold text-gray-700">Details: </span>
                {log.details}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HistoryLogs;
