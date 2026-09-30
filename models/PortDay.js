const mongoose = require('mongoose');

// יום נמל, משותף לכל המשפחות: נקודת המפגש, ומי כבר חזר לספינה
const portDaySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // "2027-08-17"
  meeting: {
    place: { type: String, default: '' },
    time: { type: String, default: '' }, // "HH:MM" או ריק
    updatedBy: { type: String, default: '' },
    updatedAt: Date,
  },
  aboard: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    by: { type: String, default: '' }, // מי סימן (אפשר לסמן גם בן משפחה)
    at: { type: Date, default: Date.now },
  }],
});

module.exports = mongoose.models.PortDay || mongoose.model('PortDay', portDaySchema);
