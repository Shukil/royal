import { useLayoutEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import Home from './Home';
import Schedule from './Schedule';
import EventPage from './EventPage';
import Login from './Login';
import Register from './Register';
import Sidebar from './Sidebar';
import CabinDetails from './CabinDetails';
import PersonalChecklist from './PersonalChecklist';
import CabinChecklist from './CabinChecklist';
import RomeGuide from './RomeGuide';
import OdysseyInfo from './OdysseyInfo';
import Itinerary from './Itinerary';
import Guides from './Guides';
import DestinationGuide from './DestinationGuide';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';

// עמודים שמוצגים בלי התפריט הצדדי
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

// מעבר לדף חדש מתחיל מראש הדף. לא בקישור לעוגן בתוך הדף (#), ולא בחזרה אחורה,
// שבה נשארים במקום שבו היינו
const useScrollToTopOnNavigate = () => {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (hash || navigationType === 'POP') return;
    window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);
};

const AppLayout = () => {
  const location = useLocation();
  useScrollToTopOnNavigate();
  const hideSidebar = AUTH_PATHS.includes(location.pathname);

  return (
    <>
      <a href="#main" className="skip-link">דלג לתוכן הראשי</a>
      {!hideSidebar && <Sidebar />}

      {/* אזור התוכן הראשי - לוקח בחשבון את רוחב התפריט */}
      <main id="main" tabIndex={-1} className={hideSidebar ? 'app-main app-main--bare' : 'app-main'}>
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
