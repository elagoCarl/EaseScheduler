import { useState, useEffect } from 'react';
import axios from '../axiosConfig.js';
import TopMenu from "../Components/callComponents/topMenu.jsx";
import Sidebar from '../Components/callComponents/sideBar.jsx';
import Background from './Img/5.jpg';
import accV from './Img/profV.png';
import LoadingSpinner from '../Components/callComponents/loadingSpinner.jsx';
import ErrorDisplay from '../Components/callComponents/errDisplay.jsx';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredAccounts, setFilteredAccounts] = useState([]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedStatus === "Archived") {
      fetchArchivedAccounts();
    }
  }, [selectedStatus]);

  useEffect(() => {
    // Filter accounts whenever search query, role, or status changes
    const data = selectedStatus === "Archived" ? archivedAccounts : accounts;
    const filtered = data.filter(account => {
      const searchLower = searchQuery.toLowerCase();
      // Check if either name OR email contains the search query
      const nameMatch = account.Name.toLowerCase().includes(searchLower);
      const emailMatch = account.Email.toLowerCase().includes(searchLower);

      // Account passes filter if name OR email matches, AND role matches (if selected)
      return (nameMatch || emailMatch) && (selectedRole ? account.Roles === selectedRole : true);
    });
    setFilteredAccounts(filtered);
  }, [searchQuery, selectedRole, selectedStatus, accounts, archivedAccounts]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/accounts/getAllAccounts');
      setAccounts(response.data);
      if (selectedStatus === "Active") {
        setFilteredAccounts(response.data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Failed to fetch accounts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedAccounts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/accArchive/getAllArchivedAccounts');
      setArchivedAccounts(response.data);
      if (selectedStatus === "Archived") {
        setFilteredAccounts(response.data);
      }
    } catch (error) {
      console.error('Error fetching archived accounts:', error);
      setError('Failed to fetch archived accounts: ' + error.message);
    } finally {
      setLoading(false);
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
      await axios.post(`/accArchive/archiveAccount/${accountToArchive.id}`);
      setAccounts(prevAccounts => prevAccounts.filter(account => account.id !== accountToArchive.id));
      fetchAccounts(); // Refresh the list after archiving
    } catch (error) {
      console.error("Error archiving account:", error);
      setError("Failed to archive account: " + error.message);
    } finally {
      closeModal();
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div
      className="bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto"
      style={{ backgroundImage: `url(${Background})` }}
    >
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <TopMenu toggleSidebar={toggleSidebar} />

      <div className="flex flex-col justify-center items-center h-screen w-full px-10">
        {/* Filter container - removed white background */}
        <div className="w-10/12 mb-8">
          <div className="w-full mt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="Search by name or email..."
              />

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center w-10/12 max-h-[70vh]">
          <div className="flex items-center bg-blue-600 text-white px-4 md:px-10 py-4 rounded-t-lg w-full mb-4">
            <img src={accV} className="w-12 h-12 md:w-25 md:h-25" alt="Account Icon" />
            <h2 className="text-sm md:text-lg font-semibold flex-grow text-center">
              {selectedStatus === "Archived" ? "Archived Accounts" : "Active Accounts"}
            </h2>
          </div>

          <div className="overflow-auto w-full h-full flex-grow">
            <table className="text-center w-full border-collapse">
              <thead>
                <tr className="bg-blue-600">
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white font-medium border border-gray-300">ID</th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white font-medium border border-gray-300">Name</th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white font-medium border border-gray-300">Email</th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white font-medium border border-gray-300">Role</th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white font-medium border border-gray-300">Created At</th>
                  {selectedStatus === "Active" && (
                    <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white font-medium border border-gray-300">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-customLightBlue2 border-t border-gray-300">
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">{account.id}</td>
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">{account.Name}</td>
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">{account.Email}</td>
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">{account.Roles}</td>
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">
                      {new Date(account.createdAt).toLocaleDateString()}
                    </td>
                    {selectedStatus === "Active" && (
                      <td className="px-4 md:px-6 py-2 border border-gray-300">
                        <button
                          onClick={() => openModal(account)}
                          className="px-3 py-1 bg-red-600 text-white text-xs md:text-sm rounded hover:bg-red-500"
                        >
                          Archive
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Display "No accounts found" message when filtered list is empty */}
            {filteredAccounts.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No accounts found matching your search criteria.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Archive confirmation modal - styled to match Professor page */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Confirm Archive</h3>
            <p className="mb-6">Are you sure you want to archive {accountToArchive?.Name}?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={archiveAccount}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountList;