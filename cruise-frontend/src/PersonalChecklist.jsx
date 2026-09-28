import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from './api';
import { getToken } from './session';

const API = '/personal-checklist';

const newId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const PersonalChecklist = () => {
  const token = getToken();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState(token ? 'loading' : 'guest');
  const [error, setError] = useState('');
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const saveSeq = useRef(0);

  const handleAuthError = (err) => {
    if (err.response?.status === 401) {
      setStatus('guest');
      return true;
    }
    return false;
  };

  const load = useCallback(() => {
    if (!token) return;
    api.get(API)
      .then((res) => {
        setItems(res.data.items);
        setStatus('ready');
      })
      .catch((err) => {
        if (err.response?.status === 401) setStatus('guest');
        else {
          setError('לא הצלחנו לטעון את הרשימה. נסה לרענן.');
          setStatus('ready');
        }
      });
  }, [token]);

  useEffect(load, [load]);

  // עדכון מיידי במסך ושמירה ברקע. אם השמירה נכשלת, טוענים מחדש מהשרת
  const save = async (next) => {
    setItems(next);
    setError('');
    const seq = ++saveSeq.current;
    try {
      await api.put(API, { items: next.map(({ text, done }) => ({ text, done })) });
    } catch (err) {
      if (handleAuthError(err) || seq !== saveSeq.current) return;
      setError(errorMessage(err, 'השמירה נכשלה. נסה שוב.'));
      load();
    }
  };

  const toggle = (id) => save(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));

  const addItem = (e) => {
    e.preventDefault();
    const text = newText.trim();
    if (!text) return;
    save([...items, { id: newId(), text, done: false }]);
    setNewText('');
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const commitEdit = (e) => {
    e.preventDefault();
    const text = editText.trim();
    if (!text) return;
    save(items.map((i) => (i.id === editingId ? { ...i, text } : i)));
    cancelEdit();
  };

  const removeItem = (item) => {
    if (!window.confirm(`למחוק את "${item.text}"?`)) return;
    save(items.filter((i) => i.id !== item.id));
  };

  const resetList = async () => {
    if (!window.confirm('לחזור לרשימה המקורית? כל השינויים והסימונים שלך יימחקו.')) return;
    try {
      const res = await api.delete(API);
      setItems(res.data.items);
      cancelEdit();
    } catch (err) {
      if (!handleAuthError(err)) setError('האיפוס נכשל. נסה שוב.');
    }
  };

  if (status === 'guest') {
    return (
      <div className="page">
        <div className="empty">
          <p>כדי לראות ולערוך את הצ'ק ליסט האישי שלך צריך להתחבר.</p>
          <Link to="/login" className="btn btn--primary">להתחברות</Link>
        </div>
      </div>
    );
  }

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="page">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">צ'ק ליסט אישי 🎒</h1>
          <p className="card__lead">הרשימה שלך בלבד. אפשר להוסיף, לערוך ולמחוק פריטים, והיא נשמרת בחשבון שלך.</p>
        </header>

        <div className="card__body">
          {error && <p className="alert alert--error" role="alert">{error}</p>}

          <form onSubmit={addItem} className="task-form task-form--single">
            <div className="field">
              <label className="field__label" htmlFor="personal-new">פריט חדש</label>
              <input
                id="personal-new"
                className="input"
                type="text"
                placeholder="מה עוד צריך לארוז?"
                maxLength={200}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn--gold">הוסף</button>
          </form>

          {status === 'loading' ? (
            <p className="empty" role="status">טוען…</p>
          ) : items.length === 0 ? (
            <p className="empty">הרשימה ריקה. הוסף פריט ראשון למעלה.</p>
          ) : (
            <>
              <div className="progress">
                <div className="progress__text">
                  <span id="personal-progress-label">מוכנות לאריזה</span>
                  <span>{doneCount} מתוך {items.length}</span>
                </div>
                <div
                  className="progress__bar"
                  role="progressbar"
                  aria-labelledby="personal-progress-label"
                  aria-valuemin={0}
                  aria-valuemax={items.length}
                  aria-valuenow={doneCount}
                >
                  <div className="progress__fill" style={{ width: `${(doneCount / items.length) * 100}%` }} />
                </div>
              </div>

              <ul className="tasks">
                {items.map((item) =>
                  editingId === item.id ? (
                    <li key={item.id} className="task">
                      <form className="task__edit" onSubmit={commitEdit}>
                        <label className="visually-hidden" htmlFor={`edit-${item.id}`}>עריכת פריט</label>
                        <input
                          id={`edit-${item.id}`}
                          className="input"
                          type="text"
                          maxLength={200}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                          autoFocus
                          required
                        />
                        <button type="submit" className="btn btn--primary">שמור</button>
                        <button type="button" className="btn btn--ghost" onClick={cancelEdit}>ביטול</button>
                      </form>
                    </li>
                  ) : (
                    <li key={item.id} className={`task${item.done ? ' is-done' : ''}`}>
                      <input
                        id={`personal-${item.id}`}
                        className="task__check"
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggle(item.id)}
                      />
                      <label htmlFor={`personal-${item.id}`} className="task__label">
                        <span className="task__text">{item.text}</span>
                      </label>
                      <div className="task__actions">
                        <button type="button" className="icon-btn" onClick={() => startEdit(item)} aria-label={`עריכת ${item.text}`}>
                          ✏️
                        </button>
                        <button type="button" className="icon-btn icon-btn--danger" onClick={() => removeItem(item)} aria-label={`מחיקת ${item.text}`}>
                          🗑️
                        </button>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </>
          )}

          {status === 'ready' && (
            <button type="button" className="link-button checklist-reset" onClick={resetList}>
              חזרה לרשימה המקורית
            </button>
          )}
        </div>
      </article>
    </div>
  );
};

export default PersonalChecklist;
