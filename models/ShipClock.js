const mongoose = require('mongoose');

// שעון הספינה ביום מסוים בהפלגה, ביחס לשעה המקומית בנמל.
// משותף לכל המשפחות: מי שרואה בתוכנייה היומית שהספינה בשעה אחרת מעדכן, וכולם רואים
const shipClockSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // "2027-08-17"
  shift: { type: Number, required: true, min: -2, max: 2 }, // שעות מול השעה המקומית: 1 = הספינה שעה קדימה
  updatedBy: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.ShipClock || mongoose.model('ShipClock', shipClockSchema);
