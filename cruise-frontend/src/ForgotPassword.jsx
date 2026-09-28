import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from './AuthShell';
import api, { errorMessage } from './api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSent(res.data.message);
    } catch (err) {
      setError(errorMessage(err, 'השליחה נכשלה. נסה שוב.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <form className="card__body" onSubmit={handleSubmit}>
        <h1 className="auth__title">שכחת סיסמה?</h1>

        {sent ? (
          <>
            <p className="alert alert--success" role="status">{sent}</p>
            <p className="auth__text">הקישור תקף לשעה אחת. לא הגיע? בדוק בתיקיית הספאם או נסה שוב.</p>
            <button type="submit" className="btn btn--gold btn--block" disabled={loading}>
              {loading ? 'שולח…' : 'שלח שוב'}
            </button>
          </>
        ) : (
          <>
            <p className="auth__text">הזן את כתובת המייל שאיתה נרשמת, ונשלח אליך קישור לבחירת סיסמה חדשה.</p>
            {error && <p className="alert alert--error" role="alert">{error}</p>}
            <div className="field">
              <label className="field__label" htmlFor="forgot-email">כתובת אימייל</label>
              <input
                id="forgot-email"
                className="input"
                type="email"
                dir="ltr"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
              {loading ? 'שולח…' : 'שלח קישור לאיפוס'}
            </button>
          </>
        )}

        <p className="auth__switch"><Link to="/login">חזרה להתחברות</Link></p>
      </form>
    </AuthShell>
  );
};

export default ForgotPassword;
