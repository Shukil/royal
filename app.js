const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// האפליקציה עצמה, בלי התחברות למסד ובלי האזנה לפורט (server.js עושה את זה),
// כדי שהבדיקות (tests/) יוכלו לטעון אותה מול מסד זמני
const app = express();

// בלי "X-Powered-By: Express" (לא חושפים במה השרת בנוי), ועם כותרות אבטחה בסיסיות.
// השרת מחזיר רק JSON, אז אין סיבה שדפדפן יציג אותו בתוך מסגרת או יריץ ממנו תוכן
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  });
  next();
});

// השרת ב-Render יושב מאחורי פרוקסי, ובלי זה כל הבקשות נראות כאילו הגיעו מאותה כתובת IP
// (וההגבלה על ניסיונות התחברות הייתה חוסמת את כולם יחד)
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

// רק האתר שלנו יכול לקרוא לשרת מהדפדפן. הכתובות נלקחות מ-CORS_ORIGINS או מ-CLIENT_URL
// (מופרדות בפסיק), ובנוסף שרת הפיתוח המקומי. בלי אף אחד מהם השרת נשאר פתוח, עם אזהרה
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173'];
const configuredOrigins = String(process.env.CORS_ORIGINS || process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);
if (!configuredOrigins.length && process.env.NODE_ENV !== 'test') {
  console.warn('CORS_ORIGINS / CLIENT_URL is not set: the API accepts requests from any website');
}
const allowedOrigins = new Set([...configuredOrigins, ...DEV_ORIGINS]);
app.use(cors({
  origin: configuredOrigins.length ? (origin, done) => done(null, !origin || allowedOrigins.has(origin)) : true,
}));

app.use(express.json({ limit: '100kb' }));

// בדיקת חיים: לשירות שמעיר את השרת ב-Render (שנרדם אחרי רבע שעה בלי בקשות), ולדפדפן שמעיר אותו מראש
app.get('/api/health', (req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503).json({ ok: db, db });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cabin-tasks', require('./routes/cabinTasks'));
app.use('/api/personal-checklist', require('./routes/personalChecklist'));
app.use('/api/events', require('./routes/events'));
app.use('/api/ship-clock', require('./routes/shipClock'));
app.use('/api/port-day', require('./routes/portDay'));
app.use('/api/push', require('./routes/push'));
app.use('/api/plan', require('./routes/plan'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/updates', require('./routes/updates'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/announcements', require('./routes/announcements'));

// שגיאות מכל הנתיבים
app.use(require('./middleware/errors'));

module.exports = app;
