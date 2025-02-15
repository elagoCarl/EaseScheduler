import { useState, useEffect } from 'react';
import Background from './Img/4.jpg';
import { useNavigate } from 'react-router-dom';
import Sidebar from './callComponents/sideBar.jsx';
import TopMenu from "./callComponents/topMenu.jsx";
import Cookies from 'js-cookie';
import axios from 'axios';
import { jwtDecode } from "jwt-decode";

const AccountSettings = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState({ fullName: '', email: '' });
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
          email: response.data.data.Email // API returns "Email", which matches state
        });
      } catch (error) {
        console.error('Error fetching user data:', error.response?.data || error.message);
      }
    };

    fetchUserData();
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div
      id="bgImg"
      className="bg-cover bg-center bg-no-repeat h-screen w-screen"
      style={{ backgroundImage: `url(${Background})` }}>
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      {/* Top Menu */}
      <TopMenu toggleSidebar={toggleSidebar} />
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
                <input
                  className="border rounded w-full py-8 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="currentPassword"
                  type="password"
                  placeholder="Current Password"
                />
                <input
                  className="border rounded w-full py-8 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="newPassword"
                  type="password"
                  placeholder="New Password"
                />
              </div>
            </div>
            <div className="flex justify-end mt-20 space-x-8 mr-auto">
              <div>
                <button
                  className="bg-customRed hover:bg-red-800 text-white font-bold py-8 px-12 rounded"
                  type="button"
                >
                  Archive
                </button>
              </div>
              <div>
                <button
                  className="bg-customLightBlue2 hover:bg-blue-300 text-gray-600 font-bold py-7 px-23 rounded"
                  type="button"
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
