const mongoose = require('mongoose');

// פריט בתוכנית של יום בטיול (משותף לכל המשפחות): מה עושים, מתי, מי מצטרף ומה כבר הוזמן
const planItemSchema = new mongoose.Schema({
  date: { type: String, required: true, index: true }, // "2027-08-21"
  start: { type: String, required: true }, // "HH:MM"
  end: { type: String, default: '' }, // "HH:MM" או ריק
  title: { type: String, required: true },
  who: { type: String, default: '' }, // מי מצטרף, בטקסט חופשי ("כולם", "משפחת זינגר")
  booked: { type: Boolean, default: false }, // כבר הוזמן / יש כרטיסים
  note: { type: String, default: '' },
  link: { type: String, default: '' }, // קישור להזמנה או לאתר
  createdBy: { type: String, default: '' },
  updatedBy: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.PlanItem || mongoose.model('PlanItem', planItemSchema);
