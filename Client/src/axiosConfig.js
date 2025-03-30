import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080', 
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
        // pang kuha ng tokens oo tangina sana gumana putcha
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
