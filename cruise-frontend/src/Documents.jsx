import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDoc, askPersistence, deleteDoc, listDocs } from './docsStore';
import { useUser } from './session';

// המסמכים שלי: צילומי דרכון, כרטיסי עלייה, ביטוח וכו׳. נשמרים רק במכשיר הזה (docsStore.js)
const KINDS = {
  passport: { label: 'דרכון', icon: '🛂' },
  boarding: { label: 'כרטיס עלייה לספינה', icon: '🚢' },
  flight: { label: 'כרטיס טיסה', icon: '✈️' },
  insurance: { label: 'ביטוח נסיעות', icon: '🩺' },
  other: { label: 'אחר', icon: '📄' },
};
const MAX_SIZE = 15 * 1024 * 1024;
const ACCEPT = 'image/*,application/pdf';

const sizeOf = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`);

// תצוגה מקדימה של מסמך: תמונה מוצגת בדף, PDF נפתח בלשונית חדשה
const DocPreview = ({ doc }) => {
  const url = useMemo(() => URL.createObjectURL(doc.blob), [doc.blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return doc.type.startsWith('image/') ? (
    <a href={url} target="_blank" rel="noreferrer" className="doc__thumb">
      <img src={url} alt={doc.label || doc.name} />
    </a>
  ) : (
    <a href={url} target="_blank" rel="noreferrer" className="btn btn--outline btn--sm">📄 פתיחת ה-PDF</a>
  );
};

const Documents = () => {
  const user = useUser();
  const [docs, setDocs] = useState([]);
  const [status, setStatus] = useState('loading');
  const [kind, setKind] = useState('passport');
  const [label, setLabel] = useState('');
  const [file, setFile] = useState(null);
  const [inputKey, setInputKey] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    listDocs(String(user.id))
      .then((list) => {
        setDocs(list);
        setStatus('ready');
      })
      .catch(() => setStatus('unsupported'));
  }, [user]);

  useEffect(load, [load]);

  const add = async (e) => {
    e.preventDefault();
    setError('');
    if (!file) return;
    if (file.size > MAX_SIZE) {
      setError('הקובץ גדול מדי (עד 15 MB). אפשר לצלם שוב באיכות נמוכה יותר.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(String(user.id), { file, kind, label: label.trim() });
      askPersistence();
      setFile(null);
      setLabel('');
      setInputKey((k) => k + 1);
      load();
    } catch {
      setError('לא הצלחנו לשמור את הקובץ. ייתכן שאין מספיק מקום בטלפון, או שהדפדפן במצב גלישה בסתר.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (doc) => {
    if (!window.confirm(`למחוק את "${doc.label || doc.name}" מהמכשיר?`)) return;
    await deleteDoc(doc.id).catch(() => {});
    load();
  };

  return (
    <div className="page">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">המסמכים שלי 🗂️</h1>
          <p className="card__lead">צילומי דרכון, כרטיסי עלייה, טיסות וביטוח, במקום אחד וזמינים גם בלי אינטרנט.</p>
        </header>

        <div className="card__body">
          <p className="tip">
            🔒 המסמכים נשמרים <strong>רק במכשיר הזה</strong> ולא עולים לשרת, כך שאף אחד אחר לא יכול לראות אותם.
            לכן צריך להוסיף אותם בכל מכשיר בנפרד, ואם מוחקים את נתוני הדפדפן או את האפליקציה, הם נמחקים איתם.
          </p>

          {status === 'unsupported' && (
            <p className="alert alert--error" role="alert">
              הדפדפן הזה לא מאפשר לשמור קבצים (למשל בגלישה בסתר). כדאי לפתוח את האתר בדפדפן הרגיל או מהאפליקציה המותקנת.
            </p>
          )}

          {status === 'ready' && (
            <form className="section docs-form" onSubmit={add}>
              {error && <p className="alert alert--error" role="alert">{error}</p>}
              <div className="field-row">
                <div className="field">
                  <label className="field__label" htmlFor="doc-kind">סוג המסמך</label>
                  <select id="doc-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
                    {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="doc-label">תיאור (לא חובה)</label>
                  <input
                    id="doc-label"
                    className="input"
                    maxLength={60}
                    placeholder="למשל: הדרכון של נועה"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="doc-file">קובץ: תמונה או PDF</label>
                <input
                  key={inputKey}
                  id="doc-file"
                  className="input"
                  type="file"
                  accept={ACCEPT}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <button type="submit" className="btn btn--gold btn--block" disabled={saving || !file}>
                {saving ? 'שומר…' : 'שמירה במכשיר'}
              </button>
            </form>
          )}

          {status === 'ready' && (
            <section className="section">
              <h2 className="section__title">שמורים במכשיר ({docs.length})</h2>
              {docs.length === 0 ? (
                <p className="field__hint">עדיין אין מסמכים. כדאי להוסיף לפחות צילום של הדרכון ושל כרטיס העלייה לספינה.</p>
              ) : (
                <ul className="docs">
                  {docs.map((d) => (
                    <li key={d.id} className="doc">
                      <div className="doc__info">
                        <strong>{KINDS[d.kind]?.icon} {d.label || KINDS[d.kind]?.label || d.name}</strong>
                        <span className="doc__meta" dir="auto">{d.name} · {sizeOf(d.size)}</span>
                      </div>
                      <DocPreview doc={d} />
                      <button type="button" className="icon-btn icon-btn--danger" aria-label={`מחיקת ${d.label || d.name}`} onClick={() => remove(d)}>
                        🗑️
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </article>
    </div>
  );
};

export default Documents;
