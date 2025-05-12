import axios from 'axios';
const renderURL = 'https://easescheduler.onrender.com';
const localURL = 'http://localhost:8080';
// Set this to true during development, false before pushing to production
export const isDevelopment = true;
export const BASE_URL = isDevelopment ? localURL : renderURL;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        await axiosInstance.get('/auth/refresh');
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
