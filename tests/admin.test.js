const { test } = require('node:test');
const assert = require('node:assert/strict');
const { signUp } = require('./helpers');

// מנהל אתר (ADMIN_EMAILS בבדיקות: admin@test.com)
let siteAdmin;
const admin = async () => {
  siteAdmin ||= await signUp({ email: 'admin@test.com', firstName: 'מנהל', lastName: 'ראשי' });
  return siteAdmin;
};

test('דף ניהול המשפחות סגור למי שאינו מנהל', async () => {
  const user = await signUp();
  assert.equal((await user.as('get', '/api/admin/families')).status, 404);
  assert.equal((await user.as('post', '/api/admin/families').send({ label: 'משפחה' })).status, 404);
  assert.equal((await user.as('patch', `/api/admin/users/${user.user.id}`).send({ isAdmin: true })).status, 404);
});

test('מנהל רואה את כל המשפחות והמשתמשים', async () => {
  const boss = await admin();
  const res = await boss.as('get', '/api/admin/families');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.families.map((f) => f.key), ['singer', 'agayev']);
  const me = res.body.users.find((u) => u.email === 'admin@test.com');
  assert.equal(me.siteAdmin, true);
  assert.equal(me.isAdmin, true);
});

test('הוספה, שינוי שם ומחיקה של משפחה', async () => {
  const boss = await admin();
  const created = await boss.as('post', '/api/admin/families').send({ label: 'משפחת לוי' });
  assert.equal(created.status, 201);
  const levi = created.body.families.find((f) => f.label === 'משפחת לוי');
  assert.ok(levi);

  assert.equal((await boss.as('post', '/api/admin/families').send({ label: 'משפחת לוי' })).status, 400);

  const renamed = await boss.as('put', `/api/admin/families/${levi.key}`).send({ label: 'משפחת לוי-כהן' });
  assert.equal(renamed.status, 200);
  assert.ok(renamed.body.families.some((f) => f.key === levi.key && f.label === 'משפחת לוי-כהן'));

  // משפחה עם חברים לא נמחקת
  const member = await signUp();
  await boss.as('patch', `/api/admin/users/${member.user.id}`).send({ family: levi.key });
  assert.equal((await boss.as('delete', `/api/admin/families/${levi.key}`)).status, 400);

  await boss.as('patch', `/api/admin/users/${member.user.id}`).send({ family: null });
  assert.equal((await boss.as('delete', `/api/admin/families/${levi.key}`)).status, 200);

  // למשפחה עם טיסה בלו"ז יש אירועים, אז גם ריקה היא לא נמחקת
  const res = await boss.as('get', '/api/admin/families');
  const singers = res.body.users.filter((u) => u.family === 'singer');
  for (const u of singers) await boss.as('patch', `/api/admin/users/${u.id}`).send({ family: null });
  assert.equal((await boss.as('delete', '/api/admin/families/singer')).status, 400);
});

test('העברה בין חדרים ומשפחות מתעדכנת אצל המשתמש', async () => {
  const boss = await admin();
  const user = await signUp({ firstName: 'רון', lastName: 'בדיקה' });
  assert.equal(user.user.family, null);

  assert.equal((await boss.as('patch', `/api/admin/users/${user.user.id}`).send({ cabinNumber: 'abc' })).status, 400);
  assert.equal((await boss.as('patch', `/api/admin/users/${user.user.id}`).send({ family: 'nope' })).status, 400);

  const res = await boss.as('patch', `/api/admin/users/${user.user.id}`).send({ cabinNumber: '10558', family: 'agayev' });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.cabinNumber, '10558');

  const me = await user.as('get', '/api/auth/me');
  assert.equal(me.body.user.cabinNumber, '10558');
  assert.ok(me.body.user.cabinGuests.includes('רון'));
  assert.equal(me.body.user.family, 'agayev');
  assert.equal(me.body.user.familyLabel, 'משפחת עגייב');

  // הטיסה המשפחתית של עגייב מופיעה עכשיו בלו"ז שלו
  const events = await user.as('get', '/api/events');
  assert.ok(events.body.events.some((e) => e.title.includes('LY383')));
  assert.ok(!events.body.events.some((e) => e.title.includes('LY385')));

  // ריקון החדר
  await boss.as('patch', `/api/admin/users/${user.user.id}`).send({ cabinNumber: '' });
  assert.equal((await user.as('get', '/api/auth/me')).body.user.cabinNumber, 'לא שויך');
});

test('אפשר כמה מנהלים לכל משפחה, והם רואים את דפי המנהלים', async () => {
  const boss = await admin();
  const a = await signUp({ lastName: 'עגייב' });
  const b = await signUp({ lastName: 'עגייב' });
  assert.equal((await a.as('get', '/api/updates')).status, 404);

  for (const u of [a, b]) {
    const res = await boss.as('patch', `/api/admin/users/${u.user.id}`).send({ isAdmin: true });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.isAdmin, true);
  }

  // מנהל משפחה רואה את דף העדכונים ואת דף הניהול
  assert.equal((await a.as('get', '/api/updates')).status, 200);
  assert.equal((await a.as('get', '/api/admin/families')).status, 200);
  assert.equal((await a.as('get', '/api/auth/me')).body.user.isAdmin, true);

  const list = await a.as('get', '/api/admin/families');
  assert.equal(list.body.users.filter((u) => u.family === 'agayev' && u.isAdmin).length >= 2, true);

  // מינוי והסרה של מנהלים - רק מנהלי האתר. מנהל אתר יכול להוריד מנהל משפחה
  assert.equal((await b.as('patch', `/api/admin/users/${a.user.id}`).send({ isAdmin: false })).status, 403);
  assert.equal((await boss.as('patch', `/api/admin/users/${a.user.id}`).send({ isAdmin: false })).status, 200);
  assert.equal((await a.as('get', '/api/admin/families')).status, 404);
});

test('מנהל משפחה מנהל רק את המשפחה שלו', async () => {
  const boss = await admin();
  const famAdmin = await signUp({ lastName: 'עגייב' });
  const relative = await signUp({ lastName: 'עגייב' });
  const otherFamily = await signUp({ lastName: 'זינגר' });
  await boss.as('patch', `/api/admin/users/${famAdmin.user.id}`).send({ isAdmin: true });

  const list = await famAdmin.as('get', '/api/admin/families');
  assert.equal(list.body.siteAdmin, false);
  assert.equal(list.body.myFamily, 'agayev');

  // בן משפחה: שם וחדר מותרים, משפחה ומנהל לא
  assert.equal((await famAdmin.as('patch', `/api/admin/users/${relative.user.id}`).send({ cabinNumber: '10558' })).status, 200);
  assert.equal((await famAdmin.as('patch', `/api/admin/users/${relative.user.id}`).send({ firstName: 'נועם' })).status, 200);
  assert.equal((await famAdmin.as('patch', `/api/admin/users/${relative.user.id}`).send({ family: 'singer' })).status, 403);
  assert.equal((await famAdmin.as('patch', `/api/admin/users/${relative.user.id}`).send({ isAdmin: true })).status, 403);
  assert.equal((await famAdmin.as('patch', `/api/admin/users/${famAdmin.user.id}`).send({ isAdmin: false })).status, 403);

  // משפחה אחרת: אסור הכול
  assert.equal((await famAdmin.as('patch', `/api/admin/users/${otherFamily.user.id}`).send({ cabinNumber: '10541' })).status, 403);
  assert.equal((await famAdmin.as('delete', `/api/admin/users/${otherFamily.user.id}`)).status, 403);

  // ניהול משפחות - רק מנהלי אתר
  assert.equal((await famAdmin.as('post', '/api/admin/families').send({ label: 'משפחה חדשה' })).status, 403);
  assert.equal((await famAdmin.as('put', '/api/admin/families/agayev').send({ label: 'שם אחר' })).status, 403);
  assert.equal((await famAdmin.as('delete', '/api/admin/families/agayev')).status, 403);

  // מחיקה: בן משפחה רגיל כן, מנהל משפחה אחר לא
  const coAdmin = await signUp({ lastName: 'עגייב' });
  await boss.as('patch', `/api/admin/users/${coAdmin.user.id}`).send({ isAdmin: true });
  assert.equal((await famAdmin.as('delete', `/api/admin/users/${coAdmin.user.id}`)).status, 403);
  assert.equal((await famAdmin.as('delete', `/api/admin/users/${relative.user.id}`)).status, 200);
});

test('מנהל משפחה חייב להיות במשפחה, ויציאה מהמשפחה מבטלת את הניהול', async () => {
  const boss = await admin();
  const loner = await signUp({ lastName: 'בלי משפחה' });
  assert.equal((await boss.as('patch', `/api/admin/users/${loner.user.id}`).send({ isAdmin: true })).status, 400);

  await boss.as('patch', `/api/admin/users/${loner.user.id}`).send({ family: 'singer', isAdmin: true });
  const res = await boss.as('patch', `/api/admin/users/${loner.user.id}`).send({ family: null });
  assert.equal(res.body.user.isAdmin, false);
});

test('תיקון שם ומחיקת משתמש', async () => {
  const boss = await admin();
  const typo = await signUp({ firstName: 'דנייאל', lastName: 'בדיקה' });

  assert.equal((await boss.as('patch', `/api/admin/users/${typo.user.id}`).send({ firstName: '  ' })).status, 400);
  const fixed = await boss.as('patch', `/api/admin/users/${typo.user.id}`).send({ firstName: 'דניאל' });
  assert.equal(fixed.status, 200);
  assert.equal(fixed.body.user.firstName, 'דניאל');

  // אירוע שהוא יצר, ואירוע של מישהו אחר שהוא מוזמן אליו
  const ev = await typo.as('post', '/api/events').send({ type: 'personal', title: 'שלי', date: '2027-08-03', time: '10:00' });
  const other = await signUp();
  const shared = await other.as('post', '/api/events')
    .send({ type: 'custom', title: 'משותף', date: '2027-08-04', time: '10:00', invitees: [typo.user.id] });
  await typo.as('put', `/api/events/${shared.body.id}/rsvp`).send({ status: 'yes' });

  // אי אפשר למחוק את עצמך או מנהל אתר
  assert.equal((await boss.as('delete', `/api/admin/users/${boss.user.id}`)).status, 400);
  assert.equal((await boss.as('delete', `/api/admin/users/${typo.user.id}`)).status, 200);

  assert.equal((await typo.as('get', '/api/auth/me')).status, 401);
  assert.equal((await other.as('get', `/api/events/${ev.body.id}`)).status, 404);
  const after = await other.as('get', `/api/events/${shared.body.id}`);
  assert.deepEqual(after.body.invitees, []);
  assert.equal(after.body.counts.yes, 1); // רק היוצר
  const list = await boss.as('get', '/api/admin/families');
  assert.ok(!list.body.users.some((u) => u.id === typo.user.id));
});
