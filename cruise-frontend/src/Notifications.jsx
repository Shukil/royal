import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from './api';
import { detectPlatform, isStandalone } from './installPrompt';
import { getToken } from './session';

// המפתח הציבורי מגיע כ-base64url, והדפדפן צריך אותו כבייטים
const keyBytes = (base64) => {
  const b64 = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// מצבים: loading | off | on | blocked | unsupported | install (אייפון שעוד לא התקין) | disabled (אין מפתחות בשרת)
const Notifications = () => {
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supported()) {
        // באייפון התראות עובדות רק מהאפליקציה שהותקנה במסך הבית
        setState(detectPlatform() === 'ios' && !isStandalone() ? 'install' : 'unsupported');
        return;
      }
      if (Notification.permission === 'denied') return setState('blocked');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!alive) return;
      if (!sub) {
        const { data } = await api.get('/push/key');
        if (alive) setState(data.key ? 'off' : 'disabled');
        return;
      }
      setState('on');
      // מוודאים שהמנוי משויך למשתמש שמחובר עכשיו (אם מישהו אחר התחבר מהטלפון הזה)
      api.post('/push/subscribe', { subscription: sub.toJSON() }).catch(() => {});
    })().catch(() => alive && setState('unsupported'));
    return () => {
      alive = false;
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.get('/push/key');
      if (!data.key) return setState('disabled');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return setState(permission === 'denied' ? 'blocked' : 'off');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(data.key) });
      await api.post('/push/subscribe', { subscription: sub.toJSON() });
      setState('on');
    } catch (err) {
      setError(errorMessage(err, 'לא הצלחנו להפעיל התראות. צריך חיבור לאינטרנט.'));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError('');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.delete('/push/subscribe', { data: { endpoint: sub.endpoint } }).catch(() => {});
        await sub.unsubscribe();
      }
      setState('off');
    } catch (err) {
      setError(errorMessage(err, 'לא הצלחנו לכבות את ההתראות.'));
    } finally {
      setBusy(false);
    }
  };

  if (!getToken() || ['loading', 'unsupported', 'disabled'].includes(state)) return null;

  return (
    <div className="notify">
      <p className="notify__text">
        <strong>🔔 התראות לטלפון</strong>
        <span>
          {state === 'on' && 'פעיל בטלפון הזה: תקבלו התראה על אירוע חדש או שבוטל, נקודת מפגש ושינוי בשעון הספינה.'}
          {state === 'off' && 'התראה על אירוע חדש או שבוטל בלו״ז, נקודת מפגש ושינוי בשעון הספינה, גם כשהאתר סגור.'}
          {state === 'blocked' && 'ההתראות חסומות לאתר הזה. אפשר לאפשר אותן בהגדרות הדפדפן או הטלפון, ואז לרענן.'}
          {state === 'install' && <>באייפון התראות עובדות רק אחרי <Link to="/install">התקנת האתר למסך הבית</Link>. אחרי ההתקנה פותחים מהסמל ומפעילים כאן.</>}
        </span>
      </p>
      {state === 'off' && (
        <button type="button" className="btn btn--gold btn--sm" onClick={enable} disabled={busy}>הפעלת התראות</button>
      )}
      {state === 'on' && (
        <button type="button" className="btn btn--outline btn--sm" onClick={disable} disabled={busy}>כיבוי</button>
      )}
      {error && <p className="alert alert--error notify__error" role="alert">{error}</p>}
    </div>
  );
};

export default Notifications;
