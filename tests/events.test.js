const { test } = require('node:test');
const assert = require('node:assert/strict');
const Event = require('../models/Event');
const { signUp } = require('./helpers');

let day = 0;
// כל אירוע ביום משלו, כדי שבדיקות שונות לא יתנגשו זו בזו בלו"ז
const nextDate = () => `2027-08-${String(1 + (day++ % 22)).padStart(2, '0')}`;
const eventBody = (extra = {}) => ({ type: 'all', title: 'ארוחת ערב', date: nextDate(), time: '21:00', ...extra });

test('רק יוצר האירוע יכול לערוך ולמחוק אותו', async () => {
  const owner = await signUp();
  const other = await signUp();
  const { body } = await owner.as('post', '/api/events').send(eventBody());

  const edit = await other.as('put', `/api/events/${body.id}`).send(eventBody({ title: 'נפרץ' }));
  assert.equal(edit.status, 403);
  const del = await other.as('delete', `/api/events/${body.id}`);
  assert.equal(del.status, 403);

  const ok = await owner.as('put', `/api/events/${body.id}`).send(eventBody({ title: 'ארוחת ערב בפיאצה' }));
  assert.equal(ok.status, 200);
  const after = await other.as('get', `/api/events/${body.id}`);
  assert.equal(after.body.title, 'ארוחת ערב בפיאצה');
});

test('עריכה בלי שינוי שעה לא מתנגשת באירוע עצמו', async () => {
  const owner = await signUp();
  const fields = eventBody();
  const { body } = await owner.as('post', '/api/events').send(fields);

  const res = await owner.as('put', `/api/events/${body.id}`).send({ ...fields, location: 'הלובי' });
  assert.equal(res.status, 200);

  // אבל אירוע חדש באותה שעה כן מתנגש
  const clash = await owner.as('post', '/api/events').send(fields);
  assert.equal(clash.status, 409);
});

test('עריכה שמוציאה מוזמן מוחקת את אישור ההגעה שלו', async () => {
  const owner = await signUp();
  const a = await signUp();
  const b = await signUp();
  const fields = eventBody({ type: 'custom', invitees: [a.user.id, b.user.id] });
  const { body } = await owner.as('post', '/api/events').send(fields);
  await a.as('put', `/api/events/${body.id}/rsvp`).send({ status: 'yes' });

  const res = await owner.as('put', `/api/events/${body.id}`).send({ ...fields, invitees: [b.user.id] });
  assert.equal(res.status, 200);

  assert.equal((await a.as('get', `/api/events/${body.id}`)).status, 404);
  const ev = await owner.as('get', `/api/events/${body.id}`);
  assert.deepEqual(ev.body.invitees, [b.user.id]);
  assert.equal(ev.body.counts.yes, 1); // רק היוצר
});

test('אירועים קבועים של הטיול לא נערכים ולא נמחקים', async () => {
  const user = await signUp();
  const system = await Event.findOne({ systemKey: { $exists: true }, type: 'all' }).lean();
  assert.ok(system, 'expected a seeded system event');

  const edit = await user.as('put', `/api/events/${system._id}`).send(eventBody());
  assert.equal(edit.status, 403);
  const del = await user.as('delete', `/api/events/${system._id}`);
  assert.equal(del.status, 403);
});

test('אירוע אישי לא נראה למשתמשים אחרים', async () => {
  const owner = await signUp();
  const other = await signUp();
  const { body } = await owner.as('post', '/api/events').send(eventBody({ type: 'personal' }));

  assert.equal((await other.as('get', `/api/events/${body.id}`)).status, 404);
  assert.equal((await other.as('put', `/api/events/${body.id}`).send(eventBody())).status, 404);
  const list = await other.as('get', '/api/events');
  assert.ok(!list.body.events.some((e) => e.id === body.id));
});
