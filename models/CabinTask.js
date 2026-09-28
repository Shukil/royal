const mongoose = require('mongoose');

const cabinTaskSchema = new mongoose.Schema({
  cabinNumber: { type: String, required: true },
  text: { type: String, required: true },
  createdBy: { type: String, required: true }, // מי הוסיף את המשימה
  assignedTo: { type: String, default: '' },   // באחריות מי (אופציונלי)
  isCompleted: { type: Boolean, default: false },
  completedBy: { type: String, default: '' },  // מי סימן וי
  createdAt: { type: Date, default: Date.now }
});

cabinTaskSchema.index({ cabinNumber: 1, createdAt: -1 });

module.exports = mongoose.models.CabinTask || mongoose.model('CabinTask', cabinTaskSchema);