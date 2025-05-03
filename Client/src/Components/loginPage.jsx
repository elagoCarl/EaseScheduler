import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './authContext';
import axios from 'axios';
import { BASE_URL } from '../axiosConfig';

export default function LoginPage() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      console.log('Attempting login with:', { email });
      
      const response = await axios.post(
        `${BASE_URL}/accounts/loginAccount`,
        {
          Email: email,
          Password: password,
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000 // 15 second timeout
        }
      );

      console.log('Login response:', response.data);
      
      if (response.data.successful) {
        console.log('Login successful, setting user and redirecting');
        setUser(response.data.account);
        navigate('/homePage');
      } else {
        if (response.data.message === "Account not verified. OTP sent to email.") {
          navigate(`/otpVerification?email=${encodeURIComponent(email)}`);
        } else {
          setError(response.data.message || 'Login failed. Please try again.');
          // Auto-clear error after 5 seconds
          setTimeout(() => setError(''), 5000);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle specific error cases
      if (err.response) {
        console.error('Server responded with:', err.response.status, err.response.data);
        if (err.response.status === 400) {
          setError('Invalid login request. Please Check your credentials.');
        } else if (err.response.status === 401) {
          setError('Incorrect email or password.');
        } else if (err.response?.data?.message === 'Account not verified. OTP sent to email.') {
          navigate(`/otpVerification?email=${encodeURIComponent(email)}`);
          return;
        } else {
          setError(err.response.data?.message || `Server error (${err.response.status}). Please try again.`);
        }
      } else if (err.request) {
        console.error('No response received:', err.request);
        setError('No response from server. Please check your connection.');
      } else {
        console.error('Request setup error:', err.message);
        setError('An error occurred. Please try again later.');
      }
      
      // Auto-clear error after 5 seconds for all error cases
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <button 
            onClick={() => navigate('/')}
            className="text-3xl font-bold"
          >
            <span className="text-blue-500">EASE</span>
            <span className="text-white hover:text-gray-400 transition-colors duration-300">SCHEDULER</span>
          </button>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-400 text-red-100 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}
        
        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-black bg-opacity-50 rounded-lg p-16 backdrop-blur-sm">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm mb-1 text-gray-300">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-6 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="email@address.com"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="text-sm text-gray-300">Password</label>
                <button
                  type="button"
                  onClick={() => navigate('/forgotPassPage')}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative mb-8">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-6 rounded bg-gray-800 border border-gray-700 text-white pr-10 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? 
                    <EyeOff className="h-16 w-16" /> : 
                    <Eye className="h-16 w-16" />
                  }
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full ${
                isLoading ? 'bg-blue-700' : 'bg-blue-600 hover:bg-blue-500'
              } text-white py-4 rounded transition-colors duration-200 mt-4`}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
            
            <div className="text-center mt-4 text-sm text-gray-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                Sign up
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}