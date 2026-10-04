import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api, { errorMessage } from './api';
import { useUser } from './session';

const HOUR_LABELS = { 2: 'שעתיים', 6: '6 שעות', 12: '12 שעות', 24: 'יום', 48: 'יומיים', 72: '3 ימים' };
const MAX_TEXT = 300;

const whenOf = (iso) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// הודעה לכולם: מופיעה בראש האתר אצל כל המשתתפים (AnnouncementBanner.jsx),
// ונשלחת כהתראה לטלפון למי שהפעיל התראות. רק למנהלים
const AdminAnnouncements = () => {
  const user = useUser();
  const [list, setList] = useState([]);
  const [hours, setHours] = useState([]);
  const [text, setText] = useState('');
  const [duration, setDuration] = useState(12);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get('/announcements')
      .then((res) => {
        if (!alive) return;
        setList(res.data.announcements);
        setHours(res.data.hours);
      })
      .catch(() => alive && setError('לא הצלחנו לטעון את ההודעות. צריך חיבור לאינטרנט.'));
    return () => {
      alive = false;
    };
  }, []);

  if (user && !user.isAdmin) return <Navigate to="/" replace />;

  const publish = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setSending(true);
    try {
      const res = await api.post('/announcements', { text, hours: Number(duration) });
      setList((l) => [res.data.announcement, ...l]);
      setText('');
      setNotice('ההודעה פורסמה. היא מופיעה עכשיו בראש האתר אצל כולם.');
    } catch (err) {
      setError(errorMessage(err, 'הפרסום נכשל. נסה שוב.'));
    } finally {
      setSending(false);
    }
  };

  const remove = async (a) => {
    if (!window.confirm('להסיר את ההודעה? היא תיעלם אצל כולם.')) return;
    try {
      await api.delete(`/announcements/${a.id}`);
      setList((l) => l.filter((x) => x.id !== a.id));
      setNotice('ההודעה הוסרה.');
    } catch (err) {
      setError(errorMessage(err, 'ההסרה נכשלה.'));
    }
  };

  return (
    <div className="page">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">הודעה לכולם 📢</h1>
          <p className="card__lead">
            ההודעה מופיעה בראש האתר אצל כל המשתתפים, ונשלחת כהתראה לטלפון למי שהפעיל התראות.
          </p>
        </header>

        <div className="card__body">
          {error && <p className="alert alert--error" role="alert">{error}</p>}
          {notice && <p className="alert alert--success" role="status">{notice}</p>}

          <form onSubmit={publish} className="section">
            <div className="field">
              <label className="field__label" htmlFor="ann-text">ההודעה</label>
              <textarea
                id="ann-text"
                className="input textarea"
                rows={3}
                maxLength={MAX_TEXT}
                placeholder="למשל: נפגשים בלובי בסיפון 5 ב-8:00 לפני הירידה לנמל"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
              />
              <span className="field__hint">{text.length}/{MAX_TEXT}</span>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="ann-hours">להציג במשך</label>
              <select id="ann-hours" className="input" value={duration} onChange={(e) => setDuration(e.target.value)}>
                {hours.map((h) => <option key={h} value={h}>{HOUR_LABELS[h] || `${h} שעות`}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn--gold btn--block" disabled={sending || !hours.length}>
              {sending ? 'מפרסם…' : '📢 פרסום לכולם'}
            </button>
          </form>

          <section className="section">
            <h2 className="section__title">הודעות פעילות</h2>
            {list.length === 0 ? (
              <p className="field__hint">אין כרגע הודעות פעילות.</p>
            ) : (
              <ul className="tasks">
                {list.map((a) => (
                  <li key={a.id} className="task">
                    <div className="task__label">
                      <span className="task__text">{a.text}</span>
                      <span className="task__meta">
                        <span>{a.by} · {whenOf(a.createdAt)}</span>
                        <span>מוצגת עד {whenOf(a.until)}</span>
                      </span>
                    </div>
                    <button type="button" className="icon-btn icon-btn--danger" aria-label="הסרת ההודעה" onClick={() => remove(a)}>
                      🗑️
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </article>
    </div>
  );
};

export default AdminAnnouncements;
