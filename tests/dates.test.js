const { test } = require('node:test');
const assert = require('node:assert/strict');
const { signUp } = require('./helpers');

// נתיבים עם תאריך בכתובת מקבלים רק תאריכים של הטיול: אחרת משתמש מחובר היה יוצר מסמכים לתאריכים שרירותיים
test('תאריך שרירותי בכתובת נדחה בנתיבי יום נמל, תוכנית ושעון הספינה', async () => {
  const user = await signUp();
  for (const date of ['2099-01-01', '2027-08-16', 'abc', '2027-8-17', '..%2Fx']) {
    assert.equal((await user.as('get', `/api/port-day/${date}`)).status, 404, `port-day get ${date}`);
    assert.equal((await user.as('put', `/api/port-day/${date}/meeting`).send({ place: 'x', time: '10:00' })).status, 404, `port-day meeting ${date}`);
    assert.equal((await user.as('put', `/api/port-day/${date}/aboard`).send({ userId: user.user.id, aboard: true })).status, 404, `port-day aboard ${date}`);
    assert.equal((await user.as('get', `/api/plan/${date}`)).status, 404, `plan get ${date}`);
    assert.equal((await user.as('post', `/api/plan/${date}`).send({ start: '10:00', title: 'x' })).status, 404, `plan post ${date}`);
  }
  // שעון הספינה: תאריך מחוץ לטיול או לא תקין
  for (const date of ['2099-01-01', 'abc']) {
    assert.equal((await user.as('put', `/api/ship-clock/${date}`).send({ shift: 1 })).status, 400, `ship-clock ${date}`);
  }
  // יום נמל אמיתי כן עובד
  assert.equal((await user.as('get', '/api/port-day/2027-08-17')).status, 200);
});

test('התחברות עם מייל שלא קיים וסיסמה שגויה נראות אותו דבר, ולוקחות זמן דומה', async () => {
  const { api } = require('./helpers');
  const real = await signUp({ email: 'timing-check@test.com', password: 'secret123' });
  const time = async (email) => {
    const t = process.hrtime.bigint();
    const res = await api().post('/api/auth/login').send({ email, password: 'wrong-password-1' });
    return { ms: Number(process.hrtime.bigint() - t) / 1e6, res };
  };
  await time('warmup@test.com');
  let known = 0;
  let unknown = 0;
  let last;
  for (let i = 0; i < 4; i += 1) {
    known += (await time(real.email)).ms;
    last = await time(`nobody-${i}@test.com`);
    unknown += last.ms;
  }
  assert.equal(last.res.status, 400);
  assert.equal(last.res.body.message, 'המייל או הסיסמה שגויים');
  // בלי ה-hash המזויף המייל הלא קיים חוזר תוך חלקיק קטן מהזמן; כאן הזמנים באותו סדר גודל
  assert.ok(unknown > known * 0.5, `unknown ${unknown.toFixed(0)}ms vs known ${known.toFixed(0)}ms`);
});
