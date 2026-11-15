import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Backpack, BedDouble, CalendarDays, ClipboardList, Compass, ConciergeBell, FolderOpen, LifeBuoy, ListChecks,
  Map as MapIcon, Megaphone, Ship, Smartphone, Users, Wrench,
} from 'lucide-react';
import RoyalLogo from './RoyalLogo';
import { clearSession, useUser } from './session';
import { isStandalone } from './installPrompt';

// הניווט של האתר: סרגל עליון. במחשב הקבוצות נפתחות כתפריטים מהסרגל;
// בטלפון כפתור התפריט פותח מגירה מהצד עם אותן קבוצות.
// התפריט מחולק לקבוצות לפי נושא, כדי שיהיה קל למצוא דף בלי לקרוא רשימה ארוכה אחת.
// האייקונים מצוירים בקו אחיד (lucide), כך שהם נראים אותו דבר בכל מכשיר, בניגוד לאימוג׳י
const MENU_GROUPS = [
  {
    id: 'trip',
    title: 'הטיול',
    items: [
      { path: '/schedule', label: 'לו״ז', icon: CalendarDays },
      { path: '/plan', label: 'תוכנית הטיול', icon: ClipboardList },
      { path: '/tasks', label: 'משימות', icon: ListChecks },
      { path: '/itinerary', label: 'המסלול שלנו', icon: MapIcon },
      { path: '/guides', label: 'מדריכי יעדים', icon: Compass },
    ],
  },
  {
    id: 'ship',
    title: 'הספינה והחדר',
    items: [
      { path: '/odyssey', label: 'על האודיסי', icon: Ship },
      { path: '/cabin', label: 'פרטי חדר', icon: BedDouble },
      { path: '/cabin-checklist', label: 'צ\'ק ליסט חדר', icon: ConciergeBell },
    ],
  },
  {
    id: 'mine',
    title: 'שלי',
    items: [
      { path: '/personal-checklist', label: 'צ\'ק ליסט אישי', icon: Backpack },
      { path: '/documents', label: 'המסמכים שלי', icon: FolderOpen },
      { path: '/emergency', label: 'חירום ומידע חשוב', icon: LifeBuoy },
    ],
  },
];

// דף ההסבר על התקנה כאפליקציה. לא מוצג כשהאתר כבר פתוח כאפליקציה
const INSTALL_ITEM = { path: '/install', label: 'להתקין כאפליקציה', icon: Smartphone };

// דפי המנהלים מוצגים בתפריט רק למנהלים (מנהלי האתר ומנהלי המשפחות).
// השרת קובע מי מנהל, וזה מגיע עם פרטי המשתמש (/auth/me בכל טעינה). השרת גם חוסם את הדפים עצמם
const ADMIN_GROUP = {
  id: 'admin',
  title: 'ניהול',
  items: [
    { path: '/admin/announcements', label: 'הודעה לכולם', icon: Megaphone },
    { path: '/admin/families', label: 'ניהול משפחות', icon: Users },
    { path: '/updates', label: 'עדכוני האתר', icon: Wrench },
  ],
};

const isActivePath = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

const menuGroups = (isAdmin) => {
  const groups = isStandalone()
    ? MENU_GROUPS
    : MENU_GROUPS.map((g) => (g.id === 'mine' ? { ...g, items: [...g.items, INSTALL_ITEM] } : g));
  return isAdmin ? [...groups, ADMIN_GROUP] : groups;
};

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false); // המגירה בטלפון
  const [menu, setMenu] = useState(null); // הקבוצה הפתוחה בסרגל העליון (במחשב)
  const topnav = useRef(null);
  const user = useUser();
  const groups = menuGroups(user?.isAdmin);

  const closeAll = () => {
    setDrawerOpen(false);
    setMenu(null);
  };

  // סגירה עם Escape, ובלחיצה מחוץ לתפריט הפתוח
  useEffect(() => {
    if (!drawerOpen && !menu) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setDrawerOpen(false);
      setMenu(null);
    };
    const onPointer = (e) => {
      if (!topnav.current?.contains(e.target)) setMenu(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [drawerOpen, menu]);

  const handleLogout = () => {
    closeAll();
    clearSession();
    navigate('/login');
  };

  const pageLink = (item, className) => (
    <Link
      to={item.path}
      className={className}
      aria-current={isActivePath(location.pathname, item.path) ? 'page' : undefined}
      onClick={closeAll} // סגירת התפריט אחרי מעבר עמוד
    >
      <item.icon className="nav__icon" size={20} strokeWidth={1.9} aria-hidden="true" />
      {item.label}
    </Link>
  );

  return (
    <>
      <header className="topbar">
        {/* הלוגו הוא הכפתור לדף הראשי (הספירה לאחור) */}
        <Link
          to="/"
          className="brand"
          aria-label="Royal Caribbean · Odyssey of the Seas - דף הבית"
          aria-current={location.pathname === '/' ? 'page' : undefined}
          onClick={() => {
            closeAll();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <RoyalLogo compact />
          <span className="brand__ship">Odyssey of the Seas</span>
        </Link>

        {/* מחשב: הקבוצות בסרגל, כל אחת נפתחת לתפריט */}
        <nav className="topnav" aria-label="ניווט ראשי" ref={topnav}>
          {groups.map((group) => {
            const open = menu === group.id;
            const current = group.items.some((item) => isActivePath(location.pathname, item.path));
            return (
              <div key={group.id} className="topnav__group">
                <button
                  type="button"
                  className={`topnav__button${current ? ' is-current' : ''}`}
                  aria-expanded={open}
                  aria-controls={`topnav-${group.id}`}
                  onClick={() => setMenu(open ? null : group.id)}
                >
                  {group.title}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2.5 4.5 6 8l3.5-3.5" />
                  </svg>
                </button>
                <ul id={`topnav-${group.id}`} className="topnav__menu" hidden={!open}>
                  {group.items.map((item) => (
                    <li key={item.path}>{pageLink(item, 'topnav__link')}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="topbar__end">
          <Link
            to="/search"
            className="topbar__icon"
            aria-label="חיפוש"
            aria-current={location.pathname === '/search' ? 'page' : undefined}
            onClick={closeAll}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </Link>
          {user && (
            <div className="topbar__user">
              <Link
                to="/profile"
                className="topbar__name"
                aria-current={location.pathname === '/profile' ? 'page' : undefined}
                onClick={closeAll}
              >
                {user.name}
              </Link>
              <button type="button" className="topbar__logout" onClick={handleLogout}>התנתקות</button>
            </div>
          )}
          <button
            type="button"
            className="menu-button"
            aria-expanded={drawerOpen}
            aria-controls="site-nav"
            aria-label={drawerOpen ? 'סגירת תפריט' : 'פתיחת תפריט'}
            onClick={() => setDrawerOpen((o) => !o)}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {drawerOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </header>

      <div className={`scrim${drawerOpen ? ' is-open' : ''}`} onClick={() => setDrawerOpen(false)} aria-hidden="true" />

      {/* טלפון: מגירה מהצד עם כל הדפים */}
      <aside id="site-nav" className={`sidebar${drawerOpen ? ' is-open' : ''}`}>
        <nav className="sidebar__nav" aria-label="כל הדפים">
          {groups.map((group) => (
            <div key={group.id} className="nav-group" role="group" aria-labelledby={`nav-${group.id}`}>
              <p id={`nav-${group.id}`} className="nav-group__title">{group.title}</p>
              <ul className="nav">
                {group.items.map((item) => (
                  <li key={item.path}>{pageLink(item, 'nav__link')}</li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

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
                  onClick={closeAll}
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
