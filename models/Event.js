const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

// אירוע בלו"ז.
// type: all = כולם, family = המשפחה של יוצר האירוע, personal = רק היוצר, custom = היוצר והמוזמנים
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  location: { type: String, default: '', trim: true },
  // תאריך ושעות נשמרים כטקסט בשעון המקומי של היעד, כדי שלא יזוזו בגלל אזורי זמן.
  // באירוע של יום שלם time ו-endTime ריקים
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  allDay: { type: Boolean, default: false },
  time: { type: String, default: '', match: /^(\d{2}:\d{2})?$/ },
  endTime: { type: String, default: '', match: /^(\d{2}:\d{2})?$/ },
  type: { type: String, enum: ['all', 'family', 'personal', 'custom'], required: true },
  // סוג ההזמנה על הספינה: מסעדה, מופע או פעילות (general = אירוע רגיל), ומספר האישור של ההזמנה
  category: { type: String, enum: ['general', 'dining', 'show', 'activity'], default: 'general' },
  confirmation: { type: String, default: '', trim: true },
  family: { type: String, default: null },
  // ריק באירועים הקבועים של הטיול (טיסות, תחילת ההפלגה)
  createdBy: { type: ObjectId, ref: 'User', default: null },
  systemKey: { type: String, unique: true, sparse: true },
  invitees: [{ type: ObjectId, ref: 'User' }],
  rsvps: [{
    user: { type: ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['yes', 'maybe', 'no'], required: true },
    updatedAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
});

// בדיקות ההתנגשות שולפות את כל האירועים של יום מסוים; רשימת הלו"ז מסננת לפי סוג, משפחה ומוזמנים
eventSchema.index({ date: 1 });
eventSchema.index({ type: 1, family: 1 });
eventSchema.index({ invitees: 1 });

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
