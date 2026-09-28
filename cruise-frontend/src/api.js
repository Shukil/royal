import axios from 'axios';
import { getToken } from './session';

// כתובת השרת. אפשר לשנות בלי לגעת בקוד דרך VITE_API_URL בקובץ .env של הפרונטנד
export const API_BASE = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://royal-q8gn.onrender.com/api' : 'http://localhost:5000/api');

// כל הקריאות לשרת עוברות דרך המופע הזה, שמצרף אוטומטית את טוקן ההתחברות
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// הודעת השגיאה מהשרת, או הודעת ברירת מחדל
export const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

export default api;
