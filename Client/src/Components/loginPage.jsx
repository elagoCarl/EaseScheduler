import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Import axios
import image2 from './Img/2.jpg';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        'http://localhost:8080/accounts/loginAccount',
        {
          Email: email,
          Password: password,
        },
        {
          withCredentials: true, // Include cookies in the request
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.successful) {
        navigate('/homePage'); // Redirect on successful and verified login
      } else {
        if (response.data.message === "Account not verified. OTP sent to email.") {
          navigate(`/otpVerification?email=${email}`); // Redirect to OTP verification page
        } else {
          setError(response.data.message || 'Login failed. Please try again.');
        }
      }
    } catch (err) {
      if (err.response?.data?.message === 'Account not verified. OTP sent to email.') {
        navigate(`/otpVerification?email=${email}`); // Redirect to OTP verification page
      } else {
        setError(
          err.response?.data?.message || 'An error occurred. Please try again later.'
        );
      }
    }
  };

  return (
    <div
      className="bg-cover bg-no-repeat min-h-screen flex flex-col justify-between items-center overflow-y-auto"
      style={{ backgroundImage: `url(${image2})` }}
    >
      <section className="justify-center items-center text-center m-auto w-11/12 sm:w-9/12 md:w-5/12 lg:w-4/12">
        <button
          id="logoBtn"
          className="hover:scale-105 text-xl md:text-3xl lg:text-4xl font-bold text-blue-500 mb-50"
          onClick={() => navigate('/')}
        >
          EASE<span className="text-white">SCHEDULER</span>
        </button>

        <form
          id="blueBox"
          className="bg-black/40 p-15 md:p-30 items-center justify-center flex-col space-y-7 rounded-md w-full"
          onSubmit={handleSubmit}
        >
          <div>
            <label
              htmlFor="email"
              className="text-start block mb-2 text-sm font-medium text-gray-100"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              className="text-gray-700 rounded-lg w-full p-8 md:p-15 bg-gray-100"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-start block mb-2 text-sm font-medium text-gray-100"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              className="text-gray-700 rounded-lg w-full p-8 md:p-15 bg-gray-100"
              placeholder="*********"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end w-full">
            <button
              type="button"
              className="text-blue-300 hover:underline"
              onClick={() => navigate('/forgotPassPage')}
            >
              Forgot Password?
            </button>
          </div>

          {error && <p className="text-red-500">{error}</p>}

          <button
            type="submit"
            id="signInBtn"
            className="w-full text-white bg-blue-700 hover:bg-gray-500 font-medium rounded-lg text-sm py-2.5 text-center"
          >
            Sign in
          </button>
        </form>
      </section>
    </div>
  );
};

export default LoginPage;