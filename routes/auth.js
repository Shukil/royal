const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendResetEmail } = require('../utils/mailer');
const { cabinFor } = require('../utils/cabins');
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

// הרשמת נוסע חדש
router.post('/register', async (req, res) => {
  const firstName = String(req.body.firstName || '').trim();
  const lastName = String(req.body.lastName || '').trim();
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

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
router.post('/login', async (req, res) => {
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

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      cabinNumber: user.cabinNumber,
    },
  });
});

// בקשה לשחזור סיסמה
router.post('/forgot-password', async (req, res) => {
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
  await user.save();

  res.json({ message: 'הסיסמה עודכנה בהצלחה! אפשר להתחבר עם הסיסמה החדשה.' });
});

module.exports = router;
