import { useEffect, useState } from 'react';
import api from './api';

// הודעות של המנהלים לכל המשתתפים, בראש כל דף (מפרסמים ב-AdminAnnouncements.jsx).
// נבדקות בכל טעינה, כל 5 דקות, וכשחוזרים לאתר. מי שסגר הודעה לא רואה אותה שוב במכשיר הזה
const REFRESH_EVERY = 5 * 60 * 1000;
const DISMISSED_KEY = 'dismissedAnnouncements';

const readDismissed = () => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
};

const timeOf = (iso) => new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

const AnnouncementBanner = () => {
  const [list, setList] = useState([]);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api.get('/announcements')
        .then((res) => alive && setList(res.data.announcements))
        .catch(() => {});
    load();
    const timer = setInterval(load, REFRESH_EVERY);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const dismiss = (id) => {
    // שומרים רק הודעות שעוד פעילות, כדי שהרשימה לא תגדל בלי סוף
    const next = [...dismissed.filter((d) => list.some((a) => a.id === d)), id];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // בלי אחסון ההודעה תופיע שוב בטעינה הבאה
    }
  };

  const visible = list.filter((a) => !dismissed.includes(a.id));
  if (!visible.length) return null;

  return (
    <div className="announcements" role="region" aria-label="הודעות מהמארגנים">
      {visible.map((a) => (
        <div key={a.id} className="announcement">
          <span className="announcement__icon" aria-hidden="true">📢</span>
          <p className="announcement__text">
            {a.text}
            <span className="announcement__meta">{a.by} · {timeOf(a.createdAt)}</span>
          </p>
          <button type="button" className="announcement__close" aria-label="סגירת ההודעה" onClick={() => dismiss(a.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default AnnouncementBanner;
