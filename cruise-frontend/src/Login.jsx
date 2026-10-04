import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import AuthShell from './AuthShell';
import api, { errorMessage } from './api';
import { saveSession } from './session';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // בלי הסימון: ניתוק אחרי 15 דקות בלי פעילות. עם הסימון: 30 יום
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();
  // הדף שניסו להיכנס אליו לפני ההתחברות (App.jsx)
  const from = useLocation().state?.from || '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // איפוס שגיאות קודמות
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password, remember });

      // שמירת הטוקן ופרטי המשתמש בדפדפן
      saveSession(response.data.token, response.data.user);

      // חזרה לדף שביקשו, או לדף הבית
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'שגיאה בהתחברות. אנא בדוק את הפרטים.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <form className="card__body" onSubmit={handleLogin}>
        <h1 className="auth__title">התחברות לנוסעים</h1>

        {error && <p className="alert alert--error" role="alert">{error}</p>}

        <div className="field">
          <label className="field__label" htmlFor="login-email">כתובת אימייל</label>
          <input
            id="login-email"
            className="input"
            type="email"
            dir="ltr"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <div className="field__top">
            <label className="field__label" htmlFor="login-password">סיסמה</label>
            <Link to="/forgot-password" className="field__link">שכחתי סיסמה</Link>
          </div>
          <input
            id="login-password"
            className="input"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="check-row">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} aria-describedby="login-remember-hint" />
            <span>השאר אותי מחובר</span>
          </label>
          <span id="login-remember-hint" className="field__hint">
            בלי הסימון מתנתקים אחרי 15 דקות בלי שימוש. בטלפון האישי, ובמיוחד על הספינה בלי אינטרנט, כדאי לסמן.
          </span>
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
          {loading ? 'מתחבר…' : 'כניסה'}
        </button>

        <p className="auth__switch">
          עדיין אין לך חשבון? <Link to="/register">להרשמה</Link>
        </p>
      </form>
    </AuthShell>
  );
};

export default Login;
