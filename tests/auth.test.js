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
  const { user, as } = await signUp({ firstName: 'שוקי', lastName: 'זינגר' });
  assert.equal(user.cabinNumber, '10545');
  assert.deepEqual(user.cabinGuests, ['שוקי', 'דניאל']);
  assert.equal(user.family, 'singer');
  assert.equal(user.familyLabel, 'משפחת זינגר');
  assert.deepEqual(user.cabins['10558'], ['אורלי', 'עמית']);
  assert.equal(user.inviteCode, 'Odyssey2027');

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
  assert.equal((await user.as('get', '/api/updates/access')).body.admin, false);

  const admin = await signUp({ email: 'admin@test.com' });
  assert.equal((await admin.as('get', '/api/updates')).status, 200);
});
