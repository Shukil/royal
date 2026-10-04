import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from './AuthShell';
import api, { errorMessage } from './api';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      setDone(res.data.message);
    } catch (err) {
      setError(errorMessage(err, 'האיפוס נכשל. נסה שוב.'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell>
        <div className="card__body">
          <h1 className="auth__title">קישור לא תקין</h1>
          <p className="alert alert--error" role="alert">חסר טוקן איפוס בקישור. בקש קישור חדש.</p>
          <Link to="/forgot-password" className="btn btn--primary btn--block">לבקשת קישור חדש</Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell>
        <div className="card__body">
          <h1 className="auth__title">הסיסמה עודכנה ✅</h1>
          <p className="alert alert--success" role="status">{done}</p>
          <Link to="/login" className="btn btn--primary btn--block">להתחברות</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form className="card__body" onSubmit={handleSubmit}>
        <h1 className="auth__title">בחירת סיסמה חדשה</h1>

        {error && <p className="alert alert--error" role="alert">{error}</p>}

        <div className="field">
          <label className="field__label" htmlFor="reset-password">סיסמה חדשה</label>
          <input
            id="reset-password"
            className="input"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            aria-describedby="reset-password-hint"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="8"
          />
          <span id="reset-password-hint" className="field__hint">לפחות 8 תווים</span>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="reset-confirm">אימות סיסמה</label>
          <input
            id="reset-confirm"
            className="input"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength="8"
          />
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
          {loading ? 'שומר…' : 'שמירת הסיסמה'}
        </button>

        {error && (
          <p className="auth__switch"><Link to="/forgot-password">לבקשת קישור חדש</Link></p>
        )}
      </form>
    </AuthShell>
  );
};

export default ResetPassword;
