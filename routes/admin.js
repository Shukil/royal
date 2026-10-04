const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Family = require('../models/Family');
const Event = require('../models/Event');
const EventComment = require('../models/EventComment');
const Task = require('../models/Task');
const PortDay = require('../models/PortDay');
const PushSubscription = require('../models/PushSubscription');
const auth = require('../middleware/auth');
const { loadAdmin, requireAdmin, requireSiteAdmin, SITE_ADMIN_ONLY } = require('../middleware/admin');
const { UNASSIGNED } = require('../utils/cabins');
const { loadFamilies, familyExists, isSiteAdmin, isAdminUser } = require('../utils/families');
const router = express.Router();

// דף ניהול המשפחות: מי בכל משפחה, מי באיזה חדר, ומי מנהל משפחה. רק למנהלים.
// מנהל אתר (ADMIN_EMAILS) מנהל הכול. מנהל משפחה רואה את כל המשפחות, אבל משנה (שם, חדר) ומוחק
// רק את בני המשפחה שלו. הוספה ומחיקה של משפחות, העברה בין משפחות ומינוי מנהלים - רק מנהלי אתר
router.use(auth, loadAdmin, requireAdmin);

const MAX_LABEL = 60;
const MAX_NAME = 40;
const CABIN_RE = /^\d{3,6}$/;
const USER_FIELDS = 'firstName lastName email cabinNumber family isAdmin createdAt';

const userRow = (u) => ({
  id: String(u._id),
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  cabinNumber: u.cabinNumber && u.cabinNumber !== UNASSIGNED ? u.cabinNumber : '',
  family: u.family || null,
  // מנהל אתר (ADMIN_EMAILS) הוא תמיד מנהל, ואי אפשר לבטל אותו מכאן
  siteAdmin: isSiteAdmin(u),
  isAdmin: isAdminUser(u),
});

const overview = async () => {
  const [families, users] = await Promise.all([
    Family.find().sort({ createdAt: 1 }).lean(),
    User.find().select(USER_FIELDS).sort({ firstName: 1, lastName: 1 }).lean(),
  ]);
  return {
    families: families.map((f) => ({ key: f.key, label: f.label })),
    users: users.map(userRow),
  };
};

const cleanLabel = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const labelError = async (label, exceptKey = null) => {
  if (label.length < 2) return 'יש לכתוב שם למשפחה';
  if (label.length > MAX_LABEL) return `שם המשפחה יכול להכיל עד ${MAX_LABEL} תווים`;
  const taken = await Family.findOne({ label, ...(exceptKey ? { key: { $ne: exceptKey } } : {}) }).lean();
  return taken ? 'כבר קיימת משפחה בשם הזה' : null;
};

// כל המשפחות וכל המשתמשים
router.get('/families', async (req, res) => {
  res.json({ ...(await overview()), me: String(req.me._id), siteAdmin: req.isSiteAdmin, myFamily: req.me.family || null });
});

// משפחה חדשה
router.post('/families', requireSiteAdmin, async (req, res) => {
  const label = cleanLabel(req.body.label);
  const invalid = await labelError(label);
  if (invalid) return res.status(400).json({ message: invalid });

  await Family.create({ key: `f-${crypto.randomBytes(4).toString('hex')}`, label });
  await loadFamilies();
  res.status(201).json(await overview());
});

// שינוי שם של משפחה
router.put('/families/:key', requireSiteAdmin, async (req, res) => {
  const label = cleanLabel(req.body.label);
  const invalid = await labelError(label, req.params.key);
  if (invalid) return res.status(400).json({ message: invalid });

  const family = await Family.findOneAndUpdate({ key: req.params.key }, { label });
  if (!family) return res.status(404).json({ message: 'המשפחה לא נמצאה' });
  await loadFamilies();
  res.json(await overview());
});

// מחיקת משפחה: רק אם אין בה אף אחד ואין לה אירועים בלו"ז (למשל הטיסה של המשפחה)
router.delete('/families/:key', requireSiteAdmin, async (req, res) => {
  const { key } = req.params;
  if (!(await Family.exists({ key }))) return res.status(404).json({ message: 'המשפחה לא נמצאה' });
  if (await User.exists({ family: key })) {
    return res.status(400).json({ message: 'אפשר למחוק רק משפחה ריקה. קודם מעבירים את בני המשפחה למשפחה אחרת.' });
  }
  if (await Event.exists({ family: key })) {
    return res.status(400).json({ message: 'למשפחה יש אירועים בלו״ז (למשל טיסה), ולכן אי אפשר למחוק אותה.' });
  }
  await Family.deleteOne({ key });
  await loadFamilies();
  res.json(await overview());
});

// עדכון של משתמש: שם, חדר, משפחה ומנהל משפחה. שולחים רק את השדות שמשתנים
router.patch('/users/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'המשתמש לא נמצא' });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'המשתמש לא נמצא' });
  const wasAdmin = isAdminUser(user);

  // מנהל משפחה: רק בני המשפחה שלו, ובלי לשנות משפחה או מנהלים
  if (!req.isSiteAdmin) {
    if (!req.me.family || user.family !== req.me.family) {
      return res.status(403).json({ message: 'אפשר לעדכן רק את בני המשפחה שלך' });
    }
    if ('family' in req.body || 'isAdmin' in req.body) return res.status(403).json(SITE_ADMIN_ONLY);
  }

  // תיקון שם (למשל טעות בהרשמה). השם לא משפיע על החדר או על המשפחה, שנשמרים בנפרד
  for (const field of ['firstName', 'lastName']) {
    if (!(field in req.body)) continue;
    const value = String(req.body[field] ?? '').trim().replace(/\s+/g, ' ');
    if (!value) return res.status(400).json({ message: 'יש למלא שם פרטי ושם משפחה' });
    if (value.length > MAX_NAME) return res.status(400).json({ message: `השם יכול להכיל עד ${MAX_NAME} תווים` });
    user[field] = value;
  }

  if ('cabinNumber' in req.body) {
    const cabin = String(req.body.cabinNumber ?? '').trim();
    if (cabin && !CABIN_RE.test(cabin)) return res.status(400).json({ message: 'מספר החדר צריך להכיל 3–6 ספרות' });
    user.cabinNumber = cabin || UNASSIGNED;
  }

  if ('family' in req.body) {
    const family = req.body.family || null;
    if (family && !familyExists(family)) return res.status(400).json({ message: 'המשפחה לא נמצאה' });
    user.family = family;
    // מנהל משפחה שייך למשפחה; מי שיצא מכל המשפחות כבר לא מנהל
    if (!family) user.isAdmin = false;
  }

  if ('isAdmin' in req.body) {
    const isAdmin = Boolean(req.body.isAdmin);
    if (isAdmin && !user.family) return res.status(400).json({ message: 'מנהל משפחה צריך להיות משויך למשפחה' });
    user.isAdmin = isAdmin;
  }

  // אי אפשר להוריד את עצמך מהמנהלים (כדי לא לאבד בטעות את הגישה לדף)
  if (String(user._id) === String(req.me._id) && wasAdmin && !isAdminUser(user)) {
    return res.status(400).json({ message: 'אי אפשר להסיר את עצמך מהמנהלים. מנהל אחר יכול לעשות את זה.' });
  }

  await user.save();
  res.json({ user: userRow(user) });
});

// מחיקת משתמש (למשל מי שנרשם בטעות). נמחקים גם האירועים שהוא יצר, המשימות שהוקצו רק לו
// וההרשמה שלו להתראות; הוא יוצא מרשימות המוזמנים ואישורי ההגעה. תגובות שכתב נשארות בשם "משתמש שנמחק".
// אי אפשר למחוק את עצמך או מנהל אתר (ADMIN_EMAILS)
router.delete('/users/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'המשתמש לא נמצא' });
  const user = await User.findById(req.params.id).lean();
  if (!user) return res.status(404).json({ message: 'המשתמש לא נמצא' });
  if (String(user._id) === String(req.me._id)) return res.status(400).json({ message: 'אי אפשר למחוק את עצמך' });
  if (isSiteAdmin(user)) return res.status(400).json({ message: 'אי אפשר למחוק מנהל אתר' });
  // מנהל משפחה מוחק רק בני משפחה שלו, ולא מנהלים אחרים
  if (!req.isSiteAdmin) {
    if (!req.me.family || user.family !== req.me.family) {
      return res.status(403).json({ message: 'אפשר למחוק רק את בני המשפחה שלך' });
    }
    if (isAdminUser(user)) return res.status(403).json({ message: 'רק מנהלי האתר יכולים למחוק מנהל משפחה' });
  }

  const id = user._id;
  const ownEvents = await Event.find({ createdBy: id, systemKey: { $exists: false } }).select('_id').lean();
  const ownEventIds = ownEvents.map((e) => e._id);
  await Promise.all([
    EventComment.deleteMany({ event: { $in: ownEventIds } }),
    Event.deleteMany({ _id: { $in: ownEventIds } }),
    Event.updateMany({}, { $pull: { invitees: id, rsvps: { user: id } } }),
    Task.deleteMany({ assignee: id }),
    PortDay.updateMany({}, { $pull: { aboard: { user: id } } }),
    PushSubscription.deleteMany({ user: id }),
  ]);
  await User.deleteOne({ _id: id });
  res.json({ ok: true });
});

module.exports = router;
