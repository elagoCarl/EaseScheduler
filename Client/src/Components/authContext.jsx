import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // New loading state

    // On app startup, fetch the current user and bypass cache using a query parameter
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await axios.get(
                    `http://localhost:8080/accounts/getCurrentAccount?t=${Date.now()}`,
                    { withCredentials: true }
                );
                if (response.data.successful && response.data.account) { // Adjust key if needed
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