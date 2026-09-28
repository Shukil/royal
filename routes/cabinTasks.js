const express = require('express');
const mongoose = require('mongoose');
const CabinTask = require('../models/CabinTask');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { UNASSIGNED } = require('../utils/cabins');
const router = express.Router();

const MAX_TEXT = 300;
const MAX_NAME = 60;

// כל נתיבי המשימות דורשים התחברות, וכל משתמש עובד רק מול החדר שלו.
// החדר והשם נלקחים מהמסד ולא ממה שהדפדפן שולח
router.use(auth);
router.use(async (req, res, next) => {
  const me = await User.findById(req.userId).select('firstName lastName cabinNumber').lean();
  if (!me) return res.status(401).json({ message: 'יש להתחבר' });
  req.me = { name: `${me.firstName} ${me.lastName}`, cabinNumber: me.cabinNumber || UNASSIGNED };
  next();
});

// כל המשימות של החדר של המשתמש. מספר החדר בנתיב נשאר לתאימות עם הדפדפן,
// אבל תמיד מוחזר החדר שרשום למשתמש במסד (כך שאי אפשר לראות חדר של מישהו אחר)
router.get('/:cabinNumber', async (req, res) => {
  const tasks = await CabinTask.find({ cabinNumber: req.me.cabinNumber }).sort({ createdAt: -1 }).lean();
  res.json(tasks);
});

// יצירת משימה חדשה בחדר של המשתמש
router.post('/', async (req, res) => {
  const text = String(req.body.text || '').trim();
  const assignedTo = String(req.body.assignedTo || '').trim();
  if (!text) return res.status(400).json({ message: 'יש לכתוב את המשימה' });
  if (text.length > MAX_TEXT || assignedTo.length > MAX_NAME) {
    return res.status(400).json({ message: 'המשימה ארוכה מדי' });
  }

  const task = await CabinTask.create({
    cabinNumber: req.me.cabinNumber,
    text,
    assignedTo,
    createdBy: req.me.name,
  });
  res.status(201).json(task);
});

// סימון משימה כבוצעה (או ביטול הסימון). שאר השדות לא ניתנים לשינוי מכאן
router.put('/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'המשימה לא נמצאה' });

  const isCompleted = Boolean(req.body.isCompleted);
  const task = await CabinTask.findOneAndUpdate(
    { _id: req.params.id, cabinNumber: req.me.cabinNumber },
    { isCompleted, completedBy: isCompleted ? req.me.name : '' },
    { returnDocument: 'after' },
  ).lean();
  if (!task) return res.status(404).json({ message: 'המשימה לא נמצאה' });
  res.json(task);
});

module.exports = router;
