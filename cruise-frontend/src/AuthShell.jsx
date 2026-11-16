// מסגרת משותפת לעמודי ההרשמה, ההתחברות ושחזור הסיסמה
import FamilyMark from './FamilyMark';

const AuthShell = ({ children }) => (
  <div className="auth">
    <div className="auth__brand">
      <FamilyMark />
      <span className="auth__ship">על הספינה Odyssey of the Seas</span>
    </div>
    <div className="card">{children}</div>
  </div>
);

export default AuthShell;
