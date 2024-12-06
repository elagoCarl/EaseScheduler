import React from 'react';
import Background from './Img/4.jpg';
import { useNavigate } from 'react-router-dom';
import Menu from './Img/menu.png';

const CreateAccount = () => {
  const navigate = useNavigate();

  return (
    <div
      id="bgImg"
      className="bg-cover bg-center bg-no-repeat h-screen w-screen"
      style={{ backgroundImage: `url(${Background})` }}
    >
      <div className="flex justify-end items-end px-8 py-4 xl:py-40 xl:px-40">
        <button
          id="logoBtn"
          className="text-3xl xl:text-3xl font-bold text-blue-500"
          onClick={() => navigate('/')}
        >
          EASE<span className="text-white">SCHEDULER</span>
        </button>
        <img src={Menu} className="w-40 h-40 cursor-pointer absolute top-40 right-10 xl:top-75 xl:right-35" alt="menu button" />
      </div>

      <div className="h-screen flex justify-center items-center">
        {/* Card Container */}
        <div className=" relative bg-customBlue1 p-25 xl:mb-180 xs:mb-80 mb:180 rounded-lg shadow-lg w-11/12 max-w-lg">
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
                className="border rounded w-full py-8 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                className="border rounded w-full py-8 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                className="border rounded w-full py-8 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                  className="border rounded w-full py-8 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                  className="border rounded w-full py-8 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm Password"
                />
              </div>
            </div>



            {/* Buttons */}
            <div className="flex justify-end mt-6 space-x-8">
              {/* Create Account Button */}
              <div>
                <button
                  className="bg-customLightBlue2 hover:bg-blue-300 text-gray-600 font-bold py-7 px-23 rounded"
                  type="button"
                >
                  Create Account
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateAccount;
