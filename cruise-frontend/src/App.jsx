import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import Home from './Home';
import Schedule from './Schedule';
import EventPage from './EventPage';
import Login from './Login';
import Register from './Register';
import Sidebar from './Sidebar';
import OfflineBanner from './OfflineBanner';
import CabinDetails from './CabinDetails';
import PersonalChecklist from './PersonalChecklist';
import CabinChecklist from './CabinChecklist';
import RomeGuide from './RomeGuide';
import OdysseyInfo from './OdysseyInfo';
import Itinerary from './Itinerary';
import Guides from './Guides';
import DestinationGuide from './DestinationGuide';
import Emergency from './Emergency';
import Install from './Install';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import Plan from './Plan';
import Tasks from './Tasks';
import Updates from './Updates';
import Profile from './Profile';
import AdminFamilies from './AdminFamilies';
import api from './api';
import { clearSession, getToken, saveToken, saveUser, tokenInfo, useToken, useUser } from './session';

// החיפוש טוען את תוכן כל הדפים, אז הוא נטען רק כשנכנסים אליו
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
// פחות מ-10 דקות, מבקשים מהשרת טוקן חדש ל-15 דקות נוספות. בלי פעילות הטוקן פג והמשתמש מתנתק,
// גם אם הדף פשוט נשאר פתוח. עם "השאר אותי מחובר" הטוקן תקף ל-30 יום ולא מתחדש
const RENEW_WHEN_LEFT = 10 * 60 * 1000;
const MAX_TIMEOUT = 2 ** 31 - 1; // setTimeout לא מקבל יותר מכ-24 יום
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

const useSessionTimeout = (token) => {
  useEffect(() => {
    const info = token && tokenInfo(token);
    if (!info) return undefined;

    const expireIfDue = () => {
      if (Date.now() >= info.exp) clearSession();
    };
    // הטיימר עשוי להתעכב כשהטלפון ברקע, אז בודקים שוב כשחוזרים לאתר
    const timer = setTimeout(expireIfDue, Math.min(Math.max(0, info.exp - Date.now()), MAX_TIMEOUT));
    const onVisible = () => document.visibilityState === 'visible' && expireIfDue();
    document.addEventListener('visibilitychange', onVisible);

    let renewing = false;
    const onActivity = () => {
      const left = info.exp - Date.now();
      if (info.remember || renewing || left <= 0 || left > RENEW_WHEN_LEFT) return;
      renewing = true;
      api.post('/auth/refresh')
        .then((res) => res.data.token && saveToken(res.data.token))
        .catch(() => {})
        .finally(() => {
          renewing = false;
        });
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true, capture: true }));

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
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
          <Route path="/admin/families" element={<AdminFamilies />} />
          <Route path="/search" element={<Suspense fallback={<p className="empty">טוען…</p>}><Search /></Suspense>} />
        </Routes>
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
