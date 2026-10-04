const express = require('express');
const auth = require('../middleware/auth');
const { loadAdmin, requireAdmin } = require('../middleware/admin');
const { CHANGELOG } = require('../utils/changelog');
const router = express.Router();

// דף "עדכוני האתר": רק למנהלים - מנהלי האתר (ADMIN_EMAILS) ומנהלי המשפחות (utils/families.js).
// אם להציג את הקישור בתפריט נקבע לפי isAdmin בפרטי המשתמש (/auth/me)
router.use(auth, loadAdmin, requireAdmin);

router.get('/', (req, res) => {
  res.json({ changelog: CHANGELOG });
});

module.exports = router;
