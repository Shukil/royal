const mongoose = require('mongoose');

// משימה משותפת עם תאריך יעד ואחראי (לפני הטיול ובימי הטיול)
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  due: { type: String, required: true, index: true }, // "YYYY-MM-DD"
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = כולם
  note: { type: String, default: '' },
  done: { type: Boolean, default: false },
  doneBy: { type: String, default: '' },
  doneAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = משימה קבועה של הטיול
  createdByName: { type: String, default: '' },
  systemKey: { type: String, unique: true, sparse: true },
  remindedAt: { type: Date, default: null }, // מתי נשלחה תזכורת (כדי לא לשלוח פעמיים)
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Task || mongoose.model('Task', taskSchema);
