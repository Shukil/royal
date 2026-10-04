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
  const [testResult, setTestResult] = useState('');

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

  // התראת ניסיון לעצמי. מוודאים קודם שהמנוי של הטלפון הזה רשום בשרת
  const sendTest = async () => {
    setBusy(true);
    setError('');
    setTestResult('');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await api.post('/push/subscribe', { subscription: sub.toJSON() });
      const { data } = await api.post('/push/test');
      if (!data.enabled) setTestResult('ההתראות כבויות בשרת.');
      else if (data.sent > 0) setTestResult(`נשלחה התראה ל-${data.sent} מכשירים. אם היא לא הופיעה תוך כמה שניות, כדאי לבדוק בהגדרות הטלפון שההתראות לאפליקציה מותרות.`);
      else setTestResult(`השליחה נכשלה${data.failed.length ? ` (קוד ${data.failed.join(', ')})` : ''}. אפשר לנסות לכבות ולהפעיל שוב את ההתראות.`);
    } catch (err) {
      setError(errorMessage(err, 'שליחת הניסיון נכשלה. צריך חיבור לאינטרנט.'));
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
        <span className="notify__actions">
          <button type="button" className="btn btn--gold btn--sm" onClick={sendTest} disabled={busy}>שלחו לי התראת ניסיון</button>
          <button type="button" className="btn btn--outline btn--sm" onClick={disable} disabled={busy}>כיבוי</button>
        </span>
      )}
      {testResult && <p className="field__hint notify__error" role="status">{testResult}</p>}
      {error && <p className="alert alert--error notify__error" role="alert">{error}</p>}
    </div>
  );
};

export default Notifications;
