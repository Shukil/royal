const express = require('express');
const mongoose = require('mongoose');
const PlanItem = require('../models/PlanItem');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { PLAN_DAYS } = require('../utils/trip');
const router = express.Router();

const MAX_TITLE = 120;
const MAX_WHO = 80;
const MAX_NOTE = 500;
const MAX_LINK = 300;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const NOT_FOUND = { message: 'הפריט לא נמצא' };

const toItem = (i) => ({
  id: String(i._id),
  date: i.date,
  start: i.start,
  end: i.end,
  title: i.title,
  who: i.who,
  booked: i.booked,
  note: i.note,
  link: i.link,
  createdBy: i.createdBy,
  updatedBy: i.updatedBy,
  updatedAt: i.updatedAt,
});

router.use(auth);

router.use(async (req, res, next) => {
  const me = await User.findById(req.userId).select('firstName lastName').lean();
  if (!me) return res.status(401).json({ message: 'יש להתחבר' });
  req.myName = `${me.firstName} ${me.lastName}`;
  next();
});

router.param('date', (req, res, next, date) => {
  if (!PLAN_DAYS.includes(date)) return res.status(404).json({ message: 'אין תוכנית ליום הזה' });
  next();
});

// בדיקת השדות. מחזיר { fields } או { error }
const readFields = (body) => {
  const fields = {
    start: String(body.start || ''),
    end: String(body.end || ''),
    title: String(body.title || '').trim(),
    who: String(body.who || '').trim(),
    booked: Boolean(body.booked),
    note: String(body.note || '').trim(),
    link: String(body.link || '').trim(),
  };
  if (!fields.title) return { error: 'יש לכתוב מה עושים' };
  if (!TIME_RE.test(fields.start)) return { error: 'יש לבחור שעת התחלה' };
  if (fields.end && !TIME_RE.test(fields.end)) return { error: 'שעת הסיום אינה תקינה' };
  if (fields.end && fields.end <= fields.start) return { error: 'שעת הסיום צריכה להיות אחרי שעת ההתחלה' };
  if (fields.title.length > MAX_TITLE || fields.who.length > MAX_WHO || fields.note.length > MAX_NOTE) {
    return { error: 'אחד השדות ארוך מדי' };
  }
  if (fields.link && (fields.link.length > MAX_LINK || !/^https?:\/\//.test(fields.link))) {
    return { error: 'הקישור צריך להתחיל ב-https://' };
  }
  return { fields };
};

const dayItems = async (date) =>
  (await PlanItem.find({ date }).sort({ start: 1, end: 1 }).lean()).map(toItem);

// כל הפריטים בכל הימים (לסקירה ולחיפוש)
router.get('/', async (req, res) => {
  const items = await PlanItem.find().sort({ date: 1, start: 1 }).lean();
  res.json({ days: PLAN_DAYS, items: items.map(toItem) });
});

router.get('/:date', async (req, res) => {
  res.json({ items: await dayItems(req.params.date) });
});

router.post('/:date', async (req, res) => {
  const { fields, error } = readFields(req.body);
  if (error) return res.status(400).json({ message: error });
  await PlanItem.create({ ...fields, date: req.params.date, createdBy: req.myName, updatedBy: req.myName });
  res.status(201).json({ items: await dayItems(req.params.date) });
});

// התוכנית משותפת, אז כל אחד יכול לעדכן ולמחוק (ורואים מי עדכן אחרון)
router.put('/:date/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json(NOT_FOUND);
  const { fields, error } = readFields(req.body);
  if (error) return res.status(400).json({ message: error });
  const item = await PlanItem.findOneAndUpdate(
    { _id: req.params.id, date: req.params.date },
    { ...fields, updatedBy: req.myName, updatedAt: new Date() },
  );
  if (!item) return res.status(404).json(NOT_FOUND);
  res.json({ items: await dayItems(req.params.date) });
});

router.delete('/:date/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json(NOT_FOUND);
  await PlanItem.deleteOne({ _id: req.params.id, date: req.params.date });
  res.json({ items: await dayItems(req.params.date) });
});

module.exports = router;
