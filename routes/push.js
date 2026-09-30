const express = require('express');
const PushSubscription = require('../models/PushSubscription');
const auth = require('../middleware/auth');
const { publicKey } = require('../utils/push');
const router = express.Router();

// המפתח הציבורי שהדפדפן צריך כדי להירשם להתראות (null = ההתראות כבויות בשרת)
router.get('/key', (req, res) => {
  res.json({ key: publicKey() });
});

router.use(auth);

// רישום הטלפון/הדפדפן הזה להתראות של המשתמש המחובר
router.post('/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body.subscription || {};
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ message: 'פרטי ההרשמה להתראות אינם תקינים' });
  }
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { user: req.userId, endpoint, keys: { p256dh: String(keys.p256dh), auth: String(keys.auth) } },
    { upsert: true },
  );
  res.json({ ok: true });
});

// ביטול ההתראות בטלפון/בדפדפן הזה
router.delete('/subscribe', async (req, res) => {
  await PushSubscription.deleteOne({ endpoint: String(req.body.endpoint || ''), user: req.userId });
  res.json({ ok: true });
});

module.exports = router;
