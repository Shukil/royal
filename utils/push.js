const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// התראות לטלפון (Web Push). דורש מפתחות VAPID בסביבה; בלעדיהם ההתראות פשוט כבויות.
// יצירת מפתחות: npx web-push generate-vapid-keys
// רווחים, מירכאות או שם המשתנה שהודבקו בטעות יחד עם הערך מוסרים
const clean = (value) => String(value || '').trim().replace(/^["']|["']$/g, '').replace(/^VAPID_[A-Z_]+\s*=\s*/, '').trim();
const VAPID_PUBLIC_KEY = clean(process.env.VAPID_PUBLIC_KEY);
const VAPID_PRIVATE_KEY = clean(process.env.VAPID_PRIVATE_KEY);
const VAPID_SUBJECT = clean(process.env.VAPID_SUBJECT) || 'mailto:admin@example.com';

// מפתח לא תקין לא מפיל את השרת: ההתראות פשוט כבויות, ובלוג מופיעה הסיבה
let enabled = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    enabled = true;
    console.log('Push notifications are on');
  } catch (err) {
    console.error(`Push notifications are off: invalid VAPID settings (${err.message}). ` +
      'Check that VAPID_PUBLIC_KEY (87 characters) and VAPID_PRIVATE_KEY (43 characters) are not swapped.');
  }
} else {
  console.log('Push notifications are off (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set)');
}

const publicKey = () => (enabled ? VAPID_PUBLIC_KEY : null);

// שולח התראה. to: רשימת מזהי משתמשים, או null לכולם. except: מי שגרם לשינוי (לא צריך התראה על עצמו).
// לא מחכים לתוצאה ולא מפילים את הבקשה אם השליחה נכשלה
const notify = ({ to = null, except = null, title, body, url = '/' }) => {
  if (!enabled) return;
  (async () => {
    const filter = {};
    if (to) filter.user = { $in: to };
    if (except) filter.user = { ...filter.user, $ne: except };
    const subs = await PushSubscription.find(filter).lean();
    const payload = JSON.stringify({ title, body, url });
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 12 * 60 * 60 });
      } catch (err) {
        // המנוי בוטל או פג (למשל האפליקציה נמחקה מהטלפון)
        if (err.statusCode === 404 || err.statusCode === 410) await PushSubscription.deleteOne({ _id: s._id });
        else console.error('Push failed', err.statusCode || err.message);
      }
    }));
  })().catch((err) => console.error('Push failed', err));
};

module.exports = { publicKey, notify };
