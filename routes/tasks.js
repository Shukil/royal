const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { familyOf } = require('../utils/family');
const { SYSTEM_TASKS } = require('../utils/trip');
const router = express.Router();

const MAX_TITLE = 150;
const MAX_NOTE = 500;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NOT_FOUND = { message: 'המשימה לא נמצאה' };
const fullName = (u) => `${u.firstName} ${u.lastName}`;

const toTask = (t) => ({
  id: String(t._id),
  title: t.title,
  due: t.due,
  assignee: t.assignee ? String(t.assignee) : null,
  note: t.note,
  done: t.done,
  doneBy: t.doneBy,
  doneAt: t.doneAt,
  createdBy: t.createdBy ? String(t.createdBy) : null,
  createdByName: t.createdByName || 'הטיול',
  system: Boolean(t.systemKey),
});

router.use(auth);

router.use(async (req, res, next) => {
  const me = await User.findById(req.userId).select('firstName lastName').lean();
  if (!me) return res.status(401).json({ message: 'יש להתחבר' });
  req.me = me;
  next();
});

const listResponse = async (me) => {
  const [tasks, users] = await Promise.all([
    Task.find().sort({ due: 1, createdAt: 1 }).lean(),
    User.find().select('firstName lastName').sort({ firstName: 1 }).lean(),
  ]);
  return {
    me: String(me._id),
    people: users.map((u) => ({ id: String(u._id), name: fullName(u), family: familyOf(u.lastName) })),
    tasks: tasks.map(toTask),
  };
};

// בדיקת השדות הניתנים לעריכה. מחזיר { fields } או { error }
const readFields = async (body) => {
  const fields = {
    title: String(body.title || '').trim(),
    due: String(body.due || ''),
    note: String(body.note || '').trim(),
    assignee: null,
  };
  if (!fields.title) return { error: 'יש לכתוב את המשימה' };
  if (fields.title.length > MAX_TITLE || fields.note.length > MAX_NOTE) return { error: 'המשימה ארוכה מדי' };
  if (!DATE_RE.test(fields.due) || Number.isNaN(Date.parse(fields.due))) return { error: 'יש לבחור תאריך יעד' };
  if (body.assignee) {
    if (!mongoose.Types.ObjectId.isValid(body.assignee) || !(await User.exists({ _id: body.assignee }))) {
      return { error: 'האחראי/ת לא נמצא/ה' };
    }
    fields.assignee = body.assignee;
  }
  return { fields };
};

router.get('/', async (req, res) => {
  res.json(await listResponse(req.me));
});

router.post('/', async (req, res) => {
  const { fields, error } = await readFields(req.body);
  if (error) return res.status(400).json({ message: error });
  await Task.create({ ...fields, createdBy: req.me._id, createdByName: fullName(req.me) });
  res.status(201).json(await listResponse(req.me));
});

// סימון כבוצעה, או עריכת המשימה. כל אחד יכול, כי הרשימה משותפת
router.put('/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json(NOT_FOUND);
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json(NOT_FOUND);

  if ('done' in req.body) {
    task.done = Boolean(req.body.done);
    task.doneBy = task.done ? fullName(req.me) : '';
    task.doneAt = task.done ? new Date() : undefined;
  }
  if ('title' in req.body) {
    const { fields, error } = await readFields(req.body);
    if (error) return res.status(400).json({ message: error });
    // תאריך או אחראי חדשים = תזכורת חדשה
    if (fields.due !== task.due || String(fields.assignee) !== String(task.assignee)) task.remindedAt = null;
    Object.assign(task, fields);
  }
  await task.save();
  res.json(await listResponse(req.me));
});

// מחיקה: רק מי שיצר את המשימה. את המשימות הקבועות של הטיול אי אפשר למחוק
router.delete('/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json(NOT_FOUND);
  const task = await Task.findById(req.params.id).lean();
  if (!task) return res.status(404).json(NOT_FOUND);
  if (task.systemKey) return res.status(403).json({ message: 'זו משימה קבועה של הטיול. אפשר לסמן אותה כבוצעה' });
  if (String(task.createdBy) !== String(req.me._id)) {
    return res.status(403).json({ message: 'רק מי שהוסיף את המשימה יכול למחוק אותה' });
  }
  await Task.deleteOne({ _id: task._id });
  res.json(await listResponse(req.me));
});

// יוצר את המשימות הקבועות של הטיול בפעם הראשונה בלבד, כך שסימון ועריכה נשמרים
const seedSystemTasks = () =>
  Task.bulkWrite(
    SYSTEM_TASKS.map(({ systemKey, ...fields }) => ({
      updateOne: { filter: { systemKey }, update: { $setOnInsert: { systemKey, ...fields } }, upsert: true },
    })),
  );

module.exports = router;
module.exports.seedSystemTasks = seedSystemTasks;
