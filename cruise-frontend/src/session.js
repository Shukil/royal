import { useSyncExternalStore } from 'react';

// פרטי ההתחברות שנשמרים בדפדפן. כל הגישה ל-localStorage עוברת כאן,
// ועטופה ב-try/catch כי בחלון פרטי או כשהאחסון חסום הגישה עלולה לזרוק שגיאה
const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const CHANGE = 'session-change';

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // בלי אחסון המשתמש פשוט לא יישאר מחובר
  }
};

// מודיע לרכיבים שמשתמשים ב-useUser שהפרטים השתנו
const changed = () => window.dispatchEvent(new Event(CHANGE));

export const getToken = () => read(TOKEN_KEY);

// אותו אובייקט כל עוד הטקסט השמור לא השתנה (useSyncExternalStore דורש את זה)
let cachedRaw;
let cachedUser = null;
export const getUser = () => {
  const raw = read(USER_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedUser = JSON.parse(raw || 'null');
    } catch {
      cachedUser = null;
    }
  }
  return cachedUser;
};

export const saveSession = (token, user) => {
  write(TOKEN_KEY, token);
  write(USER_KEY, JSON.stringify(user));
  changed();
};

// פרטים עדכניים מהשרת (/auth/me) או טוקן חדש אחרי החלפת סיסמה, בלי להתחבר מחדש
export const saveUser = (user) => {
  write(USER_KEY, JSON.stringify(user));
  changed();
};
export const saveToken = (token) => {
  write(TOKEN_KEY, token);
  changed();
};

export const clearSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // אין מה לנקות
  }
  // הנתונים מהשרת שנשמרו לשימוש בלי אינטרנט (vite.config.js) שייכים למשתמש שהתנתק
  if (typeof caches !== 'undefined') caches.delete('api').catch(() => {});
  changed();
};

// המשתמש המחובר, ומתעדכן כשהפרטים משתנים (גם בלשונית אחרת)
const subscribe = (onChange) => {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener('storage', onChange);
  };
};
export const useUser = () => useSyncExternalStore(subscribe, getUser, () => null);
export const useToken = () => useSyncExternalStore(subscribe, getToken, () => null);

// מה שכתוב בתוך הטוקן: מתי הוא פג (exp, במילישניות) והאם סימנו "השאר אותי מחובר" (remember).
// טוקנים ישנים בלי הסימון היו של 30 יום, אז הם נחשבים "השאר אותי מחובר" (כמו בשרת)
export const tokenInfo = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { exp: payload.exp * 1000, remember: payload.r !== false };
  } catch {
    return null;
  }
};

// שם פרטי ושם משפחה, גם למשתמשים שנשמרו לפני שהשדות האלה נוספו (רק name מלא)
export const firstNameOf = (user) => (user?.firstName || user?.name?.split(' ')[0] || '').trim();
export const lastNameOf = (user) => (user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '').trim();
