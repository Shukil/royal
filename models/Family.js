const mongoose = require('mongoose');

// משפחה בטיול. key הוא מזהה קבוע (singer, agayev, או אקראי למשפחה שנוספה מדף הניהול),
// והוא מה שנשמר אצל המשתמשים ובאירועים המשפחתיים. את השם (label) אפשר לשנות
const familySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  label: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Family || mongoose.model('Family', familySchema);
