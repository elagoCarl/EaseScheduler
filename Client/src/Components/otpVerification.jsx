import React, { useState } from 'react';
import Background from './Img/4.jpg';
import { useNavigate } from 'react-router-dom';
import Sidebar from './callComponents/sideBar.jsx';
import TopMenu from "./callComponents/topMenu.jsx";

const OTPVerification = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [otp, setOtp] = useState(new Array(6).fill(''));
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    if (element.value !== "" && index < 5) {
      document.getElementById(`otpInput-${index + 1}`).focus();
    }
  };

  const handleOTPSubmit = (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length === 6) {
      alert(`OTP Submitted: ${otpValue}`);
    } else {
      alert('Please enter a 6-digit OTP');
    }
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
        <div className="relative bg-customBlue1 p-10 xl:mb-180 xs:mb-80 mb-180 rounded-lg shadow-lg w-11/12 max-w-lg">
          <button
            className="absolute top-3 right-10 text-white font-bold text-2xl hover:text-red-500"
            onClick={() => navigate('/')}
          >
            &times;
          </button>

          <h1 className="text-2xl font-bold text-white text-center">
            OTP Verification
          </h1>

          <form className="mt-6" onSubmit={handleOTPSubmit}>
            <div className="mb-6">
              <label
                className="block font-semibold text-white mb-2"
                htmlFor="otpCode"
              >
                Enter OTP Code:
              </label>
              <div className="flex space-x-4 justify-center">
                {otp.map((value, index) => (
                  <input
                    key={index}
                    id={`otpInput-${index}`}
                    type="text"
                    maxLength="1"
                    value={value}
                    onChange={(e) => handleChange(e.target, index)}
                    className="w-50 h-50 text-center text-gray-700 text-xl border rounded-lg focus:outline-none focus:shadow-outline"
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-20 space-x-8 mr-auto">
              <div>
                <button
                  className="bg-customRed hover:bg-red-800 text-customWhite font-bold py-2 px-6 rounded"
                  type="button"
                  onClick={() => setOtp(new Array(6).fill(''))}
                >
                  Clear
                </button>
              </div>
              <div>
                <button
                  className="bg-blue-700 hover:bg-gray-500 text-customWhite font-bold py-2 px-8 rounded"
                  type="submit"
                >
                  Verify
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
