const User = require('../models/User');
const { isAdminUser } = require('../utils/families');

// אחרי middleware/auth.js: מסמן ב-req.isAdmin אם המשתמש מנהל (מנהל אתר או מנהל משפחה)
const loadAdmin = async (req, res, next) => {
  const me = await User.findById(req.userId).select('email isAdmin family').lean();
  if (!me) return res.status(401).json({ message: 'יש להתחבר' });
  req.me = me;
  req.isAdmin = isAdminUser(me);
  next();
};

// דפים של מנהלים בלבד. לאחרים עונים "לא נמצא", כדי לא לחשוף שהדף קיים
const requireAdmin = (req, res, next) => {
  if (!req.isAdmin) return res.status(404).json({ message: 'הדף לא נמצא' });
  next();
};

module.exports = { loadAdmin, requireAdmin };
