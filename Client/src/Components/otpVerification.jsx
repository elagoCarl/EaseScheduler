import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../axiosConfig';
import Background from './Img/6.jpg';

const OTPVerification = () => {
  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = new URLSearchParams(location.search).get('email');//galing sa params ng url

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    if (element.value !== "" && index < 5) {
      document.getElementById(`otpInput-${index + 1}`).focus();
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    // console.log("otpValue: ", otpValue)
    if (otpValue.length === 6) {
      try {
        const response = await axios.post(
          '/accounts/verifyAccountOTP',
          {
            email: email,
            otp: otpValue,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.data.successful) {
          setSuccess(true);
          setError('');
          setTimeout(() => {
            navigate('/loginPage'); // Redirect on successful OTP verification after showing success message
          }, 2000);
        } else {
          setError(response.data.message || 'OTP verification failed. Please try again.');
          setSuccess(false);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'An error occurred. Please try again later.');
        setSuccess(false);
      }
    } else {
      setError('Please enter a 6-digit OTP');
      setSuccess(false);
    }
  };

  return (
    <div
      id="bgImg"
      className="bg-cover bg-center bg-no-repeat h-screen w-screen bg-gray-800"
    >
      {/* Main Content */}
      <div className="h-screen flex justify-center items-center">
        <div className="w-11/12 max-w-lg">
          {/* Centered EASESCHEDULER button outside the form box */}
          <div className="flex justify-center w-full mb-6">
            <button
              id="logoBtn"
              className="text-lg md:text-3xl font-bold block text-blue-500"
              onClick={() => navigate("/")}
            >
              EASE<span className="text-white">SCHEDULER</span>
            </button>
          </div>

          <div className="relative bg-customBlue1 p-10 xl:mb-180 xs:mb-80 mb-180 rounded-lg shadow-lg">
            <button
              className="absolute top-3 right-10 text-white font-bold text-2xl hover:text-red-500"
              onClick={() => navigate("/")}
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

              {error && <p className="text-red-500">{error}</p>}
              {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
                  <strong className="font-bold">Success! </strong>
                  <span className="block sm:inline">Your account has been successfully verified. Redirecting to login...</span>
                </div>
              )}

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
    </div>

  );
};

export default OTPVerification;