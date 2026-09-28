// מסגרת משותפת לעמודי ההרשמה, ההתחברות ושחזור הסיסמה
import RoyalLogo from './RoyalLogo';

const AuthShell = ({ children }) => (
  <div className="auth">
    <div className="auth__brand">
      <RoyalLogo />
      <span className="brand__ship">Odyssey of the Seas</span>
    </div>
    <div className="card">{children}</div>
  </div>
);

export default AuthShell;
