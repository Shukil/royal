const { test } = require('node:test');
const assert = require('node:assert/strict');
const { signUp } = require('./helpers');

test('משימות החדר משותפות לחדר בלבד, וכל מי שבחדר יכול למחוק', async () => {
  const shuki = await signUp({ firstName: 'שוקי' });
  const daniel = await signUp({ firstName: 'דניאל' }); // אותו חדר
  const gal = await signUp({ firstName: 'גל' }); // חדר אחר

  const { body: task } = await shuki.as('post', '/api/cabin-tasks').send({ text: 'להביא מטען' });

  // גם אם מבקשים חדר אחר בנתיב, מקבלים רק את החדר שלך
  const galView = await gal.as('get', '/api/cabin-tasks/10545');
  assert.equal(galView.body.length, 0);
  assert.equal((await gal.as('put', `/api/cabin-tasks/${task._id}`).send({ isCompleted: true })).status, 404);
  assert.equal((await gal.as('delete', `/api/cabin-tasks/${task._id}`)).status, 404);

  const danielView = await daniel.as('get', '/api/cabin-tasks/10545');
  assert.equal(danielView.body.length, 1);

  assert.equal((await daniel.as('delete', `/api/cabin-tasks/${task._id}`)).status, 200);
  assert.equal((await shuki.as('get', '/api/cabin-tasks/10545')).body.length, 0);
  assert.equal((await daniel.as('delete', `/api/cabin-tasks/${task._id}`)).status, 404);
});
