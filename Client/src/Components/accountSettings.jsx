import { useState } from 'react';
import Background from './Img/4.jpg';
import { useNavigate } from 'react-router-dom';
import Sidebar from './callComponents/sideBar.jsx';
import TopMenu from "./callComponents/topMenu.jsx";

const AccountSettings = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

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
                placeholder="amestrabela@ceu.edu.ph"
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
                placeholder="Anna Rose Estrabela"
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
