import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import RoyalLogo from './RoyalLogo';
import { clearSession, useUser } from './session';
import { isStandalone } from './installPrompt';

const menuItems = [
  { path: '/search', label: 'חיפוש', icon: '🔍' },
  { path: '/schedule', label: 'לו״ז', icon: '📅' },
  { path: '/plan', label: 'תוכנית הטיול', icon: '📋' },
  { path: '/tasks', label: 'משימות', icon: '✅' },
  { path: '/itinerary', label: 'המסלול שלנו', icon: '🗺️' },
  { path: '/odyssey', label: 'על האודיסי', icon: '🚢' },
  { path: '/cabin', label: 'פרטי חדר', icon: '🛏️' },
  { path: '/personal-checklist', label: 'צ\'ק ליסט אישי', icon: '🎒' },
  { path: '/cabin-checklist', label: 'צ\'ק ליסט חדר', icon: '📋' },
  { path: '/guides', label: 'מדריכי יעדים', icon: '🧭' },
  { path: '/emergency', label: 'חירום ומידע חשוב', icon: '🆘' },
];

// דפי המנהלים מוצגים בתפריט רק למנהלים (מנהלי האתר ומנהלי המשפחות).
// השרת קובע מי מנהל, וזה מגיע עם פרטי המשתמש (/auth/me בכל טעינה). השרת גם חוסם את הדפים עצמם
const ADMIN_ITEMS = [
  { path: '/admin/families', label: 'ניהול משפחות', icon: '👨‍👩‍👧' },
  { path: '/updates', label: 'עדכוני האתר', icon: '🛠️' },
];

const Brand = () => (
  <Link to="/" className="brand" aria-label="Royal Caribbean · Odyssey of the Seas - דף הבית">
    <RoyalLogo compact />
  </Link>
);

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const user = useUser();
  const items = user?.isAdmin ? [...menuItems, ...ADMIN_ITEMS] : menuItems;

  // סגירה עם Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <>
      {/* סרגל עליון - מובייל בלבד */}
      <header className="topbar">
        <Brand />
        <button
          type="button"
          className="menu-button"
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label={open ? 'סגירת תפריט' : 'פתיחת תפריט'}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>

      <div className={`scrim${open ? ' is-open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <aside id="site-nav" className={`sidebar${open ? ' is-open' : ''}`}>
        {/* הלוגו הוא הכפתור לספירה לאחור (הדף הראשי) */}
        <Link
          to="/"
          className="brand brand--link"
          aria-label="ספירה לאחור · דף הבית"
          aria-current={location.pathname === '/' ? 'page' : undefined}
          onClick={() => {
            setOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <RoyalLogo />
          <span className="brand__ship">Odyssey of the Seas</span>
          <span className="brand__date">הפלגה בים התיכון · אוגוסט 2027</span>
        </Link>

        <nav aria-label="ניווט ראשי">
          <ul className="nav">
            {items.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="nav__link"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setOpen(false)} // סגירת התפריט במובייל אחרי מעבר עמוד
                  >
                    <span className="nav__icon" aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* כפתור לדף ההסבר על התקנה כאפליקציה. לא מוצג כשהאתר כבר פתוח כאפליקציה */}
        {!isStandalone() && (
          <Link
            to="/install"
            className="install-link"
            aria-current={location.pathname === '/install' ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            <span aria-hidden="true">📲</span>
            <span>
              <strong>להתקין כאפליקציה</strong>
              <small>עובד גם בלי אינטרנט</small>
            </span>
          </Link>
        )}

        <div className="sidebar__footer">
          {user ? (
            <>
              <strong>{user.name}</strong>
              {user.cabinNumber && <span>חדר {user.cabinNumber}</span>}
              <div className="sidebar__actions">
                <Link
                  to="/profile"
                  className="link-button"
                  aria-current={location.pathname === '/profile' ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  הפרופיל שלי
                </Link>
                <button type="button" className="link-button" onClick={handleLogout}>התנתקות</button>
              </div>
            </>
          ) : (
            <Link to="/login" className="link-button">התחברות לנוסעים</Link>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
