import { useSyncExternalStore } from 'react';
import { isServerSlow, subscribeServerSlow } from './api';

// פס שמופיע כשאין חיבור לאינטרנט (למשל על הספינה בלי חבילת גלישה).
// האתר ממשיך לעבוד עם המידע האחרון שנשמר, אבל שינויים דורשים חיבור.
// כשיש חיבור אבל השרת מתעכב (נרדם ב-Render ומתעורר), מוצג במקומו פס "השרת מתעורר"
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
  const slow = useSyncExternalStore(subscribeServerSlow, isServerSlow, () => false);

  if (!online) {
    return (
      <p className="offline-banner" role="status">
        📡 אין חיבור לאינטרנט. מוצג המידע האחרון שנשמר, ושינויים (אישורי הגעה, צ׳ק ליסטים ותגובות) יתאפשרו כשהחיבור יחזור.
      </p>
    );
  }
  if (slow) {
    return (
      <p className="offline-banner" role="status">
        ⏳ השרת מתעורר… אחרי הפסקה זה לוקח עד דקה, ומשם הכול חוזר למהירות הרגילה.
      </p>
    );
  }
  return null;
};

export default OfflineBanner;
