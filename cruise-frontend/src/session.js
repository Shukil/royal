// פרטי ההתחברות שנשמרים בדפדפן. כל הגישה ל-localStorage עוברת כאן,
// ועטופה ב-try/catch כי בחלון פרטי או כשהאחסון חסום הגישה עלולה לזרוק שגיאה
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const getToken = () => read(TOKEN_KEY);

export const getUser = () => {
  try {
    return JSON.parse(read(USER_KEY) || 'null');
  } catch {
    return null;
  }
};

export const saveSession = (token, user) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // בלי אחסון המשתמש פשוט לא יישאר מחובר
  }
};

export const clearSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // אין מה לנקות
  }
};

// שם פרטי ושם משפחה, גם למשתמשים שנשמרו לפני שהשדות האלה נוספו (רק name מלא)
export const firstNameOf = (user) => (user?.firstName || user?.name?.split(' ')[0] || '').trim();
export const lastNameOf = (user) => (user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '').trim();
