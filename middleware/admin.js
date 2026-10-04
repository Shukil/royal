const User = require('../models/User');
const { isAdminUser, isSiteAdmin } = require('../utils/families');

// אחרי middleware/auth.js: מסמן ב-req.isAdmin אם המשתמש מנהל (מנהל אתר או מנהל משפחה),
// וב-req.isSiteAdmin אם הוא מנהל אתר (ADMIN_EMAILS), שרק לו מותרות פעולות על כל המשפחות
const loadAdmin = async (req, res, next) => {
  const me = await User.findById(req.userId).select('email isAdmin family').lean();
  if (!me) return res.status(401).json({ message: 'יש להתחבר' });
  req.me = me;
  req.isAdmin = isAdminUser(me);
  req.isSiteAdmin = isSiteAdmin(me);
  next();
};

// פעולות של מנהלי אתר בלבד (הוספה ומחיקה של משפחות, העברה בין משפחות, מינוי מנהלים)
const SITE_ADMIN_ONLY = { message: 'רק מנהלי האתר יכולים לעשות את זה' };
const requireSiteAdmin = (req, res, next) => {
  if (!req.isSiteAdmin) return res.status(403).json(SITE_ADMIN_ONLY);
  next();
};

// דפים של מנהלים בלבד. לאחרים עונים "לא נמצא", כדי לא לחשוף שהדף קיים
const requireAdmin = (req, res, next) => {
  if (!req.isAdmin) return res.status(404).json({ message: 'הדף לא נמצא' });
  next();
};

module.exports = { loadAdmin, requireAdmin, requireSiteAdmin, SITE_ADMIN_ONLY };
