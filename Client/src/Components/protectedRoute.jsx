import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './authContext';
import PropTypes from 'prop-types';
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();
    // console.log("User object:", user);
    // console.log("Current path:", location.pathname);

    // Render a loading indicator while the auth state is being determined
    if (loading) {
        return (
            <div className="fixed inset-0 flex justify-center items-center bg-white z-50">
                <Loader2 className="rounded-full h-50 w-50  animate-spin transition stroke-blue-500" />
            </div>
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

    // Normalize the pathname to avoid issues with trailing slashes or casing
    const normalizedPath = location.pathname.replace(/\/$/, '').toLowerCase();

    // Routes accessible by Program Head and Admin
    const programHeadAndAdminPaths = ['/createaccount'];

    // Routes accessible only by Admin
    const adminOnlyPaths = ['/accountlist', '/deptprog'];

    // Routes that Admin cannot access (accessible by other roles)
    const adminRestrictedPaths = ['/courseprog', '/progyrsec', '/assignationscourseprof', '/course', '/settings', '/addconfigschedule', '/roomtimetable', '/proftimetable', '/sectiontimetable'];

    // Check for Program Head and Admin routes
    if (programHeadAndAdminPaths.includes(normalizedPath) &&
        user.Roles !== 'Admin' && user.Roles !== 'Program Head') {
        return <Navigate to="/403" state={{ from: location }} />;
    }

    // Check for Admin-only routes
    if (adminOnlyPaths.includes(normalizedPath) && user.Roles !== 'Admin') {
        return <Navigate to="/403" state={{ from: location }} />;
    }

    // Check for routes that Admin cannot access
    if (adminRestrictedPaths.includes(normalizedPath) && user.Roles === 'Admin') {
        return <Navigate to="/403" state={{ from: location }} />;
    }

    // If the user is logged in and verified, render the child component(s)
    return children;
};

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
};

export default ProtectedRoute;