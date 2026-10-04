const express = require('express');
const mongoose = require('mongoose');
const PortDay = require('../models/PortDay');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { familyLabels } = require('../utils/families');
const { PORT_DAYS } = require('../utils/trip');
const { notify } = require('../utils/push');
const router = express.Router();

const MAX_PLACE = 120;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const NAME_FIELDS = 'firstName lastName family';
const fullName = (u) => `${u.firstName} ${u.lastName}`;

router.use(auth);

router.use(async (req, res, next) => {
  const me = await User.findById(req.userId).select(NAME_FIELDS).lean();
  if (!me) return res.status(401).json({ message: 'יש להתחבר' });
  req.me = me;
  next();
});

// רק ימים שבהם יש שעת חזרה לספינה
router.param('date', (req, res, next, date) => {
  if (!PORT_DAYS.includes(date)) return res.status(404).json({ message: 'זה לא יום נמל' });
  next();
});

// נקודת המפגש וכל הנוסעים, עם מי שכבר על הספינה
const dayResponse = async (date, me) => {
  const [doc, users] = await Promise.all([
    PortDay.findOne({ date }).lean(),
    User.find().select(NAME_FIELDS).sort({ firstName: 1 }).lean(),
  ]);
  const aboard = new Map((doc?.aboard || []).map((a) => [String(a.user), { by: a.by, at: a.at }]));
  return {
    me: String(me._id),
    meeting: doc?.meeting?.place ? doc.meeting : null,
    families: familyLabels(),
    people: users.map((u) => ({
      id: String(u._id),
      name: fullName(u),
      family: u.family || null,
      aboard: aboard.get(String(u._id)) || null,
    })),
  };
};

router.get('/:date', async (req, res) => {
  res.json(await dayResponse(req.params.date, req.me));
});

// קביעת נקודת המפגש (מקום ריק = מחיקה)
router.put('/:date/meeting', async (req, res) => {
  const place = String(req.body.place || '').trim();
  const time = String(req.body.time || '').trim();
  if (place.length > MAX_PLACE) return res.status(400).json({ message: `עד ${MAX_PLACE} תווים` });
  if (time && !TIME_RE.test(time)) return res.status(400).json({ message: 'השעה אינה תקינה' });

  const meeting = place
    ? { place, time, updatedBy: fullName(req.me), updatedAt: new Date() }
    : { place: '', time: '', updatedBy: '', updatedAt: null };
  await PortDay.updateOne({ date: req.params.date }, { $set: { meeting } }, { upsert: true });
  res.json(await dayResponse(req.params.date, req.me));
  if (place) {
    notify({
      except: req.me._id,
      title: `📍 נקודת מפגש · ${req.params.date.split('-').reverse().slice(0, 2).join('.')}`,
      body: `${place}${time ? ` · ${time}` : ''} (עדכן/ה: ${meeting.updatedBy})`,
      url: '/',
    });
  }
});

// סימון שנוסעים חזרו לספינה (או ביטול). אפשר לסמן כמה בבת אחת, למשל את כל המשפחה
router.put('/:date/aboard', async (req, res) => {
  const ids = [...new Set((Array.isArray(req.body.userIds) ? req.body.userIds : []).map(String))]
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!ids.length) return res.status(400).json({ message: 'לא נבחרו נוסעים' });
  const users = await User.find({ _id: { $in: ids } }).select('_id').lean();
  const userIds = users.map((u) => u._id);

  const { date } = req.params;
  await PortDay.updateOne({ date }, { $pull: { aboard: { user: { $in: userIds } } } }, { upsert: true });
  if (req.body.aboard) {
    const by = fullName(req.me);
    await PortDay.updateOne({ date }, { $push: { aboard: { $each: userIds.map((user) => ({ user, by, at: new Date() })) } } });
  }
  res.json(await dayResponse(date, req.me));
});

module.exports = router;
