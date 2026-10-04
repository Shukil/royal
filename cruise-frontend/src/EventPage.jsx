import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from './api';
import { EVENT_TYPES, RSVP_LABELS, formatDay, formatWhen, formFromEvent, mapsUrl } from './eventTypes';
import { getToken } from './session';
import { downloadIcs, googleCalendarUrl } from './calendar';
import EventForm from './EventForm';

// אייקונים קטנים לכפתורי היומן
const GoogleIcon = () => (
  <svg className="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="4" width="18" height="17" rx="2.5" fill="#fff" stroke="#4285f4" strokeWidth="1.6" />
    <rect x="3" y="4" width="18" height="4.5" rx="2" fill="#4285f4" />
    <text x="12" y="18.3" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#4285f4" fontFamily="Arial, sans-serif">31</text>
  </svg>
);
const AppleIcon = () => (
  <svg className="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7 0 0-2.5-1-2.5-3.7zM14.1 5.8c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3z"
    />
  </svg>
);

const timeAgo = (iso) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// טופס תגובה, משמש גם לתגובה ראשית וגם לתגובה לתגובה
const CommentForm = ({ onSubmit, placeholder, autoFocus, onCancel, submitLabel = 'שליחה' }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const ok = await onSubmit(text.trim());
    setSending(false);
    if (ok) setText('');
  };

  return (
    <form className="comment-form" onSubmit={submit}>
      <label className="visually-hidden" htmlFor={placeholder}>{placeholder}</label>
      <textarea
        id={placeholder}
        className="input textarea"
        rows={2}
        maxLength={3000}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus={autoFocus}
        required
      />
      <div className="comment-form__actions">
        <button type="submit" className="btn btn--primary" disabled={sending}>{sending ? 'שולח…' : submitLabel}</button>
        {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>ביטול</button>}
      </div>
    </form>
  );
};

// תגובה אחת והתגובות אליה (רקורסיבי, בכל עומק)
const CommentNode = ({ comment, childrenOf, onReply, replyingTo, setReplyingTo, depth }) => {
  const replies = childrenOf[comment.id] || [];
  return (
    <li className="comment">
      <div className="comment__bubble">
        <div className="comment__head">
          <strong>{comment.author.name}</strong>
          <span className="comment__time">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="comment__text">{comment.text}</p>
        <button type="button" className="comment__reply" onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>
          ↩ הגב
        </button>
      </div>

      {replyingTo === comment.id && (
        <CommentForm
          placeholder={`תגובה ל${comment.author.name}`}
          submitLabel="שליחת תגובה"
          autoFocus
          onCancel={() => setReplyingTo(null)}
          onSubmit={(text) => onReply(text, comment.id)}
        />
      )}

      {replies.length > 0 && (
        <ul className={depth < 4 ? 'comments comments--nested' : 'comments comments--flat'}>
          {replies.map((r) => (
            <CommentNode
              key={r.id}
              comment={r}
              childrenOf={childrenOf}
              onReply={onReply}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const EventPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState(getToken() ? 'loading' : 'guest');
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  // עריכה: רשימת המוזמנים האפשריים נטענת רק כשפותחים את הטופס
  const [editing, setEditing] = useState(false);
  const [people, setPeople] = useState(null);

  const load = useCallback(() => {
    if (!getToken()) return;
    api.get(`/events/${id}`)
      .then((res) => {
        setEvent(res.data);
        setStatus('ready');
      })
      .catch((err) => {
        if (err.response?.status === 401) setStatus('guest');
        else setStatus(err.response?.status === 404 ? 'missing' : 'error');
      });
  }, [id]);

  useEffect(load, [load]);

  // לחיצה על מצב אחר בוחרת אותו; לחיצה נוספת על המצב שכבר נבחר מבטלת את אישור ההגעה
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const setRsvp = async (value) => {
    if (rsvpBusy) return;
    setError('');
    setRsvpBusy(true);
    try {
      if (event.myRsvp === value) await api.delete(`/events/${id}/rsvp`);
      else await api.put(`/events/${id}/rsvp`, { status: value });
      load();
    } catch (err) {
      setError(errorMessage(err, 'עדכון אישור ההגעה נכשל.'));
    } finally {
      setRsvpBusy(false);
    }
  };

  const addComment = async (text, parentId = null) => {
    setError('');
    try {
      const res = await api.post(`/events/${id}/comments`, { text, parentId });
      setEvent((ev) => ({ ...ev, comments: [...ev.comments, res.data] }));
      setReplyingTo(null);
      return true;
    } catch (err) {
      setError(errorMessage(err, 'שליחת התגובה נכשלה.'));
      return false;
    }
  };

  const startEdit = async () => {
    setError('');
    try {
      if (!people) setPeople((await api.get('/events/people')).data);
      setEditing(true);
    } catch (err) {
      setError(errorMessage(err, 'לא הצלחנו לפתוח את העריכה. נסה שוב.'));
    }
  };

  const remove = async () => {
    if (!window.confirm(`למחוק את "${event.title}"? האירוע והתגובות יימחקו לכל המוזמנים.`)) return;
    try {
      await api.delete(`/events/${id}`);
      navigate('/schedule');
    } catch (err) {
      setError(errorMessage(err, 'המחיקה נכשלה.'));
    }
  };

  if (status === 'guest') {
    return (
      <div className="page">
        <div className="empty">
          <p>כדי לראות את האירוע צריך להתחבר.</p>
          <Link to="/login" className="btn btn--primary">להתחברות</Link>
        </div>
      </div>
    );
  }
  if (status === 'loading') return <div className="page"><p className="empty" role="status">טוען…</p></div>;
  if (status !== 'ready') {
    return (
      <div className="page">
        <div className="empty">
          <p>{status === 'missing' ? 'האירוע לא נמצא, או שאינך מוזמן אליו.' : 'לא הצלחנו לטעון את האירוע.'}</p>
          <Link to="/schedule" className="btn btn--primary">חזרה ללו״ז</Link>
        </div>
      </div>
    );
  }

  const childrenOf = event.comments.reduce((acc, c) => {
    (acc[c.parent || 'root'] ||= []).push(c);
    return acc;
  }, {});
  const typeLabel = event.type === 'family' ? event.familyLabel : EVENT_TYPES[event.type].label;

  return (
    <div className="page">
      <Link to="/schedule" className="back-link">→ חזרה ללו״ז</Link>

      <article className={`card event-page event--${event.type}`}>
        <header className="card__header event-page__header">
          <span className="event-badge event-badge--on-dark">{typeLabel}</span>
          <h1 className="card__title">{event.title}</h1>
          <p className="card__lead">
            📅 {formatDay(event.date)}.{event.date.slice(0, 4)} · 🕒{' '}
            <span dir={event.allDay ? undefined : 'ltr'}>{formatWhen(event)}</span>
          </p>
          {event.location && (
            <p className="card__lead">
              📍 {event.location} ·{' '}
              <a className="event-page__map" href={mapsUrl(event.location)} target="_blank" rel="noreferrer">
                פתיחה במפה
              </a>
            </p>
          )}
          <p className="card__lead">
            {event.isSystem ? '🔒 אירוע קבוע של הטיול' : `נוצר ע״י ${event.isMine ? 'אותך' : event.createdBy.name}`}
          </p>
        </header>

        <div className="card__body">
          {error && <p className="alert alert--error" role="alert">{error}</p>}

          {editing && (
            <section className="section" aria-labelledby="edit-title">
              <div className="event-page__edit-head">
                <h2 id="edit-title" className="section__title">עריכת האירוע</h2>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(false)}>ביטול</button>
              </div>
              <p className="field__hint">המוזמנים יקבלו התראה על השינוי. אישורי ההגעה והתגובות נשמרים.</p>
              <EventForm
                people={people}
                initial={formFromEvent(event)}
                eventId={id}
                onSaved={() => {
                  setEditing(false);
                  load();
                }}
              />
            </section>
          )}

          <div className="add-to-cal" role="group" aria-label="הוספה ליומן">
            <span className="add-to-cal__label">הוספה ליומן:</span>
            <a
              className="btn btn--outline btn--sm"
              href={googleCalendarUrl(event, window.location.href)}
              target="_blank"
              rel="noreferrer"
            >
              <GoogleIcon /> Google Calendar
            </a>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => downloadIcs(event, window.location.href)}>
              <AppleIcon /> Apple / Outlook
            </button>
          </div>

          <section className="section">
            <h2 className="section__title">תיאור האירוע</h2>
            {event.description ? (
              <p className="prose event-page__desc">{event.description}</p>
            ) : (
              <p className="field__hint">לא נוסף תיאור לאירוע.</p>
            )}
          </section>

          <section className="section">
            <h2 className="section__title">אישור הגעה</h2>
            <div className="rsvp" role="group" aria-label="האם תגיע?">
              {Object.entries(RSVP_LABELS).map(([key, r]) => (
                <button
                  key={key}
                  type="button"
                  className={`rsvp__btn rsvp__btn--${key}${event.myRsvp === key ? ' is-on' : ''}`}
                  aria-pressed={event.myRsvp === key}
                  title={event.myRsvp === key ? 'לחיצה נוספת מבטלת את אישור ההגעה' : undefined}
                  disabled={rsvpBusy}
                  onClick={() => setRsvp(key)}
                >
                  {r.icon} {r.label}
                </button>
              ))}
            </div>

            <p className="rsvp__summary">
              {RSVP_LABELS.yes.icon} {event.counts.yes} מגיעים · {RSVP_LABELS.maybe.icon} {event.counts.maybe} אולי · {RSVP_LABELS.no.icon} {event.counts.no} לא מגיעים
            </p>

            <ul className="guests">
              {event.guests.map((g) => (
                <li key={g.id} className={`guest guest--${g.rsvp || 'none'}`}>
                  <span>{g.name}</span>
                  <span className="guest__status">{g.rsvp ? `${RSVP_LABELS[g.rsvp].icon} ${RSVP_LABELS[g.rsvp].label}` : 'טרם השיב/ה'}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section__title">תגובות ({event.comments.length})</h2>
            <CommentForm placeholder="כתוב תגובה לכל המוזמנים…" onSubmit={(text) => addComment(text)} />
            {(childrenOf.root || []).length === 0 ? (
              <p className="field__hint">אין עדיין תגובות.</p>
            ) : (
              <ul className="comments">
                {childrenOf.root.map((c) => (
                  <CommentNode
                    key={c.id}
                    comment={c}
                    childrenOf={childrenOf}
                    onReply={addComment}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    depth={1}
                  />
                ))}
              </ul>
            )}
          </section>

          {event.isMine && !editing && (
            <div className="event-page__owner">
              <button type="button" className="btn btn--outline btn--sm" onClick={startEdit}>
                ✏️ עריכת האירוע
              </button>
              <button type="button" className="link-button event-page__delete" onClick={remove}>
                מחיקת האירוע
              </button>
            </div>
          )}
        </div>
      </article>
    </div>
  );
};

export default EventPage;
