import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './authContext';
import PropTypes from 'prop-types';

const AdminRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    // Show a loading spinner while checking authentication status
    if (loading) {
        return (
            <div className="rounded-md h-12 w-12 border-4 border-t-4 border-blue-500 animate-spin absolute"></div>
        );
    }

    // Redirect unauthenticated users to the login page
    if (!user) {
        return <Navigate to="/loginPage" state={{ from: location }} />;
    }

    // Check if the user is an admin. Adjust this condition based on your actual role value.
    if (user.Roles !== 'Admin') {
        // Optionally, redirect to a forbidden page (like /403) if they are not authorized.
        return <Navigate to="/403" state={{ from: location }} />;
    }

    // If authenticated and an admin, render the protected component
    return children;
};

AdminRoute.propTypes = {
    children: PropTypes.node.isRequired,
};

export default AdminRoute;