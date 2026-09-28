const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

// תגובה לאירוע. parent ריק = תגובה ראשית, אחרת זו תגובה לתגובה (בכל עומק)
const eventCommentSchema = new mongoose.Schema({
  event: { type: ObjectId, ref: 'Event', required: true, index: true },
  author: { type: ObjectId, ref: 'User', required: true },
  parent: { type: ObjectId, ref: 'EventComment', default: null },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.EventComment || mongoose.model('EventComment', eventCommentSchema);
