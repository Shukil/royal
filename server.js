require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

// משתנה חסר בסביבה (למשל ב-Render) — מדפיסים רק את שמות המשתנים הדומים, בלי ערכים
if (!process.env.MONGO_URI) {
  const similar = Object.keys(process.env).filter((k) => /MONGO|JWT|URI|SMTP|CLIENT/i.test(k));
  console.error('MONGO_URI is not set. Similar env var names found:', similar);
}

// מפתח קצר לחתימת טוקני ההתחברות קל יותר לניחוש. מדפיסים רק את האורך, לא את המפתח
if ((process.env.JWT_SECRET || '').length < 32) {
  console.warn(`JWT_SECRET is too short (${(process.env.JWT_SECRET || '').length} characters). Use a random value of at least 32 characters.`);
}

// התחברות למסד הנתונים
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    // המשפחות במסד (בפעם הראשונה נוצרות מהרשימה הקבועה), ושיוך משתמשים ותיקים למשפחה
    await require('./utils/families').setupFamilies();
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
