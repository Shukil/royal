const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// הגבלת ניסיונות בנתיבי ההתחברות, נגד ניחוש סיסמאות והצפת תיבות מייל.
// על הספינה כל המשפחה גולשת מאותה כתובת IP, אז ההגבלה העיקרית היא לפי מייל ולא רק לפי IP
const MINUTE = 60 * 1000;

const emailOf = (req) => String(req.body?.email || '').trim().toLowerCase();
const ipOf = (req) => ipKeyGenerator(req.ip || '');

const limiter = ({ minutes, limit, key, message, onlyFailures = false }) =>
  rateLimit({
    windowMs: minutes * MINUTE,
    limit,
    keyGenerator: key,
    skipSuccessfulRequests: onlyFailures,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message },
  });

const TRY_LATER = (minutes) => `יותר מדי ניסיונות. אפשר לנסות שוב בעוד ${minutes} דקות.`;

// התחברות: רק ניסיונות שנכשלו נספרים
const loginLimits = [
  limiter({ minutes: 15, limit: 10, onlyFailures: true, key: (req) => `${ipOf(req)}|${emailOf(req)}`, message: TRY_LATER(15) }),
  limiter({ minutes: 15, limit: 50, onlyFailures: true, key: ipOf, message: TRY_LATER(15) }),
];

// שחזור סיסמה: עד 3 מיילים בשעה לאותה כתובת, כדי שאי אפשר יהיה להציף מישהו במיילים
const forgotPasswordLimits = [
  limiter({ minutes: 60, limit: 3, key: emailOf, message: 'כבר נשלחו כמה מיילים לכתובת הזו. כדאי לבדוק גם בספאם, או לנסות שוב בעוד שעה.' }),
  limiter({ minutes: 60, limit: 20, key: ipOf, message: TRY_LATER(60) }),
];

// הרשמה: קוד ההזמנה הוא ההגנה העיקרית. המגבלה נדיבה, כי משפחה שלמה עשויה להירשם יחד מאותו Wi-Fi
const registerLimits = [limiter({ minutes: 60, limit: 30, key: ipOf, message: TRY_LATER(60) })];

// החלפת סיסמה מתוך האתר: ניחוש של הסיסמה הנוכחית
const changePasswordLimits = [
  limiter({ minutes: 15, limit: 10, onlyFailures: true, key: (req) => `user|${req.userId}`, message: TRY_LATER(15) }),
];

module.exports = { loginLimits, forgotPasswordLimits, registerLimits, changePasswordLimits };
