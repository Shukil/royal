import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api, { errorMessage } from './api';
import { cabins as CABIN_TYPES } from './cabins';
import { getToken, saveUser } from './session';

const NO_FAMILY = '';

// שורה של משתמש: חדר, משפחה ומנהל משפחה. כל שינוי נשמר מיד בשרת.
// המפתח של השורה כולל את מספר החדר, כך ששדה החדר מתאפס לערך מהשרת אחרי כל שמירה
// can: מה מותר למנהל המחובר לעשות בשורה הזו (השרת אוכף את אותם כללים):
// edit = שם וחדר, manage = משפחה ומנהל (רק מנהל אתר), remove = מחיקה
const MemberRow = ({ member, families, isMe, can, onSave, onDelete }) => {
  const [cabin, setCabin] = useState(member.cabinNumber);
  const [busy, setBusy] = useState(false);
  // תיקון שם: נפתח בלחיצה על ✏️
  const [naming, setNaming] = useState(null);

  const saveName = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await onSave(member, { firstName: naming.firstName, lastName: naming.lastName });
    setBusy(false);
    if (ok) setNaming(null);
  };

  const save = async (changes) => {
    setBusy(true);
    const ok = await onSave(member, changes);
    setBusy(false);
    if (!ok) setCabin(member.cabinNumber);
  };

  const saveCabin = () => {
    const value = cabin.trim();
    if (value !== member.cabinNumber) save({ cabinNumber: value });
  };

  const adminLocked = member.siteAdmin || !member.family || !can.manage;

  return (
    <li className={`admin-member${busy ? ' is-busy' : ''}`}>
      {naming ? (
        <form className="admin-member__who admin-member__rename" onSubmit={saveName}>
          <label className="visually-hidden" htmlFor={`first-${member.id}`}>שם פרטי</label>
          <input
            id={`first-${member.id}`}
            className="input input--compact"
            maxLength={40}
            value={naming.firstName}
            onChange={(e) => setNaming((n) => ({ ...n, firstName: e.target.value }))}
            autoFocus
            required
          />
          <label className="visually-hidden" htmlFor={`last-${member.id}`}>שם משפחה</label>
          <input
            id={`last-${member.id}`}
            className="input input--compact"
            maxLength={40}
            value={naming.lastName}
            onChange={(e) => setNaming((n) => ({ ...n, lastName: e.target.value }))}
            required
          />
          <span className="admin-member__rename-actions">
            <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>שמירה</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setNaming(null)}>ביטול</button>
          </span>
        </form>
      ) : (
        <div className="admin-member__who">
          <strong>
            {member.firstName} {member.lastName}
            {isMe && <span className="admin-member__me"> (אני)</span>}
            {can.edit && (
              <button
                type="button"
                className="admin-member__icon"
                aria-label={`תיקון השם של ${member.firstName} ${member.lastName}`}
                title="תיקון שם"
                onClick={() => setNaming({ firstName: member.firstName, lastName: member.lastName })}
              >
                ✏️
              </button>
            )}
            {can.remove && !isMe && !member.siteAdmin && (
              <button
                type="button"
                className="admin-member__icon"
                aria-label={`מחיקת ${member.firstName} ${member.lastName}`}
                title="מחיקת המשתמש"
                onClick={() => onDelete(member)}
              >
                🗑️
              </button>
            )}
          </strong>
          <span className="admin-member__email" dir="ltr">{member.email}</span>
        </div>
      )}

      <label className="admin-member__field">
        <span className="admin-member__label">חדר</span>
        <input
          className="input input--compact"
          inputMode="numeric"
          dir="ltr"
          list="admin-cabins"
          placeholder="לא שויך"
          maxLength={6}
          value={cabin}
          disabled={busy || !can.edit}
          onChange={(e) => setCabin(e.target.value.replace(/\D/g, ''))}
          onBlur={saveCabin}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </label>

      <label className="admin-member__field">
        <span className="admin-member__label">משפחה</span>
        <select
          className="input input--compact"
          value={member.family || NO_FAMILY}
          disabled={busy || !can.manage}
          onChange={(e) => save({ family: e.target.value || null })}
        >
          {families.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          <option value={NO_FAMILY}>ללא משפחה</option>
        </select>
      </label>

      <label className={`admin-member__admin${adminLocked ? ' is-locked' : ''}`}>
        <input
          type="checkbox"
          checked={member.isAdmin}
          disabled={busy || adminLocked}
          onChange={(e) => save({ isAdmin: e.target.checked })}
        />
        <span>{member.siteAdmin ? 'מנהל אתר' : 'מנהל משפחה'}</span>
      </label>
    </li>
  );
};

// כותרת של משפחה: שם, עריכת השם ומחיקה (רק משפחה ריקה)
const FamilyHeader = ({ family, count, admins, canManage, onRename, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(family.label);

  const submit = async (e) => {
    e.preventDefault();
    if (await onRename(family, label)) setEditing(false);
  };

  if (editing) {
    return (
      <form className="admin-family__head" onSubmit={submit}>
        <label className="visually-hidden" htmlFor={`fam-${family.key}`}>שם המשפחה</label>
        <input
          id={`fam-${family.key}`}
          className="input input--compact"
          maxLength={60}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          autoFocus
          required
        />
        <button type="submit" className="btn btn--primary btn--sm">שמירה</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setLabel(family.label); setEditing(false); }}>
          ביטול
        </button>
      </form>
    );
  }

  return (
    <div className="admin-family__head">
      <h2 className="admin-family__title">{family.label}</h2>
      <span className="plan-badge plan-badge--ok">{count === 1 ? 'משתתף אחד' : `${count} משתתפים`}</span>
      {admins > 0 && <span className="plan-badge">{admins === 1 ? 'מנהל אחד' : `${admins} מנהלים`}</span>}
      {canManage && (
        <span className="admin-family__actions">
          <button type="button" className="link-button" onClick={() => setEditing(true)}>✏️ שינוי שם</button>
          {count === 0 && (
            <button type="button" className="link-button admin-family__delete" onClick={() => onDelete(family)}>מחיקה</button>
          )}
        </span>
      )}
    </div>
  );
};

// דף ניהול המשפחות: מי בכל משפחה, מי באיזה חדר, ומי מנהל משפחה. רק למנהלים (השרת בודק)
const AdminFamilies = () => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(getToken() ? 'loading' : 'denied');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newFamily, setNewFamily] = useState('');

  useEffect(() => {
    if (!getToken()) return undefined;
    let alive = true;
    api.get('/admin/families')
      .then((res) => {
        if (!alive) return;
        setData(res.data);
        setStatus('ready');
      })
      .catch((err) => alive && setStatus(err.response ? 'denied' : 'error'));
    return () => {
      alive = false;
    };
  }, []);

  // שינוי אצלי (חדר, משפחה) מתעדכן מיד גם בשאר האתר
  const refreshMe = () => api.get('/auth/me').then((res) => saveUser(res.data.user)).catch(() => {});

  const say = (message) => {
    setError('');
    setNotice(message);
  };
  const fail = (err, fallback) => {
    setNotice('');
    setError(errorMessage(err, fallback));
  };

  const saveMember = async (member, changes) => {
    try {
      const res = await api.patch(`/admin/users/${member.id}`, changes);
      setData((d) => ({ ...d, users: d.users.map((u) => (u.id === member.id ? res.data.user : u)) }));
      say(`נשמר: ${member.firstName} ${member.lastName}`);
      if (member.id === data.me) refreshMe();
      return true;
    } catch (err) {
      fail(err, 'השמירה נכשלה. נסה שוב.');
      return false;
    }
  };

  const deleteMember = async (member) => {
    const name = `${member.firstName} ${member.lastName}`;
    if (!window.confirm(`למחוק את ${name}? נמחקים גם האירועים שיצר/ה והמשימות האישיות. אי אפשר לבטל.`)) return;
    try {
      await api.delete(`/admin/users/${member.id}`);
      setData((d) => ({ ...d, users: d.users.filter((u) => u.id !== member.id) }));
      say(`${name} נמחק/ה`);
    } catch (err) {
      fail(err, 'המחיקה נכשלה.');
    }
  };

  // פעולות על משפחות מחזירות את כל הנתונים מחדש
  const familyAction = async (request, message, fallback) => {
    try {
      const res = await request();
      setData((d) => ({ ...d, ...res.data }));
      say(message);
      refreshMe();
      return true;
    } catch (err) {
      fail(err, fallback);
      return false;
    }
  };

  const addFamily = async (e) => {
    e.preventDefault();
    const label = newFamily.trim();
    if (await familyAction(() => api.post('/admin/families', { label }), `נוספה ${label}`, 'הוספת המשפחה נכשלה.')) {
      setNewFamily('');
    }
  };
  const renameFamily = (family, label) =>
    familyAction(() => api.put(`/admin/families/${family.key}`, { label }), 'שם המשפחה עודכן', 'שינוי השם נכשל.');
  const deleteFamily = (family) =>
    window.confirm(`למחוק את ${family.label}?`) &&
    familyAction(() => api.delete(`/admin/families/${family.key}`), `${family.label} נמחקה`, 'המחיקה נכשלה.');

  if (status === 'denied') return <Navigate to="/" replace />;

  const users = data?.users || [];
  const families = data?.families || [];
  // מנהל אתר מנהל הכול; מנהל משפחה משנה ומוחק רק את בני המשפחה שלו (ולא מנהלים אחרים)
  const permissionsFor = (m) => {
    if (data.siteAdmin) return { edit: true, manage: true, remove: true };
    const mine = Boolean(data.myFamily) && m.family === data.myFamily;
    return { edit: mine, manage: false, remove: mine && !m.isAdmin };
  };
  const myFamilyLabel = families.find((f) => f.key === data?.myFamily)?.label;

  const groups = [
    ...families.map((f) => ({ family: f, members: users.filter((u) => u.family === f.key) })),
    { family: null, members: users.filter((u) => !u.family || !families.some((f) => f.key === u.family)) },
  ];
  const cabinList = Object.entries(
    users.reduce((acc, u) => {
      if (u.cabinNumber) (acc[u.cabinNumber] ||= []).push(u);
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));
  const noCabin = users.filter((u) => !u.cabinNumber);

  return (
    <div className="page page--wide">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">ניהול משפחות 👨‍👩‍👧</h1>
          <p className="card__lead">
            מי בכל משפחה, מי באיזה חדר, ומי מנהל משפחה. מנהלי משפחה רואים את כל דפי המנהלים. כל שינוי נשמר מיד.
          </p>
        </header>

        <div className="card__body">
          {status === 'loading' && <p className="empty" role="status">טוען…</p>}
          {status === 'error' && <p className="alert alert--error" role="alert">לא הצלחנו לטעון את הנתונים. צריך חיבור לאינטרנט.</p>}

          <div className="admin-status" aria-live="polite">
            {error && <p className="alert alert--error" role="alert">{error}</p>}
            {notice && <p className="alert alert--success">{notice}</p>}
          </div>

          {data && (
            <>
              <p className="admin-summary">
                {users.length} משתתפים · {families.length} משפחות · {cabinList.length} חדרים
              </p>

              {!data.siteAdmin && (
                <p className="tip">
                  כמנהל משפחה אפשר לתקן שם וחדר ולמחוק בני משפחה{myFamilyLabel ? ` ב${myFamilyLabel}` : ''}. הוספת משפחות,
                  העברה בין משפחות ומינוי מנהלים נעשים על ידי מנהלי האתר.
                </p>
              )}

              <datalist id="admin-cabins">
                {Object.keys(CABIN_TYPES).map((n) => <option key={n} value={n} />)}
              </datalist>

              {groups.map(({ family, members }) =>
                !family && members.length === 0 ? null : (
                  <section key={family?.key || 'none'} className="admin-family">
                    {family ? (
                      <FamilyHeader
                        family={family}
                        count={members.length}
                        admins={members.filter((m) => m.isAdmin).length}
                        canManage={data.siteAdmin}
                        onRename={renameFamily}
                        onDelete={deleteFamily}
                      />
                    ) : (
                      <div className="admin-family__head">
                        <h2 className="admin-family__title">ללא משפחה</h2>
                        <span className="plan-badge">{members.length === 1 ? 'משתתף אחד' : `${members.length} משתתפים`}</span>
                      </div>
                    )}

                    {members.length === 0 ? (
                      <p className="field__hint">אין עדיין משתתפים במשפחה הזו. אפשר להעביר אליה משתתפים מהרשימות האחרות.</p>
                    ) : (
                      <ul className="admin-members">
                        {members.map((m) => (
                          <MemberRow
                            key={`${m.id}-${m.cabinNumber}`}
                            member={m}
                            families={families}
                            isMe={m.id === data.me}
                            can={permissionsFor(m)}
                            onSave={saveMember}
                            onDelete={deleteMember}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                ),
              )}

              {data.siteAdmin && (
                <form className="admin-add" onSubmit={addFamily}>
                  <div className="field">
                    <label className="field__label" htmlFor="new-family">משפחה חדשה</label>
                    <input
                      id="new-family"
                      className="input"
                      maxLength={60}
                      placeholder="למשל: משפחת לוי"
                      value={newFamily}
                      onChange={(e) => setNewFamily(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn--gold">הוספת משפחה</button>
                </form>
              )}

              <section className="section">
                <h2 className="section__title">החדרים</h2>
                <div className="table-wrap">
                  <table className="metro">
                    <thead>
                      <tr>
                        <th scope="col">חדר</th>
                        <th scope="col">מי בחדר</th>
                        <th scope="col">סוג</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cabinList.map(([number, guests]) => {
                        const type = CABIN_TYPES[number];
                        const over = type && guests.length > type.maxGuests;
                        return (
                          <tr key={number}>
                            <td dir="ltr">{number}</td>
                            <td>
                              {guests.map((g) => g.firstName).join(', ')}
                              {over && <span className="plan-badge plan-badge--danger">יותר מ-{type.maxGuests} אורחים</span>}
                            </td>
                            <td>{type ? type.type : 'לא ידוע'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {noCabin.length > 0 && (
                  <p className="field__hint">עדיין בלי חדר: {noCabin.map((u) => `${u.firstName} ${u.lastName}`).join(', ')}</p>
                )}
              </section>
            </>
          )}
        </div>
      </article>
    </div>
  );
};

export default AdminFamilies;
