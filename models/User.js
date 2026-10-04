const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  cabinNumber: { type: String, default: 'לא שויך' },
  // המפתח של המשפחה (models/Family.js), או null. נקבע בהרשמה ומשתנה בדף ניהול המשפחות.
  // אצל משתמשים מלפני שהשדה נוסף הוא חסר, ו-utils/families.js ממלא אותו פעם אחת
  family: { type: String, default: undefined },
  // מנהל משפחה: רואה את כל דפי המנהלים (בנוסף למנהלי האתר שב-ADMIN_EMAILS)
  isAdmin: { type: Boolean, default: false },

  // צ'ק ליסט אישי. כל עוד המשתמש לא ערך אותו, השדה ריק ומוצגת רשימת ברירת המחדל
  personalChecklist: {
    type: [{ text: { type: String, required: true }, done: { type: Boolean, default: false } }],
    default: undefined,
  },

  // שחזור סיסמה
  resetTokenHash: String,
  resetTokenExpires: Date,

  // עולה בכל החלפת סיסמה, וכך מנתק את כל המכשירים האחרים (middleware/auth.js)
  tokenVersion: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now }
});

userSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
