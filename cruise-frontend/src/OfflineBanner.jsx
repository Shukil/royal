import { useSyncExternalStore } from 'react';

// פס שמופיע כשאין חיבור לאינטרנט (למשל על הספינה בלי חבילת גלישה).
// האתר ממשיך לעבוד עם המידע האחרון שנשמר, אבל שינויים דורשים חיבור
const subscribe = (onChange) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

const OfflineBanner = () => {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;

  return (
    <p className="offline-banner" role="status">
      📡 אין חיבור לאינטרנט. מוצג המידע האחרון שנשמר, ושינויים (אישורי הגעה, צ׳ק ליסטים ותגובות) יתאפשרו כשהחיבור יחזור.
    </p>
  );
};

export default OfflineBanner;
