const { test } = require('node:test');
const assert = require('node:assert/strict');
const { api, signUp } = require('./helpers');
const PushSubscription = require('../models/PushSubscription');
const { isAllowedPushEndpoint, hasValidKeys } = require('../utils/pushEndpoint');
const { purgeInvalidSubscriptions } = require('../utils/push');

// מפתחות לדוגמה בגודל תקין (p256dh: 65 בייטים, auth: 16 בייטים)
const KEYS = {
  p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
  auth: 'tBHItJI5svbpez7KI4CCXg',
};
const FCM = 'https://fcm.googleapis.com/fcm/send/dQw4w9WgXcQ:APA91bHun4MxP5egoKMwt2KZFBaFUH-1RYqx';

test('כתובות של שירותי ההתראות האמיתיים מתקבלות', () => {
  for (const url of [
    FCM,
    'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABk',
    'https://web.push.apple.com/QGxLdGVzdA',
    'https://wns2-par02p.notify.windows.com/w/?token=BQYAAAB',
    'https://android.googleapis.com/gcm/send/abc',
  ]) assert.equal(isAllowedPushEndpoint(url), true, url);
});

test('כתובות שאינן של שירותי התראות נדחות (SSRF)', () => {
  const bad = [
    'http://fcm.googleapis.com/fcm/send/abc', // לא HTTPS
    'https://evil.example/collect',
    'https://169.254.169.254/latest/meta-data/', // שירות המטא-דאטה של ענן
    'https://127.0.0.1/', 'https://localhost/', 'https://[::1]/', 'https://10.0.0.5/admin',
    'https://2130706433/', 'https://0x7f.1/', // כתובות IP בצורות מוסוות
    'https://fcm.googleapis.com.evil.example/x', // הדומיין המורשה רק בתחילת השם
    'https://evilfcm.googleapis.com.example/x',
    'https://notfcm.googleapis.com.attacker.io/x',
    'https://fcm.googleapis.com@evil.example/x', // משתמש וסיסמה בכתובת
    'https://user:pass@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:8443/x', // פורט לא סטנדרטי
    'https://fcm.googleapis.com\\@evil.example/x', // קו נטוי הפוך (הבדל בין מנתחי כתובות)
    'https://fcm.googleapis.com./x', // נקודה בסוף השם
    ` ${FCM}`, `${FCM} `, // רווחים
    '', 'not a url', 'javascript:alert(1)', 'file:///etc/passwd',
    `https://fcm.googleapis.com/${'a'.repeat(2000)}`, // ארוך מדי
    null, undefined, 42, {}, [FCM],
  ];
  for (const url of bad) assert.equal(isAllowedPushEndpoint(url), false, String(url).slice(0, 60));
});

test('מפתחות המנוי נבדקים', () => {
  assert.equal(hasValidKeys(KEYS), true);
  assert.equal(hasValidKeys(null), false);
  assert.equal(hasValidKeys({ p256dh: KEYS.p256dh }), false);
  assert.equal(hasValidKeys({ ...KEYS, auth: 'קצר' }), false);
  assert.equal(hasValidKeys({ ...KEYS, p256dh: 'x'.repeat(200) }), false);
  assert.equal(hasValidKeys({ ...KEYS, auth: { $gt: '' } }), false);
});

test('רישום להתראות דורש התחברות', async () => {
  const res = await api().post('/api/push/subscribe').send({ subscription: { endpoint: FCM, keys: KEYS } });
  assert.equal(res.status, 401);
});

test('הרישום דוחה כתובת שרירותית ולא שומר אותה', async () => {
  const user = await signUp();
  for (const endpoint of ['https://evil.example/collect', 'https://169.254.169.254/latest/', 'http://fcm.googleapis.com/x', 'https://fcm.googleapis.com@evil.example/']) {
    const res = await user.as('post', '/api/push/subscribe').send({ subscription: { endpoint, keys: KEYS } });
    assert.equal(res.status, 400, endpoint);
    assert.equal(await PushSubscription.countDocuments({ endpoint }), 0);
  }
  // גוף בקשה לא תקין
  assert.equal((await user.as('post', '/api/push/subscribe').send({})).status, 400);
  assert.equal((await user.as('post', '/api/push/subscribe').send({ subscription: 'x' })).status, 400);
  assert.equal((await user.as('post', '/api/push/subscribe').send({ subscription: { endpoint: FCM, keys: { p256dh: 1, auth: 2 } } })).status, 400);
});

test('רישום תקין נשמר, וכתובת של Firefox ואייפון עוברות', async () => {
  const user = await signUp();
  const res = await user.as('post', '/api/push/subscribe').send({ subscription: { endpoint: FCM, keys: KEYS } });
  assert.equal(res.status, 200);
  assert.equal(await PushSubscription.countDocuments({ endpoint: FCM }), 1);
  const apple = 'https://web.push.apple.com/QGxLdGVzdDEy';
  assert.equal((await user.as('post', '/api/push/subscribe').send({ subscription: { endpoint: apple, keys: KEYS } })).status, 200);
});

test('לכל משתמש עד 10 מכשירים: הישנים נמחקים', async () => {
  const user = await signUp();
  for (let i = 0; i < 13; i += 1) {
    const endpoint = `https://fcm.googleapis.com/fcm/send/cap-${i}`;
    const res = await user.as('post', '/api/push/subscribe').send({ subscription: { endpoint, keys: KEYS } });
    assert.equal(res.status, 200);
    // הרישומים הקודמים מתיישנים (i קטן = ישן יותר), והרישום הבא נוצר "עכשיו", כך שהסדר "הישן ביותר" ברור
    await PushSubscription.updateOne({ endpoint }, { createdAt: new Date(Date.now() - (20 - i) * 60 * 1000) });
  }
  const mine = await PushSubscription.find({ endpoint: /cap-/ }).sort({ createdAt: 1 }).lean();
  assert.equal(mine.length, 10);
  assert.ok(mine.every((s) => !/cap-(0|1|2)$/.test(s.endpoint)), 'שלושת הישנים נמחקו');
});

test('מנוי עם כתובת לא מורשית שכבר נשמר נמחק כשהשרת עולה', async () => {
  const user = await signUp();
  const evil = 'https://evil.example/already-stored';
  // עוקפים את הבדיקה כדי לדמות שורה שנשמרה לפני שהבדיקה נוספה
  await PushSubscription.create({ user: user.user.id, endpoint: evil, keys: KEYS });
  const good = 'https://fcm.googleapis.com/fcm/send/keep-me';
  await PushSubscription.create({ user: user.user.id, endpoint: good, keys: KEYS });

  const removed = await purgeInvalidSubscriptions();
  assert.ok(removed >= 1);
  assert.equal(await PushSubscription.countDocuments({ endpoint: evil }), 0);
  assert.equal(await PushSubscription.countDocuments({ endpoint: good }), 1);
});

test('בדיקת חיים לא חושפת גרסאות של ספריות', async () => {
  const res = await api().get('/api/health');
  assert.deepEqual(Object.keys(res.body).sort(), ['db', 'ok']); // בלי RENDER_GIT_COMMIT אין שדה commit
});
