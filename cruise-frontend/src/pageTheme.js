import { photos } from './photos';

// המראה של כותרת הדף לפי הכתובת: צבע לפי הקבוצה בתפריט (styles/tokens.css),
// ובדפים שעוסקים במקום מסוים גם תמונה שלו. התמונות הן אותן תמונות שמופיעות בדפים עצמם
// עם קרדיט מלא וקישור למקור (photos.js), ונשמרות לשימוש בלי אינטרנט
const GROUPS = {
  ship: ['/odyssey', '/cabin', '/cabin-checklist'],
  mine: ['/personal-checklist', '/documents', '/emergency', '/profile', '/install'],
  admin: ['/admin', '/updates'],
};

const HEROES = {
  '/odyssey': photos.ship.attractions[0],
  '/rome-guide': photos.rome.gallery[0],
  '/guides': photos.mykonos.gallery[0],
  '/itinerary': photos.santorini.gallery[0],
};

const matches = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

export const pageTheme = (pathname) => {
  const group = Object.keys(GROUPS).find((g) => GROUPS[g].some((p) => matches(pathname, p))) || 'trip';
  const guide = pathname.match(/^\/guide\/([\w-]+)/);
  const hero = guide ? photos[guide[1]]?.gallery?.[0] : HEROES[pathname];
  return { group, hero: hero || null };
};

// הקרדיט לצלם, כפי שנדרש ברישיון
export const creditOf = (photo) => `© ${photo.credit} · ${photo.license}`;
