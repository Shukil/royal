const jwt = require('jsonwebtoken');
const User = require('../models/User');

const EXPIRED = { message: 'פג תוקף ההתחברות, יש להתחבר מחדש' };

// יוצר טוקן התחברות. v הוא מספר הגרסה של הסיסמה: כשמחליפים סיסמה הוא עולה,
// וכל הטוקנים הישנים (במכשירים אחרים) מפסיקים לעבוד
const signToken = (user) =>
  jwt.sign({ userId: user._id, v: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: '30d' });

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
  next();
};

module.exports = auth;
module.exports.signToken = signToken;
