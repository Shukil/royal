const express = require('express');
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { loadAdmin, requireAdmin } = require('../middleware/admin');
const { notify } = require('../utils/push');
const router = express.Router();

// הודעות של מנהלים לכל המשתתפים. כולם רואים את ההודעות הפעילות; רק מנהלים מפרסמים ומוחקים
const MAX_TEXT = 300;
const HOURS = [2, 6, 12, 24, 48, 72];
const HOUR = 60 * 60 * 1000;

const toAnnouncement = (a) => ({
  id: String(a._id),
  text: a.text,
  until: a.until,
  by: a.createdByName,
  createdAt: a.createdAt,
});

router.use(auth, loadAdmin);

// ההודעות הפעילות, מהחדשה לישנה
router.get('/', async (req, res) => {
  const list = await Announcement.find({ until: { $gt: new Date() } }).sort({ createdAt: -1 }).limit(5).lean();
  res.json({ announcements: list.map(toAnnouncement), hours: HOURS });
});

// הודעה חדשה, עם התראה לטלפון לכל מי שהפעיל התראות
router.post('/', requireAdmin, async (req, res) => {
  const text = String(req.body.text || '').trim();
  const hours = Number(req.body.hours);
  if (!text) return res.status(400).json({ message: 'יש לכתוב את ההודעה' });
  if (text.length > MAX_TEXT) return res.status(400).json({ message: `ההודעה יכולה להכיל עד ${MAX_TEXT} תווים` });
  if (!HOURS.includes(hours)) return res.status(400).json({ message: 'יש לבחור כמה זמן ההודעה תוצג' });

  const me = await User.findById(req.userId).select('firstName lastName').lean();
  const name = `${me.firstName} ${me.lastName}`;
  const announcement = await Announcement.create({
    text,
    until: new Date(Date.now() + hours * HOUR),
    createdBy: me._id,
    createdByName: name,
  });
  res.status(201).json({ announcement: toAnnouncement(announcement) });

  notify({ except: me._id, title: `📢 הודעה מ${me.firstName}`, body: text, url: '/' });
});

// הסרת הודעה לפני הזמן
router.delete('/:id', requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'ההודעה לא נמצאה' });
  const deleted = await Announcement.findByIdAndDelete(req.params.id).lean();
  if (!deleted) return res.status(404).json({ message: 'ההודעה לא נמצאה' });
  res.json({ ok: true });
});

module.exports = router;
