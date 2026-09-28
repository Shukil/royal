const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// משתנה חסר בסביבה (למשל ב-Render) — מדפיסים רק את שמות המשתנים הדומים, בלי ערכים
if (!process.env.MONGO_URI) {
  const similar = Object.keys(process.env).filter((k) => /MONGO|JWT|URI|SMTP|CLIENT/i.test(k));
  console.error('MONGO_URI is not set. Similar env var names found:', similar);
}

// התחברות למסד הנתונים
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    // האירועים הקבועים בלו"ז: הטיסות של כל משפחה ותחילת ההפלגה
    await require('./routes/events').seedSystemEvents();
  })
  .catch((err) => console.log('Failed to connect to MongoDB', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cabin-tasks', require('./routes/cabinTasks'));
app.use('/api/personal-checklist', require('./routes/personalChecklist'));
app.use('/api/events', require('./routes/events'));

// שגיאות מכל הנתיבים
app.use(require('./middleware/errors'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
