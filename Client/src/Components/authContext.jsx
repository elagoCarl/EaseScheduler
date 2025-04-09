import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from '../axiosConfig';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    // Fetch the current user on app startup
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await axios.get(
                    `${BASE_URL}/accounts/getCurrentAccount?t=${Date.now()}`,
                    { withCredentials: true }
                );
                if (response.data.successful && response.data.account) {
                    setUser(response.data.account);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("User not authenticated or token expired", error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchCurrentUser();
    }, []);

    // Only redirect if the user is on the login page
    useEffect(() => {
        if (user && (location.pathname === '/loginPage' || location.pathname === '/')) {
            navigate('/homePage');
        }
    }, [user, navigate, location.pathname]);

    return (
        <AuthContext.Provider value={{ user, setUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
