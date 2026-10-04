// עזרים לבדיקות: מסד MongoDB זמני בזיכרון, והאפליקציה עצמה (app.js) בלי שרת אמיתי.
// כל קובץ בדיקות רץ בתהליך נפרד, עם מסד נקי משלו
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.INVITE_CODE = 'Odyssey2027';
process.env.CLIENT_URL = 'https://cruise.example';
process.env.ADMIN_EMAILS = 'admin@test.com';
delete process.env.SMTP_HOST;
delete process.env.VAPID_PUBLIC_KEY;

const { before, after } = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../app');

let mongo;
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await require('../utils/families').setupFamilies();
  await require('../routes/events').seedSystemEvents();
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

const api = () => request(app);

let counter = 0;
// נרשם ומתחבר. מחזיר את הטוקן, פרטי המשתמש ופונקציה לבקשות מחוברות
const signUp = async ({ firstName = 'בודק', lastName = 'בדיקות', email, password = 'secret123' } = {}) => {
  const mail = email || `user${++counter}@test.com`;
  const reg = await api().post('/api/auth/register').send({ firstName, lastName, email: mail, password, inviteCode: 'Odyssey2027' });
  if (reg.status !== 201) throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.body)}`);
  const login = await api().post('/api/auth/login').send({ email: mail, password });
  if (login.status !== 200) throw new Error(`login failed: ${login.status}`);
  const { token, user } = login.body;
  const as = (method, url) => api()[method](url).set('Authorization', `Bearer ${token}`);
  return { token, user, email: mail, password, as };
};

module.exports = { api, signUp };
