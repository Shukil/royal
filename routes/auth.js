const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { signToken } = require('../middleware/auth');
const { loginLimits, forgotPasswordLimits, registerLimits, changePasswordLimits } = require('../middleware/rateLimits');
const { sendResetEmail } = require('../utils/mailer');
const { cabinFor, guestsOf, roster } = require('../utils/cabins');
const { FAMILIES, familyOf } = require('../utils/family');
const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;
const RESET_TTL = 60 * 60 * 1000; // שעה
const BCRYPT_ROUNDS = 10;
const BAD_LOGIN = 'המייל או הסיסמה שגויים';
const SHORT_PASSWORD = `הסיסמה צריכה להכיל לפחות ${MIN_PASSWORD} תווים`;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const isValidPassword = (password) => typeof password === 'string' && password.length >= MIN_PASSWORD;

// יוצר טוקן אקראי: הגרסה הגלויה נשלחת במייל, ורק ה-hash נשמר במסד
const createToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
};

// קוד ההזמנה להרשמה נשמר במשתנה הסביבה INVITE_CODE (המאגר ציבורי). בלי המשתנה ההרשמה סגורה.
// ההשוואה לא תלויה ברישיות וברווחים, ונעשית בזמן קבוע כדי שאי אפשר יהיה לנחש אותה אות אחרי אות
const normalizeCode = (code) => String(code || '').trim().toLowerCase();
const isInviteCode = (code) => {
  const expected = normalizeCode(process.env.INVITE_CODE);
  if (!expected) return false;
  const digest = (s) => crypto.createHash('sha256').update(s).digest();
  return crypto.timingSafeEqual(digest(normalizeCode(code)), digest(expected));
};

// פרטי המשתמש שהאתר שומר. החדר, השותפים לחדר והמשפחה נקבעים כאן בלבד
const userPayload = (user) => {
  const family = familyOf(user.lastName);
  return {
    id: user._id,
    name: `${user.firstName} ${user.lastName}`,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    cabinNumber: user.cabinNumber,
    cabinGuests: guestsOf(user.cabinNumber),
    // כל החדרים, כדי שטבלת החדרים תעבוד גם בלי אינטרנט
    cabins: roster(),
    family,
    familyLabel: family ? FAMILIES[family].label : null,
  };
};

// הרשמת נוסע חדש
router.post('/register', registerLimits, async (req, res) => {
  const firstName = String(req.body.firstName || '').trim();
  const lastName = String(req.body.lastName || '').trim();
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  if (!process.env.INVITE_CODE) return res.status(403).json({ message: 'ההרשמה סגורה כרגע. כדאי לפנות למארגני הטיול.' });
  if (!isInviteCode(req.body.inviteCode)) return res.status(403).json({ message: 'קוד ההזמנה שגוי. את הקוד מקבלים ממארגני הטיול.' });
  if (!firstName || !lastName) return res.status(400).json({ message: 'יש למלא שם פרטי ושם משפחה' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'כתובת המייל אינה תקינה' });
  if (!isValidPassword(password)) return res.status(400).json({ message: SHORT_PASSWORD });

  const duplicate = { message: 'כבר קיים משתמש עם כתובת המייל הזו' };
  if (await User.exists({ email })) return res.status(400).json(duplicate);

  try {
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: await bcrypt.hash(password, BCRYPT_ROUNDS),
      cabinNumber: cabinFor(firstName),
    });
    res.status(201).json({ message: 'נרשמת בהצלחה!', cabin: user.cabinNumber });
  } catch (error) {
    // שתי הרשמות באותו רגע עם אותו מייל: האינדקס הייחודי תופס את השנייה
    if (error.code === 11000) return res.status(400).json(duplicate);
    throw error;
  }
});

// התחברות
router.post('/login', loginLimits, async (req, res) => {
  const user = await User.findOne({ email: normalizeEmail(req.body.email) });
  if (!user) return res.status(400).json({ message: BAD_LOGIN });

  const isMatch = await bcrypt.compare(String(req.body.password || ''), user.password);
  if (!isMatch) return res.status(400).json({ message: BAD_LOGIN });

  // שיוך מחדש לפי השם הפרטי, כך שעדכון של רשימת החדרים חל גם על משתמשים קיימים
  const cabinNumber = cabinFor(user.firstName);
  if (user.cabinNumber !== cabinNumber) {
    user.cabinNumber = cabinNumber;
    await user.save();
  }

  res.json({ token: signToken(user), user: userPayload(user) });
});

// הפרטים העדכניים של המשתמש המחובר. האתר קורא לזה בכל טעינה, כך ששינוי ברשימת החדרים
// או המשפחות מגיע גם למי שכבר מחובר
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: 'יש להתחבר' });

  const cabinNumber = cabinFor(user.firstName);
  if (user.cabinNumber !== cabinNumber) {
    user.cabinNumber = cabinNumber;
    await user.save();
  }
  res.json({ user: userPayload(user) });
});

// החלפת סיסמה מתוך האתר. כל המכשירים האחרים מתנתקים, והמכשיר הנוכחי מקבל טוקן חדש
router.put('/password', auth, changePasswordLimits, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!isValidPassword(newPassword)) return res.status(400).json({ message: SHORT_PASSWORD });

  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: 'יש להתחבר' });
  if (!(await bcrypt.compare(String(currentPassword || ''), user.password))) {
    return res.status(400).json({ message: 'הסיסמה הנוכחית שגויה' });
  }

  user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  res.json({ message: 'הסיסמה עודכנה. שאר המכשירים שלך נותקו.', token: signToken(user) });
});

// בקשה לשחזור סיסמה
router.post('/forgot-password', forgotPasswordLimits, async (req, res) => {
  const user = await User.findOne({ email: normalizeEmail(req.body.email) });

  if (user) {
    const { token, hash } = createToken();
    user.resetTokenHash = hash;
    user.resetTokenExpires = new Date(Date.now() + RESET_TTL);
    await user.save();
    await sendResetEmail(user.email, user.firstName, `${CLIENT_URL}/reset-password?token=${token}`);
  }

  // תשובה זהה בכל מקרה, כדי לא לחשוף אילו מיילים רשומים
  res.json({ message: 'אם המייל רשום במערכת, נשלח אליו קישור לאיפוס הסיסמה.' });
});

// איפוס סיסמה בעזרת הטוקן מהמייל
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || typeof token !== 'string') return res.status(400).json({ message: 'קישור האיפוס אינו תקין' });
  if (!isValidPassword(password)) return res.status(400).json({ message: SHORT_PASSWORD });

  const user = await User.findOne({
    resetTokenHash: hashToken(token),
    resetTokenExpires: { $gt: new Date() },
  });
  if (!user) return res.status(400).json({ message: 'קישור האיפוס אינו תקין או שפג תוקפו' });

  user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  // מי שאיפס סיסמה כנראה חושש שמישהו אחר נכנס לחשבון: מנתקים את כל המכשירים
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.json({ message: 'הסיסמה עודכנה בהצלחה! אפשר להתחבר עם הסיסמה החדשה.' });
});

module.exports = router;
