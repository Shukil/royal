const mongoose = require('mongoose');

// הודעה של מנהל לכל המשתתפים ("נפגשים בלובי ב-8:00"). מוצגת בראש האתר עד שעת התפוגה,
// או עד שמנהל מוחק אותה
const announcementSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  until: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdByName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

announcementSchema.index({ until: -1 });

module.exports = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
