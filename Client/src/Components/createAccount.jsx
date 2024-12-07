import React, { useState } from 'react';
import Background from './Img/4.jpg';
import { useNavigate } from 'react-router-dom';
import Menu from './Img/menu.png';
import Sidebar from './sideBar.jsx';

const CreateAccount = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Toggle Sidebar Function
  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div
      className="bg-cover bg-no-repeat min-h-screen flex justify-center items-center"
      style={{ backgroundImage: `url(${Background})` }}
    >
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Top Menu */}
      <div className="absolute top-0 left-0 flex justify-between items-center px-4 py-2 w-full bg-opacity-70 md:px-8">
        <button
          id="logoBtn"
          className=" shadow-2xl bg-gray-800 bg-opacity-40 p-5 text-lg md:text-3xl font-bold text-blue-500 "
          onClick={() => navigate("/")}
        >
          EASE<span className="text-white">SCHEDULER</span>
        </button>
        <img
          src={Menu}
          className="w-15 h-15 md:w-40 md:h-40 hover:bg-customLightBlue2 cursor-pointer rounded"
          alt="menu button"
          onClick={toggleSidebar}
        />
      </div>

      {/* Form Container */}
      <div className="relative bg-customBlue1 p-15 rounded-lg shadow-lg w-full max-w-lg">
        {/* Close Button */}
        <button
          className="absolute top-3 right-10 text-white font-bold text-2xl hover:text-red-500"
          onClick={() => navigate('/')}
        >
          &times;
        </button>

        {/* Title of container */}
        <h1 className="text-2xl font-bold text-white text-center">Create Account</h1>

        <form className="mt-6">
          {/* Role Selection */}
          <div className="mb-6">
            <label
              className="block font-semibold text-white mb-2"
              htmlFor="role"
            >
              Select Role:
            </label>
            <select
              id="role"
              className="border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="" disabled selected>
                -- Select Role --
              </option>
              <option value="Program Head">Program Head</option>
              <option value="Dept. Secretary">Dept. Secretary</option>
            </select>
          </div>

          {/* Full Name */}
          <div className="mb-6">
            <label
              className="block font-semibold text-white mb-2"
              htmlFor="fullName"
            >
              Full Name:
            </label>
            <input
              className="border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="fullName"
              type="text"
              placeholder="Full Name"
            />
          </div>

          {/* Email Address */}
          <div className="mb-6">
            <label
              className="block font-semibold text-white mb-2"
              htmlFor="email"
            >
              Email Address:
            </label>
            <input
              className="border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="email"
              type="email"
              placeholder="example@ceu.edu.ph"
            />
          </div>

          {/* Password and Confirm Password (Side by Side) */}
          <div className="mb-6 flex justify-between space-x-4">
            {/* Password */}
            <div className="w-1/2">
              <label
                className="block font-semibold text-white mb-2"
                htmlFor="password"
              >
                Password:
              </label>
              <input
                className="border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="password"
                type="password"
                placeholder="Password"
              />
            </div>

            {/* Confirm Password */}
            <div className="w-1/2">
              <label
                className="block font-semibold text-white mb-2"
                htmlFor="confirmPassword"
              >
                Confirm Password:
              </label>
              <input
                className="border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="confirmPassword"
                type="password"
                placeholder="Confirm Password"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end mt-6 space-x-8">
            {/* Create Account Button */}
            <button
              className="bg-customLightBlue2 hover:bg-blue-300 text-gray-600 font-bold py-3 px-8 rounded"
              type="submit"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAccount;
