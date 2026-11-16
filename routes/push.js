const express = require('express');
const PushSubscription = require('../models/PushSubscription');
const auth = require('../middleware/auth');
const { publicKey, sendTest } = require('../utils/push');
const { isAllowedPushEndpoint, hasValidKeys, MAX_SUBSCRIPTIONS_PER_USER } = require('../utils/pushEndpoint');
const router = express.Router();

// המפתח הציבורי שהדפדפן צריך כדי להירשם להתראות (null = ההתראות כבויות בשרת)
router.get('/key', (req, res) => {
  res.json({ key: publicKey() });
});

router.use(auth);

// רישום הטלפון/הדפדפן הזה להתראות של המשתמש המחובר
router.post('/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body.subscription || {};
  // רק כתובות של שירותי ההתראות של הדפדפנים (utils/pushEndpoint.js): אחרת השרת היה שולח בקשות לכל כתובת שמשתמש ימסור
  if (!isAllowedPushEndpoint(endpoint) || !hasValidKeys(keys)) {
    return res.status(400).json({ message: 'פרטי ההרשמה להתראות אינם תקינים' });
  }
  // כתובת שכבר רשומה למשתמש אחר עוברת אליי רק אם המפתחות הפרטיים של המנוי זהים (אותו מכשיר שהתחבר עם חשבון אחר).
  // מי שמכיר רק את הכתובת, בלי המפתחות, לא יכול לקחת לעצמו מנוי של מישהו אחר
  const existing = await PushSubscription.findOne({ endpoint }).lean();
  if (existing && String(existing.user) !== String(req.userId)
    && (existing.keys.p256dh !== keys.p256dh || existing.keys.auth !== keys.auth)) {
    return res.status(400).json({ message: 'פרטי ההרשמה להתראות אינם תקינים' });
  }
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { user: req.userId, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
    { upsert: true },
  );

  // לכל משתמש עד כמה מכשירים: הישנים ביותר נמחקים, כדי שאי אפשר יהיה להצטבר בלי הגבלה
  // (וגם מכשיר שהותקן מחדש לא משאיר אחריו מנויים ישנים לנצח)
  const extra = await PushSubscription.find({ user: req.userId }).sort({ createdAt: -1 }).skip(MAX_SUBSCRIPTIONS_PER_USER).select('_id').lean();
  if (extra.length) await PushSubscription.deleteMany({ _id: { $in: extra.map((e) => e._id) } });
  res.json({ ok: true });
});

// התראת ניסיון לכל המכשירים של המשתמש המחובר
router.post('/test', async (req, res) => {
  res.json(await sendTest(req.userId));
});

// ביטול ההתראות בטלפון/בדפדפן הזה
router.delete('/subscribe', async (req, res) => {
  await PushSubscription.deleteOne({ endpoint: String(req.body.endpoint || ''), user: req.userId });
  res.json({ ok: true });
});

module.exports = router;
