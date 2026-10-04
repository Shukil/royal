import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from './api';
import { saveToken, useUser } from './session';

// הפרטים שלי והחלפת סיסמה. את השם לא משנים כאן, כי השם הפרטי קובע את החדר ושם המשפחה את המשפחה
const Profile = () => {
  const user = useUser();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // קישור הרשמה שהקוד כבר בתוכו (Register.jsx ממלא אותו מהכתובת)
  const copyInviteLink = async () => {
    const link = `${window.location.origin}/register?code=${encodeURIComponent(user.inviteCode)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      window.prompt('העתיקו את הקישור:', link);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDone('');
    if (password !== confirm) {
      setError('הסיסמאות החדשות אינן תואמות');
      return;
    }
    setLoading(true);
    try {
      const res = await api.put('/auth/password', { currentPassword: current, newPassword: password });
      // הטוקן הישן כבר לא תקף, אז המכשיר הזה ממשיך עם הטוקן החדש
      saveToken(res.data.token);
      setDone(res.data.message);
      setCurrent('');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(errorMessage(err, 'החלפת הסיסמה נכשלה. נסה שוב.'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="page">
        <div className="empty">
          <p>כדי לראות את הפרופיל צריך להתחבר.</p>
          <Link to="/login" className="btn btn--primary">להתחברות</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">הפרופיל שלי 👤</h1>
          <p className="card__lead">הפרטים שלך באתר, והחלפת סיסמה.</p>
        </header>

        <div className="card__body">
          <section className="section">
            <h2 className="section__title">הפרטים שלי</h2>
            <dl className="facts">
              <div className="fact">
                <dt>שם</dt>
                <dd>{user.name}</dd>
              </div>
              <div className="fact fact--wide">
                <dt>אימייל</dt>
                <dd className="fact__ltr" dir="ltr">{user.email}</dd>
              </div>
              <div className="fact">
                <dt>חדר</dt>
                <dd>{user.cabinNumber || 'לא שויך'}</dd>
              </div>
              <div className="fact">
                <dt>משפחה</dt>
                <dd>{user.familyLabel || 'לא משויך למשפחה'}</dd>
              </div>
              {user.inviteCode && (
                <div className="fact fact--wide">
                  <dt>קוד הרשמה לבני משפחה</dt>
                  <dd className="fact__row">
                    <span className="fact__ltr" dir="ltr">{user.inviteCode}</span>
                    <button type="button" className="btn btn--outline btn--sm" onClick={copyInviteLink}>
                      {copied ? '✓ הקישור הועתק' : '🔗 העתקת קישור הרשמה'}
                    </button>
                  </dd>
                </div>
              )}
            </dl>
            <p className="field__hint">
              החדר נקבע לפי השם הפרטי והמשפחה לפי שם המשפחה. אם משהו כאן לא נכון, כדאי לפנות למארגני הטיול.
            </p>
          </section>

          <section className="section">
            <h2 className="section__title">החלפת סיסמה</h2>
            <form onSubmit={handleSubmit}>
              {error && <p className="alert alert--error" role="alert">{error}</p>}
              {done && <p className="alert alert--success" role="status">{done}</p>}

              <div className="field">
                <label className="field__label" htmlFor="profile-current">הסיסמה הנוכחית</label>
                <input
                  id="profile-current"
                  className="input"
                  type="password"
                  dir="ltr"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="profile-password">סיסמה חדשה</label>
                <input
                  id="profile-password"
                  className="input"
                  type="password"
                  dir="ltr"
                  autoComplete="new-password"
                  aria-describedby="profile-password-hint"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="6"
                />
                <span id="profile-password-hint" className="field__hint">
                  לפחות 6 תווים. אחרי ההחלפה כל שאר המכשירים שלך יתנתקו.
                </span>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="profile-confirm">אימות הסיסמה החדשה</label>
                <input
                  id="profile-confirm"
                  className="input"
                  type="password"
                  dir="ltr"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength="6"
                />
              </div>

              <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
                {loading ? 'שומר…' : 'החלפת הסיסמה'}
              </button>
            </form>
          </section>
        </div>
      </article>
    </div>
  );
};

export default Profile;
