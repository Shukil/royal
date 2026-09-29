import { useSyncExternalStore } from 'react';

// התקנת האתר כאפליקציה. ב-Chrome, ב-Edge ובאנדרואיד הדפדפן שולח beforeinstallprompt
// כבר בטעינה, לפני שדף ההתקנה נפתח, ולכן תופסים אותו כאן ברמת האתר ושומרים לשימוש מאוחר.
// באייפון אין אירוע כזה, ומתקינים ידנית מתפריט השיתוף (ההסבר בדף Install.jsx)
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // בלי הפס האוטומטי של הדפדפן; מציעים כפתור משלנו
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

// האם אפשר להציג כפתור "התקנה בלחיצה"
export const useCanInstall = () => useSyncExternalStore(subscribe, () => Boolean(deferred), () => false);

// פותח את חלון ההתקנה של הדפדפן. מחזיר true אם המשתמש אישר
export const promptInstall = async () => {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  notify();
  await e.prompt();
  const { outcome } = await e.userChoice;
  return outcome === 'accepted';
};

// האם האתר פתוח עכשיו כאפליקציה מותקנת (ולא בתוך דפדפן)
export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

// סוג המכשיר, כדי להציג קודם את ההסבר המתאים
export const detectPlatform = () => {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  // אייפד חדש מזדהה כמק, אבל יש לו מסך מגע
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return /SamsungBrowser/.test(ua) ? 'samsung' : 'android';
  return 'desktop';
};
