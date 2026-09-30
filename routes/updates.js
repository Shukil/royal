const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { CHANGELOG } = require('../utils/changelog');
const router = express.Router();

// מי רואה את דף "עדכוני האתר": רשימת מיילים במשתנה הסביבה ADMIN_EMAILS (מופרדים בפסיק).
// המיילים לא כתובים בקוד כי המאגר ציבורי. בלי המשתנה אף אחד לא רואה את הדף
const adminEmails = () =>
  String(process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

router.use(auth);

router.use(async (req, res, next) => {
  const me = await User.findById(req.userId).select('email').lean();
  if (!me) return res.status(401).json({ message: 'יש להתחבר' });
  req.isAdmin = adminEmails().includes(me.email);
  next();
});

// האם להציג את הקישור בתפריט
router.get('/access', (req, res) => {
  res.json({ admin: req.isAdmin });
});

// התוכן עצמו מגיע רק למנהלים. לאחרים עונים "לא נמצא", כדי לא לחשוף שהדף קיים
router.get('/', (req, res) => {
  if (!req.isAdmin) return res.status(404).json({ message: 'הדף לא נמצא' });
  res.json({ changelog: CHANGELOG });
});

module.exports = router;
