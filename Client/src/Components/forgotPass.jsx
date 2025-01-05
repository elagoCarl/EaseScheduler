import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation
import axios from 'axios';
import image5 from './Img/5.jpg';

const ForgotPass = () => {
    const [email, setEmail] = useState(''); // State for email input
    const [message, setMessage] = useState(''); // State for feedback message
    const [isLoading, setIsLoading] = useState(false); // State for loading animation
    const [isRedirecting, setIsRedirecting] = useState(false); // State for redirection message
    const navigate = useNavigate(); // useNavigate for programmatic navigation

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true); // Show loading animation
        try {
            // Send a POST request to the backend to handle password reset
            const response = await axios.post('http://localhost:8080/accounts/forgotPass', { email });

            if (response.data.successful) {
                setMessage('An email has been sent to reset your password. Please check your inbox.');
                setIsRedirecting(true); // Show redirect message
                setTimeout(() => {
                    navigate('/loginPage'); // Redirect to login page after n seconds
                }, 3000);
            } else {
                setMessage(response.data.message || 'No account found with this email.'); // Show backend message
            }
        } catch (error) {
            console.error('Error:', error);
            setMessage(
                error.response?.data?.message || 'An error occurred. Please try again later.' // Show appropriate error message
            );
        } finally {
            setIsLoading(false); // Hide loading animation
        }
    };

    // Function to copy email to clipboard
    const handleCopyEmail = () => {
        const email = 'easescheduler@gmail.com'; // Replace with your EaseScheduler contact email
        navigator.clipboard.writeText(email).then(() => {
            alert('Email copied to clipboard: ' + email); // Optionally, show a success message
        }).catch((err) => {
            console.error('Failed to copy email: ', err);
        });
    };

    return (
        <div
            className="bg-cover bg-no-repeat min-h-screen flex flex-col justify-center items-center overflow-y-auto"
            style={{ backgroundImage: `url(${image5})` }}
        >
            {isLoading || isRedirecting ? (
                // Show loading spinner or redirecting message
                <div className="flex flex-col items-center justify-center min-h-screen">
                    <div className="w-40 h-40 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        {isRedirecting ? 'Redirecting to login...' : 'Processing your request (please check your email)...'}
                    </p>
                </div>
            ) : (
                <div id="content" role="main" className="w-full max-w-md mx-auto p-6">
                    {/* Centered EASESCHEDULER button */}
                    <div className="flex justify-center w-full">
                        <button
                            id="logoBtn"
                            className="text-lg md:text-3xl font-bold block text-blue-500"
                            onClick={() => navigate("/")}
                        >
                            EASE<span className="text-white">SCHEDULER</span>
                        </button>
                    </div>
                    <div className="mt-7 bg-black/40 rounded-xl shadow-lg dark:border-gray-700 border-2 border-indigo-300 p-10">
                        <div className="p-4 sm:p-7">
                            <div className="text-center">
                                <h1 className="block text-2xl font-bold text-gray-800 dark:text-white">Forgot password?</h1>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                    Remember your password?{' '}
                                    <a
                                        className="text-blue-600 decoration-2 hover:underline font-medium"
                                        href="/loginPage"
                                    >
                                        Login here
                                    </a>
                                </p>
                            </div>

                            <div className="mt-5">
                                <form onSubmit={handleSubmit}>
                                    <div className="grid gap-y-4">
                                        <div>
                                            <label
                                                htmlFor="email"
                                                className="block text-sm font-bold ml-1 mb-2 dark:text-white"
                                            >
                                                Email address
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="email"
                                                    id="email"
                                                    name="email"
                                                    className="py-3 px-4 block w-full border-2 border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                                                    required
                                                    aria-describedby="email-error"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            className="py-3 px-4 inline-flex justify-center items-center gap-2 rounded-md border border-transparent font-semibold text-white bg-blue-700 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-sm dark:focus:ring-offset-gray-800"
                                        >
                                            Reset password
                                        </button>
                                    </div>
                                </form>
                                {message && (
                                    <p className="mt-4 text-center text-green-500">{message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <p className="mt-3 flex justify-center items-center text-center divide-x divide-gray-300 dark:divide-gray-700">
                        <a
                            className="pr-3.5 inline-flex items-center gap-x-2 text-sm text-gray-600 decoration-2 hover:underline hover:text-blue-600 dark:text-gray-500 dark:hover:text-gray-200"
                            href="/"
                        >
                            Home
                        </a>
                        <a
                            className="pl-3 inline-flex items-center gap-x-2 text-sm text-gray-600 decoration-2 hover:underline hover:text-blue-600 dark:text-gray-500 dark:hover:text-gray-200"
                            href="#"
                            onClick={handleCopyEmail} // Trigger the copy email function
                        >
                            Contact us!
                        </a>
                    </p>
                </div>
            )}
        </div>
    );
};

export default ForgotPass;
