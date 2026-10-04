require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

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
    // משימות קבועות בימי הטיול, ותזכורות למשימות שמגיע תאריך היעד שלהן
    await require('./routes/tasks').seedSystemTasks();
    require('./utils/taskReminders').startTaskReminders();
  })
  .catch((err) => console.log('Failed to connect to MongoDB', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
