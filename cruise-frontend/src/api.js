import axios from 'axios';
import { clearSession, getToken } from './session';

// כתובת השרת. אפשר לשנות בלי לגעת בקוד דרך VITE_API_URL בקובץ .env של הפרונטנד
export const API_BASE = import.meta.env.VITE_API_URL || 'https://royal-q8gn.onrender.com/api';

// כל הקריאות לשרת עוברות דרך המופע הזה, שמצרף אוטומטית את טוקן ההתחברות
const api = axios.create({ baseURL: API_BASE });

// ===== "השרת מתעורר" =====
// השרת ב-Render נרדם אחרי רבע שעה בלי בקשות, והבקשה הראשונה אחרי זה לוקחת עד דקה.
// כשבקשה מחכה יותר מכמה שניות מוצג פס הסבר (OfflineBanner.jsx) במקום מסך שנראה תקוע
const SLOW_MS = 4000;
let pending = 0;
let slow = false;
let slowTimer;
const listeners = new Set();
const setSlow = (value) => {
  if (slow === value) return;
  slow = value;
  listeners.forEach((l) => l());
};
const started = () => {
  pending += 1;
  if (pending === 1) slowTimer = setTimeout(() => setSlow(true), SLOW_MS);
};
const finished = () => {
  pending = Math.max(0, pending - 1);
  if (pending === 0) {
    clearTimeout(slowTimer);
    setSlow(false);
  }
};
export const subscribeServerSlow = (onChange) => {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
};
export const isServerSlow = () => slow;

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  started();
  return config;
});

api.interceptors.response.use(
  (response) => {
    finished();
    return response;
  },
  (error) => {
    finished();
    // ההתחברות פגה או בוטלה (למשל אחרי 15 דקות בלי פעילות, או החלפת סיסמה במכשיר אחר): מתנתקים,
    // והאתר מעביר לדף ההתחברות (App.jsx)
    if (error.response?.status === 401 && getToken()) clearSession();
    return Promise.reject(error);
  },
);

// הודעת השגיאה מהשרת, או הודעת ברירת מחדל
export const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

export default api;
