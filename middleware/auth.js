const jwt = require('jsonwebtoken');
const User = require('../models/User');

const EXPIRED = { message: 'פג תוקף ההתחברות, יש להתחבר מחדש' };

// משך ההתחברות: 30 יום עם "השאר אותי מחובר", ובלעדיו 15 דקות בלי פעילות.
// בזמן שמשתמשים באתר, הדפדפן מחדש את הטוקן הקצר (/auth/refresh), כך שהניתוק קורה רק אחרי 15 דקות בלי שימוש
const REMEMBER_TTL = '30d';
const SESSION_TTL = '15m';

// יוצר טוקן התחברות. v הוא מספר הגרסה של הסיסמה: כשמחליפים סיסמה הוא עולה,
// וכל הטוקנים הישנים (במכשירים אחרים) מפסיקים לעבוד. r: האם סימנו "השאר אותי מחובר"
const signToken = (user, remember) =>
  jwt.sign({ userId: user._id, v: user.tokenVersion || 0, r: Boolean(remember) }, process.env.JWT_SECRET, {
    expiresIn: remember ? REMEMBER_TTL : SESSION_TTL,
  });

// מוודא שנשלח טוקן תקין (Authorization: Bearer <token>) ושומר את מזהה המשתמש ב-req.userId
const auth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'יש להתחבר' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json(EXPIRED);
  }

  // טוקנים מלפני שנוספה הגרסה (בלי v) נחשבים גרסה 0
  const user = await User.findById(payload.userId).select('tokenVersion').lean();
  if (!user || (payload.v || 0) !== (user.tokenVersion || 0)) return res.status(401).json(EXPIRED);

  req.userId = payload.userId;
  // טוקנים מלפני שנוספה האפשרות (בלי r) היו של 30 יום, אז הם נחשבים "השאר אותי מחובר"
  req.remember = payload.r !== false;
  next();
};

module.exports = auth;
module.exports.signToken = signToken;
