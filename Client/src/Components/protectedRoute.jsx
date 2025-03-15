import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './authContext';
import PropTypes from 'prop-types';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();
    console.log(user)

    // Render a loading indicator while the auth state is being determined
    if (loading) {
        return (
            <div className="rounded-md h-12 w-12 border-4 border-t-4 border-blue-500 animate-spin absolute"></div>
        );
    }

    // If no user is found, redirect to the login page
    if (!user) {
        return <Navigate to="/loginPage" state={{ from: location }} />;
    }

    // If the user is logged in but not verified, redirect them to the OTP verification page
    if (!user.verified && location.pathname !== '/otpVerification') {
        return <Navigate to="/otpVerification" state={{ from: location }} />;
    }

    // If the user is logged in and verified, render the child component(s)
    return children;
};

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
