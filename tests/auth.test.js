const { test } = require('node:test');
const assert = require('node:assert/strict');
const { api, signUp } = require('./helpers');

const newUser = (extra = {}) => ({
  firstName: 'דנה', lastName: 'כהן', email: `new${Math.random()}@test.com`, password: 'secret123', ...extra,
});

test('הרשמה דורשת קוד הזמנה נכון', async () => {
  const none = await api().post('/api/auth/register').send(newUser());
  assert.equal(none.status, 403);

  const wrong = await api().post('/api/auth/register').send(newUser({ inviteCode: 'guess' }));
  assert.equal(wrong.status, 403);

  // לא תלוי ברישיות ורווחים
  const ok = await api().post('/api/auth/register').send(newUser({ inviteCode: '  odyssey2027 ' }));
  assert.equal(ok.status, 201);
});

test('בלי INVITE_CODE בשרת ההרשמה סגורה', async () => {
  const saved = process.env.INVITE_CODE;
  delete process.env.INVITE_CODE;
  try {
    const res = await api().post('/api/auth/register').send(newUser({ inviteCode: saved }));
    assert.equal(res.status, 403);
  } finally {
    process.env.INVITE_CODE = saved;
  }
});

test('התחברות מחזירה חדר, שותפים ומשפחה מהשרת', async () => {
  await signUp({ firstName: 'דניאל', lastName: 'בדיקה' });
  const { user, as } = await signUp({ firstName: 'שוקי', lastName: 'זינגר' });
  // ניחוש ראשוני בהרשמה: חדר לפי השם הפרטי, משפחה לפי שם המשפחה
  assert.equal(user.cabinNumber, '10545');
  assert.deepEqual(user.cabinGuests, ['דניאל', 'שוקי']);
  assert.equal(user.family, 'singer');
  assert.equal(user.familyLabel, 'משפחת זינגר');
  assert.deepEqual(user.cabins['10545'], ['דניאל', 'שוקי']);
  assert.equal(user.isAdmin, false);
  assert.equal(user.inviteCode, 'Odyssey2027');

  // נרשם חדש עם אותו שם משפחה מצטרף לאותה משפחה
  const relative = await signUp({ firstName: 'נועה', lastName: 'זינגר' });
  assert.equal(relative.user.family, 'singer');

  const me = await as('get', '/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.cabinNumber, '10545');
});

test('החלפת סיסמה מנתקת את המכשירים האחרים', async () => {
  const { token, email, as } = await signUp();

  const wrong = await as('put', '/api/auth/password').send({ currentPassword: 'nope', newPassword: 'another123' });
  assert.equal(wrong.status, 400);

  const changed = await as('put', '/api/auth/password').send({ currentPassword: 'secret123', newPassword: 'another123' });
  assert.equal(changed.status, 200);
  assert.ok(changed.body.token);

  // הטוקן הישן כבר לא עובד, והחדש כן
  const old = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(old.status, 401);
  const fresh = await api().get('/api/auth/me').set('Authorization', `Bearer ${changed.body.token}`);
  assert.equal(fresh.status, 200);

  const login = await api().post('/api/auth/login').send({ email, password: 'another123' });
  assert.equal(login.status, 200);
});

test('ניסיונות התחברות שגויים נחסמים אחרי 10', async () => {
  const { email } = await signUp();
  for (let i = 0; i < 10; i += 1) {
    const res = await api().post('/api/auth/login').send({ email, password: 'wrong' });
    assert.equal(res.status, 400);
  }
  const blocked = await api().post('/api/auth/login').send({ email, password: 'secret123' });
  assert.equal(blocked.status, 429);
  assert.match(blocked.body.message, /יותר מדי ניסיונות/);
});

test('שחזור סיסמה: עד 3 מיילים בשעה לאותה כתובת', async () => {
  const email = 'flood@test.com';
  for (let i = 0; i < 3; i += 1) {
    const res = await api().post('/api/auth/forgot-password').send({ email });
    assert.equal(res.status, 200);
  }
  const blocked = await api().post('/api/auth/forgot-password').send({ email });
  assert.equal(blocked.status, 429);
});

test('בקשה בלי טוקן או עם טוקן מזויף נדחית', async () => {
  assert.equal((await api().get('/api/auth/me')).status, 401);
  const fake = await api().get('/api/auth/me').set('Authorization', 'Bearer not-a-token');
  assert.equal(fake.status, 401);
});

test('CORS: רק האתר שלנו ושרת הפיתוח', async () => {
  const ours = await api().get('/api/health').set('Origin', 'https://cruise.example');
  assert.equal(ours.headers['access-control-allow-origin'], 'https://cruise.example');

  const dev = await api().get('/api/health').set('Origin', 'http://localhost:5173');
  assert.equal(dev.headers['access-control-allow-origin'], 'http://localhost:5173');

  const evil = await api().get('/api/health').set('Origin', 'https://evil.example');
  assert.equal(evil.headers['access-control-allow-origin'], undefined);
});

test('בדיקת חיים מחזירה את מצב המסד', async () => {
  const res = await api().get('/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true, db: true });
});

test('דף העדכונים רק למנהלים', async () => {
  const user = await signUp();
  assert.equal((await user.as('get', '/api/updates')).status, 404);
  assert.equal((await user.as('get', '/api/auth/me')).body.user.isAdmin, false);

  const admin = await signUp({ email: 'admin@test.com' });
  assert.equal((await admin.as('get', '/api/updates')).status, 200);
});

// ===== משך ההתחברות =====
const jwt = require('jsonwebtoken');
const minutesLeft = (token) => (jwt.decode(token).exp * 1000 - Date.now()) / 60000;

test('בלי "השאר אותי מחובר" הטוקן תקף ל-15 דקות, ועם הסימון ל-30 יום', async () => {
  const { email, password, token } = await signUp();
  assert.ok(minutesLeft(token) > 14 && minutesLeft(token) <= 15);

  const remembered = await api().post('/api/auth/login').send({ email, password, remember: true });
  assert.ok(minutesLeft(remembered.body.token) > 29 * 24 * 60);
});

test('חידוש טוקן קצר נותן עוד 15 דקות; טוקן ארוך לא מתחדש', async () => {
  const { email, password, as } = await signUp();
  const refreshed = await as('post', '/api/auth/refresh');
  assert.equal(refreshed.status, 200);
  assert.ok(minutesLeft(refreshed.body.token) > 14);
  assert.equal(jwt.decode(refreshed.body.token).r, false);

  const remembered = await api().post('/api/auth/login').send({ email, password, remember: true });
  const res = await api().post('/api/auth/refresh').set('Authorization', `Bearer ${remembered.body.token}`);
  assert.equal(res.body.token, null);
});

test('טוקן שפג תוקפו נדחה ולא מתחדש', async () => {
  const { user } = await signUp();
  const expired = jwt.sign({ userId: user.id, v: 0, r: false, exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);
  assert.equal((await api().get('/api/auth/me').set('Authorization', `Bearer ${expired}`)).status, 401);
  assert.equal((await api().post('/api/auth/refresh').set('Authorization', `Bearer ${expired}`)).status, 401);
});

test('טוקנים ישנים (בלי סימון) נחשבים "השאר אותי מחובר", ולא מנותקים', async () => {
  const { user } = await signUp();
  const legacy = jwt.sign({ userId: user.id, v: 0 }, process.env.JWT_SECRET, { expiresIn: '30d' });
  const res = await api().post('/api/auth/refresh').set('Authorization', `Bearer ${legacy}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.token, null);
});

test('החלפת סיסמה שומרת על "השאר אותי מחובר"', async () => {
  const { email, password } = await signUp();
  const login = await api().post('/api/auth/login').send({ email, password, remember: true });
  const changed = await api().put('/api/auth/password').set('Authorization', `Bearer ${login.body.token}`)
    .send({ currentPassword: password, newPassword: 'another123' });
  assert.ok(minutesLeft(changed.body.token) > 29 * 24 * 60);
});

test('התראת ניסיון: כשההתראות כבויות בשרת עונים בהתאם', async () => {
  const { as } = await signUp();
  const res = await as('post', '/api/push/test');
  assert.equal(res.status, 200);
  assert.equal(res.body.enabled, false);
  assert.equal((await api().post('/api/push/test')).status, 401);
});

test('סיסמה חדשה: לפחות 8 תווים', async () => {
  const res = await api().post('/api/auth/register')
    .send({ firstName: 'קצר', lastName: 'סיסמה', email: 'short@test.com', password: '1234567', inviteCode: 'Odyssey2027' });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /8 תווים/);

  const { as } = await signUp();
  const change = await as('put', '/api/auth/password').send({ currentPassword: 'secret123', newPassword: 'short12' });
  assert.equal(change.status, 400);
});

test('השרת לא חושף שהוא Express ושולח כותרות אבטחה', async () => {
  const res = await api().get('/api/health');
  assert.equal(res.headers['x-powered-by'], undefined);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-frame-options'], 'DENY');
});
