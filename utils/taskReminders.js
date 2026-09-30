const Task = require('../models/Task');
const { notify } = require('./push');

const HOUR = 60 * 60 * 1000;

// "YYYY-MM-DD" לפי שעון ישראל (בימי ההפלגה ההפרש מהשעה המקומית הוא שעה לכל היותר)
const israelDate = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(ms);

// תזכורת למשימות שתאריך היעד שלהן היום או מחר ועוד לא בוצעו: לאחראי/ת, או לכולם אם אין.
// משימות שכבר עבר זמנן לא מקבלות תזכורת (כדי לא להציף כשמוסיפים משימות ישנות)
const sendTaskReminders = async (now = Date.now()) => {
  const today = israelDate(now);
  const tomorrow = israelDate(now + 24 * HOUR);
  const tasks = await Task.find({ done: false, remindedAt: null, due: { $gte: today, $lte: tomorrow } }).lean();

  for (const t of tasks) {
    notify({
      to: t.assignee ? [t.assignee] : null,
      title: `✅ ${t.due === today ? 'היום' : 'מחר'}: ${t.title}`,
      body: t.note || 'משימה ברשימת המשימות של הטיול',
      url: '/tasks',
    });
  }
  if (tasks.length) await Task.updateMany({ _id: { $in: tasks.map((t) => t._id) } }, { remindedAt: new Date(now) });
  return tasks.length;
};

// בודקים כשהשרת עולה ואחר כך כל שעה. אם השרת רדום (למשל ב-Render בחינם), התזכורת נשלחת כשהוא מתעורר
const startTaskReminders = () => {
  const run = () => sendTaskReminders().catch((err) => console.error('Task reminders failed', err));
  run();
  setInterval(run, HOUR).unref();
};

module.exports = { sendTaskReminders, startTaskReminders, israelDate };
