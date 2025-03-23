import { useState, useEffect } from 'react';
import Background from './Img/4.jpg';
import { useNavigate } from 'react-router-dom';
import Sidebar from './callComponents/sideBar.jsx';
import TopMenu from "./callComponents/topMenu.jsx";
import Cookies from 'js-cookie';
import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import { Eye, EyeOff } from 'lucide-react';

const AccountSettings = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState({ fullName: '', email: '', id: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = Cookies.get('refreshToken'); // Get JWT from cookies
        if (!token) {
          console.error('No token found');
          return;
        }

        const decoded = jwtDecode(token); // Decode JWT to get user ID
        const userId = decoded.id;

        console.log("Fetching user data for ID:", userId); // Debug log

        const response = await axios.get(`http://localhost:8080/accounts/getAccountById/${userId}`);
        console.log("User data received:", response.data); // Debug log

        // Ensure the correct mapping of properties
        setUser({
          fullName: response.data.data.Name, // API returns "Name", but state expects "fullName"
          email: response.data.data.Email, // API returns "Email", which matches state
          id: userId // Store the user ID for archive functionality
        });
      } catch (error) {
        console.error('Error fetching user data:', error.response?.data || error.message);
        setMessage({
          text: 'Error loading account information',
          type: 'error'
        });
      }
    };

    fetchUserData();
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handlePasswordChange = (e) => {
    setPasswords({
      ...passwords,
      [e.target.id]: e.target.value
    });
  };

  const toggleCurrentPasswordVisibility = () => {
    setShowCurrentPassword(!showCurrentPassword);
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const saveChanges = async () => {
    // Validate inputs
    if (!passwords.currentPassword || !passwords.newPassword) {
      setMessage({
        text: 'Both current and new passwords are required',
        type: 'error'
      });
      return;
    }

    try {
      const response = await axios.post('http://localhost:8080/accounts/changePassword', {
        Email: user.email,
        oldPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });

      if (response.data.successful) {
        setMessage({
          text: 'Password changed successfully',
          type: 'success'
        });

        // Clear password fields after successful change
        setPasswords({ currentPassword: '', newPassword: '' });
      } else {
        setMessage({
          text: response.data.message || 'Failed to change password',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({
        text: error.response?.data?.message || 'Error changing password',
        type: 'error'
      });
    }
  };

  const archiveAccount = async () => {
    try {
      // Call the API endpoint to archive the account
      const response = await axios.post(`http://localhost:8080/accArchive/archiveAccount/${user.id}`);

      if (response.data.successful) {
        setMessage({
          text: 'Account successfully archived',
          type: 'success'
        });

        // Log out the user and redirect to login page after a short delay
        setTimeout(() => {
          Cookies.remove('refreshToken');
          Cookies.remove('jwt');
          navigate('/loginPage');
        }, 2000);
      } else {
        setMessage({
          text: response.data.message || 'Failed to archive account',
          type: 'error'
        });
        setShowConfirmDialog(false);
      }
    } catch (error) {
      console.error('Error archiving account:', error);
      setMessage({
        text: error.response?.data?.message || 'Error archiving account',
        type: 'error'
      });
      setShowConfirmDialog(false);
    }
  };

  // Confirmation dialog component
  const ConfirmationDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-16 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-12">Confirm Account Archive</h2>
        <p className="mb-12">
          Are you sure you want to archive your account? This action cannot be undone.
          Your account information will be moved to archives and you will be logged out.
        </p>
        <div className="flex justify-end space-x-8">
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-6 px-12 rounded"
            onClick={() => setShowConfirmDialog(false)}
          >
            Cancel
          </button>
          <button
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-6 px-12 rounded"
            onClick={archiveAccount}
          >
            Archive
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      id="bgImg"
      className="bg-cover bg-center bg-no-repeat h-screen w-screen"
      style={{ backgroundImage: `url(${Background})` }}>
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      {/* Top Menu */}
      <TopMenu toggleSidebar={toggleSidebar} />
      {/* Confirmation Dialog */}
      {showConfirmDialog && <ConfirmationDialog />}
      {/* Main Content */}
      <div className="h-screen flex justify-center items-center">
        <div className="relative bg-customBlue1 p-50 xl:mb-180 xs:mb-80 mb:180 rounded-lg shadow-lg w-11/12 max-w-lg">
          <button
            className="absolute top-3 right-10 text-white font-bold text-2xl hover:text-red-500"
            onClick={() => navigate('/')}>
            &times;
          </button>

          <h1 className="text-2xl font-bold text-white text-center">
            Account Settings
          </h1>

          {message.text && (
            <div className={`mt-4 p-2 rounded text-center ${message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              {message.text}
            </div>
          )}

          <form className="mt-6">
            <div className="mb-6">
              <label
                className="block font-semibold text-white mb-2"
                htmlFor="fullName"
              >
                Full Name:
              </label>
              <input
                className="border rounded w-full py-10 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="fullName"
                type="text"
                value={user.fullName ?? ''} // Ensuring controlled input
                onChange={(e) => setUser({ ...user, fullName: e.target.value })}
                disabled
              />
            </div>

            <div className="mb-6">
              <label
                className="block font-semibold text-white mb-2"
                htmlFor="email"
              >
                Email Address:
              </label>
              <input
                className="border rounded w-full py-10 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="email"
                type="email"
                value={user.email ?? ''} // Ensuring controlled input
                onChange={(e) => setUser({ ...user, email: e.target.value })}
                disabled
              />
            </div>

            <div className="mb-6">
              <label
                className="block font-semibold text-white mb-2"
                htmlFor="password"
              >
                Password:
              </label>
              <div className="flex space-x-20">
                <div className="relative w-full">
                  <input
                    className="border rounded w-full py-8 px-3 pl-10 pr-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Current Password"
                    value={passwords.currentPassword}
                    onChange={handlePasswordChange}
                  />
                  <button
                    type="button"
                    onClick={toggleCurrentPasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600"
                  >
                    {showCurrentPassword ?
                      <EyeOff size={20} /> :
                      <Eye size={20} />
                    }
                  </button>
                </div>
                <div className="relative w-full">
                  <input
                    className="border rounded w-full py-8 px-3 pl-10 pr-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={passwords.newPassword}
                    onChange={handlePasswordChange}
                  />
                  <button
                    type="button"
                    onClick={toggleNewPasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600"
                  >
                    {showNewPassword ?
                      <EyeOff size={20} /> :
                      <Eye size={20} />
                    }
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-20 space-x-8 mr-auto">
              <div>
                <button
                  className="bg-customRed hover:bg-red-800 text-white font-bold py-8 px-12 rounded"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowConfirmDialog(true);
                  }}
                >
                  Archive
                </button>
              </div>
              <div>
                <button
                  className="bg-customLightBlue2 hover:bg-blue-300 text-gray-600 font-bold py-7 px-23 rounded"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    saveChanges();
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;