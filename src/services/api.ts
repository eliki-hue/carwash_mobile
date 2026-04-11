import axios from "axios";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// const api = axios.create({
//   baseURL: "http://192.168.100.17:8000/api/",
// });

// api.interceptors.request.use(async (config) => {
//   const token = await AsyncStorage.getItem("token");

//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }

//   return config;
// });


// src/services/api.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.100.17:8000/api'; // Replace with your API URL

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });
        await AsyncStorage.setItem('access_token', response.data.access);
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_role']);
        // You might want to use navigation here, but for now just return error
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;