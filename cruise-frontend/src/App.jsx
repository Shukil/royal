import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import Home from './Home';
import Login from './Login';
import Sidebar from './Sidebar';
import OfflineBanner from './OfflineBanner';
import AnnouncementBanner from './AnnouncementBanner';
import api from './api';
import {
  clearSession, getLastActivity, getToken, saveLastActivity, saveToken, saveUser, tokenInfo, useToken, useUser,
} from './session';

// כל דף נטען רק כשנכנסים אליו, כדי שהכניסה הראשונה תהיה מהירה גם באינטרנט האיטי של הספינה.
// דף הבית וההתחברות נטענים מיד, כי הם הדפים הראשונים שרואים. האפליקציה המותקנת שומרת מראש
// את כל הדפים (vite.config.js), כך שגם בלי אינטרנט הם נפתחים
const Schedule = lazy(() => import('./Schedule'));
const EventPage = lazy(() => import('./EventPage'));
const Register = lazy(() => import('./Register'));
const CabinDetails = lazy(() => import('./CabinDetails'));
const PersonalChecklist = lazy(() => import('./PersonalChecklist'));
const CabinChecklist = lazy(() => import('./CabinChecklist'));
const RomeGuide = lazy(() => import('./RomeGuide'));
const OdysseyInfo = lazy(() => import('./OdysseyInfo'));
const Itinerary = lazy(() => import('./Itinerary'));
const Guides = lazy(() => import('./Guides'));
const DestinationGuide = lazy(() => import('./DestinationGuide'));
const Emergency = lazy(() => import('./Emergency'));
const Install = lazy(() => import('./Install'));
const ForgotPassword = lazy(() => import('./ForgotPassword'));
const ResetPassword = lazy(() => import('./ResetPassword'));
const Plan = lazy(() => import('./Plan'));
const Tasks = lazy(() => import('./Tasks'));
const Updates = lazy(() => import('./Updates'));
const Profile = lazy(() => import('./Profile'));
const AdminFamilies = lazy(() => import('./AdminFamilies'));
const AdminAnnouncements = lazy(() => import('./AdminAnnouncements'));
const Documents = lazy(() => import('./Documents'));
// החיפוש טוען את תוכן כל הדפים, אז גם הוא נטען רק כשנכנסים אליו
const Search = lazy(() => import('./Search'));

// עמודים שמוצגים בלי התפריט הצדדי. רק הם פתוחים למי שלא מחובר; כל השאר מעבירים להתחברות
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

// מעבר לדף חדש מתחיל מראש הדף. לא בקישור לעוגן בתוך הדף (#), ולא בחזרה אחורה,
// שבה נשארים במקום שבו היינו
const useScrollToTopOnNavigate = () => {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === 'POP') return undefined;
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }
    // קישור מדף אחר לעוגן (למשל מתוצאת חיפוש): הדפדפן לא גולל לבד, אז גוללים כשהקטע מופיע
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let timer;
    const tick = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView();
      else if (tries++ < 20) timer = setTimeout(tick, 50);
    };
    tick();
    return () => clearTimeout(timer);
  }, [pathname, hash, navigationType]);
};

// בכל טעינה של האתר: פרטי המשתמש העדכניים מהשרת (חדר, משפחה), שגם מעירים את השרת מוקדם.
// טוקן שכבר לא תקף (למשל אחרי החלפת סיסמה במכשיר אחר) מנתק את המכשיר הזה.
// בלי התחברות רק מעירים את השרת, כדי שההתחברות עצמה תהיה מהירה
const useFreshSession = () => {
  useEffect(() => {
    if (!navigator.onLine) return;
    if (!getToken()) {
      api.get('/health').catch(() => {});
      return;
    }
    api.get('/auth/me')
      .then((res) => saveUser(res.data.user))
      .catch((err) => {
        if (err.response?.status === 401) clearSession();
      });
  }, []);
};

// ===== ניתוק אחרי 15 דקות בלי פעילות =====
// בלי "השאר אותי מחובר" הטוקן תקף ל-15 דקות. כל עוד משתמשים באתר (לחיצה, הקלדה, גלילה) ונשארו
// פחות מ-10 דקות, מבקשים מהשרת טוקן חדש ל-15 דקות נוספות. עם "השאר אותי מחובר" הטוקן תקף ל-30 יום.
// בלי אינטרנט (על הספינה) אי אפשר לחדש את הטוקן, אז סופרים 15 דקות מהפעילות האחרונה במכשיר עצמו:
// מי שמשתמש באתר בלי חיבור לא מתנתק באמצע ויכול להמשיך לראות את המידע השמור. כשהחיבור חוזר,
// טוקן שפג בינתיים כבר לא תקף בשרת, ואז מתחברים מחדש
const IDLE_LIMIT = 15 * 60 * 1000;
const RENEW_WHEN_LEFT = 10 * 60 * 1000;
const CHECK_EVERY = 30 * 1000;
const SAVE_ACTIVITY_EVERY = 15 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

const useSessionTimeout = (token) => {
  useEffect(() => {
    const info = token && tokenInfo(token);
    if (!info) return undefined;

    // הפעילות האחרונה: מה שנשמר במכשיר, אבל לא לפני ההתחברות הנוכחית
    let lastActivity = Math.max(getLastActivity(), info.issued || 0);
    let renewing = false;

    const renewIfNeeded = () => {
      const left = info.exp - Date.now();
      if (info.remember || renewing || !navigator.onLine || left <= 0 || left > RENEW_WHEN_LEFT) return;
      renewing = true;
      api.post('/auth/refresh')
        .then((res) => res.data.token && saveToken(res.data.token))
        .catch(() => {})
        .finally(() => {
          renewing = false;
        });
    };

    const check = () => {
      const now = Date.now();
      if (info.remember) {
        if (now >= info.exp) clearSession();
        return;
      }
      // 15 דקות בלי שימוש: מתנתקים, גם בלי אינטרנט
      if (now - lastActivity >= IDLE_LIMIT) {
        clearSession();
        return;
      }
      // עם חיבור, טוקן שפג כבר לא יעבוד בשרת
      if (navigator.onLine && now >= info.exp) clearSession();
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivity > SAVE_ACTIVITY_EVERY) saveLastActivity(now);
      lastActivity = now;
      renewIfNeeded();
    };
    // חזרה לאתר או חזרת החיבור: בודקים מיד (טיימרים מתעכבים כשהטלפון ברקע), ומחדשים אם צריך
    const onReturn = () => {
      if (document.visibilityState !== 'visible') return;
      check();
      renewIfNeeded();
    };

    check();
    const timer = setInterval(check, CHECK_EVERY);
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('online', onReturn);
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true, capture: true }));

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('online', onReturn);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity, { capture: true }));
    };
  }, [token]);
};

const AppLayout = () => {
  const location = useLocation();
  useScrollToTopOnNavigate();
  useFreshSession();
  const user = useUser();
  const token = useToken();
  useSessionTimeout(token);
  const loggedIn = Boolean(user && token);
  const hideSidebar = AUTH_PATHS.includes(location.pathname);

  // מי שלא מחובר לא רואה שום דבר באתר חוץ מדפי ההתחברות. אחרי ההתחברות חוזרים לדף שביקשו
  if (!loggedIn && !hideSidebar) {
    const from = location.pathname + location.search + location.hash;
    return <Navigate to="/login" replace state={from === '/' ? undefined : { from }} />;
  }
  // מי שכבר מחובר לא צריך את דפי ההתחברות וההרשמה
  if (loggedIn && (location.pathname === '/login' || location.pathname === '/register')) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <a href="#main" className="skip-link">דלג לתוכן הראשי</a>
      {!hideSidebar && <Sidebar />}

      {/* אזור התוכן הראשי - לוקח בחשבון את רוחב התפריט */}
      <main id="main" tabIndex={-1} className={hideSidebar ? 'app-main app-main--bare' : 'app-main'}>
        <OfflineBanner />
        {loggedIn && <AnnouncementBanner />}
        <Suspense fallback={<p className="empty" role="status">טוען…</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/schedule/:id" element={<EventPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/cabin" element={<CabinDetails />} />
            <Route path="/personal-checklist" element={<PersonalChecklist />} />
            <Route path="/rome-guide" element={<RomeGuide />} />
            <Route path="/odyssey" element={<OdysseyInfo />} />
            <Route path="/itinerary" element={<Itinerary />} />
            <Route path="/guides" element={<Guides />} />
            <Route path="/guide/:id" element={<DestinationGuide />} />
            <Route path="/cabin-checklist" element={<CabinChecklist />} />
            <Route path="/emergency" element={<Emergency />} />
            <Route path="/install" element={<Install />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/updates" element={<Updates />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/admin/families" element={<AdminFamilies />} />
            <Route path="/admin/announcements" element={<AdminAnnouncements />} />
            <Route path="/search" element={<Search />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
};

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
