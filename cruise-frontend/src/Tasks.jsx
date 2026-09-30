import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getToken } from './session';
import { daysBetween, dueText, localDate, shortDate, useTasks } from './tasksApi';

export const TaskRow = ({ task, people, today, onToggle, actions }) => {
  const assignee = people.find((p) => p.id === task.assignee);
  const late = !task.done && task.due < today;
  return (
    <li className={`task-row${task.done ? ' task-row--done' : ''}${late ? ' task-row--late' : ''}`}>
      <label className="task-row__check">
        <input type="checkbox" checked={task.done} onChange={() => onToggle(task)} />
        <span className="visually-hidden">{task.done ? 'ביטול הסימון' : 'סימון כבוצעה'}</span>
      </label>
      <div className="task-row__body">
        <p className="task-row__title">{task.title}</p>
        <p className="task-row__meta">
          <span>📅 {shortDate(task.due)} · {dueText(task.due, today)}</span>
          <span>👤 {assignee ? assignee.name : 'כולם'}</span>
          {task.done && task.doneBy && <span>✓ {task.doneBy}</span>}
        </p>
        {task.note && <p className="task-row__note">{task.note}</p>}
        {actions}
      </div>
    </li>
  );
};

const TaskForm = ({ initial, people, onSave, onCancel }) => {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form
      className="plan-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSave(form);
        setBusy(false);
      }}
    >
      <label className="field plan-form__title">
        <span className="field__label">המשימה</span>
        <input className="input" value={form.title} onChange={set('title')} maxLength={150} required placeholder="למשל: להזמין כרטיסים לוותיקן" />
      </label>
      <label className="field">
        <span className="field__label">עד תאריך</span>
        <input className="input" type="date" value={form.due} onChange={set('due')} required />
      </label>
      <label className="field">
        <span className="field__label">באחריות</span>
        <select className="input" value={form.assignee || ''} onChange={set('assignee')}>
          <option value="">כולם</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="field plan-form__wide">
        <span className="field__label">הערה (לא חובה)</span>
        <input className="input" value={form.note} onChange={set('note')} maxLength={500} />
      </label>
      <div className="plan-form__actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>שמירה</button>
        <button type="button" className="btn btn--outline btn--sm" onClick={onCancel}>ביטול</button>
      </div>
    </form>
  );
};

const GROUPS = [
  { key: 'late', title: '⏰ באיחור', test: (t, today) => t.due < today },
  { key: 'today', title: '📌 היום', test: (t, today) => t.due === today },
  { key: 'week', title: '🗓️ בשבוע הקרוב', test: (t, today) => daysBetween(today, t.due) <= 7 },
  { key: 'later', title: '🔜 בהמשך', test: () => true },
];

const Tasks = () => {
  const { data, error, toggle, create, update, remove } = useTasks();
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [onlyMine, setOnlyMine] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [today] = useState(localDate);

  if (!getToken()) {
    return (
      <div className="page">
        <article className="card">
          <div className="card__body"><p className="empty"><Link to="/login">התחבר</Link> כדי לראות את המשימות.</p></div>
        </article>
      </div>
    );
  }

  const tasks = (data?.tasks || []).filter((t) => !onlyMine || t.assignee === data.me || t.assignee === null);
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  // כל משימה פתוחה נכנסת לקבוצה הראשונה שמתאימה לה
  const grouped = GROUPS.map((g) => ({ ...g, tasks: [] }));
  for (const t of open) grouped.find((g) => g.test(t, today)).tasks.push(t);

  const row = (task) =>
    editing === task.id ? (
      <li key={task.id} className="task-row task-row--editing">
        <TaskForm
          initial={{ title: task.title, due: task.due, assignee: task.assignee, note: task.note }}
          people={data.people}
          onCancel={() => setEditing(null)}
          onSave={async (form) => (await update(task, form)) && setEditing(null)}
        />
      </li>
    ) : (
      <TaskRow
        key={task.id}
        task={task}
        people={data.people}
        today={today}
        onToggle={toggle}
        actions={
          <p className="task-row__actions">
            <button type="button" className="link-btn" onClick={() => setEditing(task.id)}>עריכה</button>
            {task.createdBy === data.me && (
              <>
                {' · '}
                <button type="button" className="link-btn" onClick={() => window.confirm(`למחוק את "${task.title}"?`) && remove(task)}>מחיקה</button>
              </>
            )}
            <span className="plan-item__by"> · הוסיף/ה: {task.createdByName}</span>
          </p>
        }
      />
    );

  return (
    <div className="page">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">משימות ✅</h1>
          <p className="card__lead">מה צריך לסגור לפני הטיול ובמהלכו, עד מתי ובאחריות מי. יום לפני תאריך היעד נשלחת תזכורת למי שהפעיל התראות.</p>
        </header>

        <div className="card__body tasks">
          {error && <p className="alert alert--error" role="alert">{error}</p>}
          {!data && !error && <p className="empty">טוען…</p>}

          {data && (
            <>
              <div className="tasks__toolbar">
                {editing !== 'new' && (
                  <button type="button" className="btn btn--gold btn--sm" onClick={() => setEditing('new')}>＋ משימה חדשה</button>
                )}
                <label className="check-row">
                  <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
                  <span>רק שלי ושל כולם</span>
                </label>
              </div>

              {editing === 'new' && (
                <TaskForm
                  initial={{ title: '', due: today, assignee: '', note: '' }}
                  people={data.people}
                  onCancel={() => setEditing(null)}
                  onSave={async (form) => (await create(form)) && setEditing(null)}
                />
              )}

              {open.length === 0 && <p className="empty">אין משימות פתוחות 🎉</p>}

              {grouped.filter((g) => g.tasks.length).map((g) => (
                <section key={g.key} className="tasks__group" aria-label={g.title}>
                  <h2 className="tasks__title">{g.title} <span className="aboard__count">{g.tasks.length}</span></h2>
                  <ul className="task-list">{g.tasks.map(row)}</ul>
                </section>
              ))}

              {done.length > 0 && (
                <section className="tasks__group">
                  <button type="button" className="link-btn" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
                    {showDone ? 'הסתרת' : 'הצגת'} המשימות שבוצעו ({done.length})
                  </button>
                  {showDone && <ul className="task-list">{done.map(row)}</ul>}
                </section>
              )}
            </>
          )}
        </div>
      </article>
    </div>
  );
};

export default Tasks;
