import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import image2 from './Img/2.jpg';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:8080/accounts/loginAccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          Email: email, 
          Password: password, 
          RememberMe: rememberMe 
        }),
        credentials: 'include', // Ensure cookies are sent back
      });

      const data = await response.json();

      if (response.ok && data.successful) {
        navigate('/homePage'); // Redirect on successful login
      } else {
        setError(data.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
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
            <label htmlFor="email" className="text-start block mb-2 text-sm font-medium text-gray-100">
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
            <label htmlFor="password" className="text-start block mb-2 text-sm font-medium text-gray-100">
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

          <div className="flex items-center justify-between w-full">
            <label className="flex items-center text-gray-100">
              <input
                type="checkbox"
                className="mr-2"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember Me
            </label>

            <button
              type="button"
              className="text-blue-300 hover:underline"
              onClick={() => navigate('/forgotPassword')}
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
