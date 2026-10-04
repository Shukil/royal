const { test } = require('node:test');
const assert = require('node:assert/strict');
const { signUp } = require('./helpers');

test('רק מנהלים מפרסמים ומוחקים הודעות, וכולם רואים אותן', async () => {
  const boss = await signUp({ email: 'admin@test.com' });
  const user = await signUp();

  assert.equal((await user.as('post', '/api/announcements').send({ text: 'שלום', hours: 6 })).status, 404);
  assert.equal((await boss.as('post', '/api/announcements').send({ text: '', hours: 6 })).status, 400);
  assert.equal((await boss.as('post', '/api/announcements').send({ text: 'שלום', hours: 5 })).status, 400);

  const created = await boss.as('post', '/api/announcements').send({ text: 'נפגשים בלובי ב-8:00', hours: 6 });
  assert.equal(created.status, 201);
  const { id } = created.body.announcement;

  const seen = await user.as('get', '/api/announcements');
  assert.equal(seen.body.announcements[0].text, 'נפגשים בלובי ב-8:00');
  assert.equal(seen.body.announcements[0].by, 'בודק בדיקות');

  assert.equal((await user.as('delete', `/api/announcements/${id}`)).status, 404);
  assert.equal((await boss.as('delete', `/api/announcements/${id}`)).status, 200);
  assert.equal((await user.as('get', '/api/announcements')).body.announcements.length, 0);
});

test('הודעה שפג תוקפה לא מוצגת', async () => {
  const Announcement = require('../models/Announcement');
  const user = await signUp();
  await Announcement.create({ text: 'ישנה', until: new Date(Date.now() - 1000) });
  assert.ok(!(await user.as('get', '/api/announcements')).body.announcements.some((a) => a.text === 'ישנה'));
});
