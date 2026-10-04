import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AuthShell from './AuthShell';
import api, { errorMessage } from './api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Register = () => {
  // אפשר לשלוח למשפחה קישור עם הקוד כבר בפנים: /register?code=...
  const [params] = useSearchParams();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', inviteCode: params.get('code') || '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!EMAIL_RE.test(form.email.trim())) {
      setError('כתובת המייל אינה תקינה');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', form);
      setSuccess('ההרשמה בוצעה בהצלחה! מעביר להתחברות...');

      // המתנה קלה כדי שהמשתמש יראה את הודעת ההצלחה לפני המעבר
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(errorMessage(err, 'שגיאה בהרשמה. אנא נסה שוב.'));
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <form className="card__body" onSubmit={handleRegister}>
        <h1 className="auth__title">הרשמת נוסע חדש</h1>

        {error && <p className="alert alert--error" role="alert">{error}</p>}
        {success && <p className="alert alert--success" role="status">{success}</p>}

        <div className="field-row">
          <div className="field">
            <label className="field__label" htmlFor="reg-first">שם פרטי</label>
            <input
              id="reg-first"
              className="input"
              type="text"
              autoComplete="given-name"
              value={form.firstName}
              onChange={update('firstName')}
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="reg-last">שם משפחה</label>
            <input
              id="reg-last"
              className="input"
              type="text"
              autoComplete="family-name"
              value={form.lastName}
              onChange={update('lastName')}
              required
            />
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="reg-email">כתובת אימייל</label>
          <input
            id="reg-email"
            className="input"
            type="email"
            dir="ltr"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            required
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="reg-password">סיסמה</label>
          <input
            id="reg-password"
            className="input"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            aria-describedby="reg-password-hint"
            value={form.password}
            onChange={update('password')}
            required
            minLength="6"
          />
          <span id="reg-password-hint" className="field__hint">לפחות 6 תווים</span>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="reg-code">קוד הזמנה</label>
          <input
            id="reg-code"
            className="input"
            type="text"
            dir="ltr"
            autoComplete="off"
            aria-describedby="reg-code-hint"
            value={form.inviteCode}
            onChange={update('inviteCode')}
            required
          />
          <span id="reg-code-hint" className="field__hint">האתר רק למשפחה. את הקוד מקבלים ממארגני הטיול.</span>
        </div>

        <button type="submit" className="btn btn--gold btn--block" disabled={loading}>
          {loading ? 'נרשם…' : 'הרשמה'}
        </button>

        <p className="auth__switch">
          כבר יש לך חשבון? <Link to="/login">התחבר כאן</Link>
        </p>
      </form>
    </AuthShell>
  );
};

export default Register;
