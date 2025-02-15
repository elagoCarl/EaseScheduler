import { useState, useEffect } from 'react';
import axios from 'axios';
import TopMenu from "../Components/callComponents/topMenu.jsx";
import Sidebar from '../Components/callComponents/sideBar.jsx';
import Image3 from './Img/3.jpg';

const AccountList = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [archivedAccounts, setArchivedAccounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Active');
  const [roles] = useState(["Admin", "Program Head", "Department Secretary"]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountToArchive, setAccountToArchive] = useState(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedStatus === "Archived") {
      fetchArchivedAccounts();
    }
  }, [selectedStatus]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('http://localhost:8080/accounts/getAllAccounts');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchArchivedAccounts = async () => {
    try {
      const response = await axios.get('http://localhost:8080/accArchive/getAllArchivedAccounts');
      setArchivedAccounts(response.data);
    } catch (error) {
      console.error('Error fetching archived accounts:', error);
    }
  };

  const openModal = (account) => {
    setAccountToArchive(account);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setAccountToArchive(null);
  };

  const archiveAccount = async () => {
    if (!accountToArchive) return;

    try {
      await axios.post(`http://localhost:8080/accArchive/archiveAccount/${accountToArchive.id}`);
      setAccounts(prevAccounts => prevAccounts.filter(account => account.id !== accountToArchive.id));
      alert("Account archived successfully.");
    } catch (error) {
      console.error("Error archiving account:", error);
      alert("Failed to archive account. Please try again.");
    } finally {
      closeModal();
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const filteredAccounts = (selectedStatus === "Archived" ? archivedAccounts : accounts).filter(account => {
    return (
      account.Name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedRole ? account.Roles === selectedRole : true)
    );
  });

  return (
    <div className="min-h-screen bg-cover bg-no-repeat flex flex-col md:justify-center md:items-center p-4"
      style={{ backgroundImage: `url(${Image3})` }}>
      <div className="fixed top-0 h-full z-50">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      </div>

      <TopMenu toggleSidebar={toggleSidebar} />

      <div className="w-full max-w-7xl mx-auto bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="flex flex-col gap-4 mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
              {selectedStatus === "Archived" ? "Archived Accounts" : "Active Accounts"}
            </h2>

            {/* Responsive Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Search users by name..."
              />

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
              >
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
              </select>

              <button
                onClick={fetchAccounts}
                className="w-full px-5 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="py-4 px-6 text-left text-sm font-medium text-gray-500">ID</th>
                  <th className="py-4 px-6 text-left text-sm font-medium text-gray-500">NAME</th>
                  <th className="py-4 px-6 text-left text-sm font-medium text-gray-500">EMAIL</th>
                  <th className="py-4 px-6 text-left text-sm font-medium text-gray-500">ROLE</th>
                  <th className="py-4 px-6 text-left text-sm font-medium text-gray-500">CREATED AT</th>
                  {selectedStatus === "Active" && (
                    <th className="py-4 px-6 text-left text-sm font-medium text-gray-500">ACTIONS</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm text-gray-600">{account.id}</td>
                    <td className="py-4 px-6">{account.Name}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{account.Email}</td>
                    <td className="py-4 px-6">{account.Roles}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {new Date(account.createdAt).toLocaleDateString()}
                    </td>
                    {selectedStatus === "Active" && (
                      <td className="py-4 px-6">
                        <button
                          onClick={() => openModal(account)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
                        >
                          Archive
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredAccounts.map((account) => (
              <div key={account.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{account.Name}</h3>
                    {selectedStatus === "Active" && (
                      <button
                        onClick={() => openModal(account)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-500"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>ID: {account.id}</p>
                    <p>Email: {account.Email}</p>
                    <p>Role: {account.Roles}</p>
                    <p>Created: {new Date(account.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal - Now with improved mobile styling */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white w-full max-w-sm p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-medium mb-4">Confirm Archive</h3>
            <p className="mb-6">Are you sure you want to archive {accountToArchive?.Name}?</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={archiveAccount}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
              >
                Yes, Archive
              </button>
              <button
                onClick={closeModal}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountList;