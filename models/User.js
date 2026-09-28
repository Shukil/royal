const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  cabinNumber: { type: String, default: 'לא שויך' },

  // צ'ק ליסט אישי. כל עוד המשתמש לא ערך אותו, השדה ריק ומוצגת רשימת ברירת המחדל
  personalChecklist: {
    type: [{ text: { type: String, required: true }, done: { type: Boolean, default: false } }],
    default: undefined,
  },

  // שחזור סיסמה
  resetTokenHash: String,
  resetTokenExpires: Date,

  createdAt: { type: Date, default: Date.now }
});

userSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
