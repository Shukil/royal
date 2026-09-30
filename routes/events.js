const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventComment = require('../models/EventComment');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { FAMILIES, familyOf } = require('../utils/family');
const { TRIP_RANGE, SYSTEM_EVENTS } = require('../utils/trip');
const { notify } = require('../utils/push');
const router = express.Router();

const TYPES = ['all', 'family', 'personal', 'custom'];
const RSVP = ['yes', 'maybe', 'no'];
const MAX_TITLE = 120;
const MAX_TEXT = 3000;
const MAX_LOCATION = 200;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const NAME_FIELDS = 'firstName lastName';
const NOT_FOUND = { message: 'האירוע לא נמצא' };
// "יוצר" האירועים הקבועים של הטיול
const SYSTEM_AUTHOR = { id: null, name: 'לו״ז הטיול', family: null };
const FAMILY_LABELS = Object.fromEntries(Object.entries(FAMILIES).map(([k, f]) => [k, f.label]));

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const fullName = (u) => (u ? `${u.firstName} ${u.lastName}` : 'משתמש שנמחק');
const person = (u) => ({ id: String(u._id), name: fullName(u), family: familyOf(u.lastName) });
// "17.08 · 19:30" לגוף ההתראה
const whenText = (ev) => [ev.date.split('-').reverse().slice(0, 2).join('.'), ev.allDay ? 'כל היום' : ev.time].filter(Boolean).join(' · ');
const sameId = (a, b) => Boolean(a) && Boolean(b) && String(a._id || a) === String(b._id || b);
// רשימת מזהים ייחודיים ותקינים מתוך קלט מהדפדפן (שאולי אינו מערך בכלל)
const idList = (value) => [...new Set((Array.isArray(value) ? value : []).map(String))].filter(isId);

router.use(auth);

// טוען את המשתמש המחובר לכל בקשה
router.use(async (req, res, next) => {
  const me = await User.findById(req.userId).select(NAME_FIELDS).lean();
  if (!me) return res.status(401).json({ message: 'יש להתחבר' });
  req.me = me;
  req.myFamily = familyOf(me.lastName);
  next();
});

// מי רשאי לראות את האירוע (ומי מוזמן אליו)
const canSee = (event, me, myFamily) => {
  if (event.type === 'all') return true;
  if (sameId(event.createdBy, me._id)) return true;
  if (event.type === 'family') return Boolean(myFamily) && event.family === myFamily;
  if (event.type === 'custom') return event.invitees.some((i) => sameId(i, me._id));
  return false;
};

// רשימת המוזמנים המלאה לפי סוג האירוע
const audienceOf = async (event) => {
  if (event.type === 'personal') return event.createdBy ? [event.createdBy] : [];
  if (event.type === 'custom') {
    const ids = [event.createdBy?._id, ...event.invitees.map((i) => i._id || i)].filter(Boolean);
    return User.find({ _id: { $in: ids } }).select(NAME_FIELDS).lean();
  }
  const users = await User.find().select(NAME_FIELDS).lean();
  return event.type === 'family' ? users.filter((u) => familyOf(u.lastName) === event.family) : users;
};

const summary = (event, me) => {
  const counts = { yes: 0, maybe: 0, no: 0 };
  let myRsvp = null;
  for (const r of event.rsvps) {
    counts[r.status] += 1;
    if (sameId(r.user, me._id)) myRsvp = r.status;
  }
  return {
    id: String(event._id),
    title: event.title,
    date: event.date,
    allDay: Boolean(event.allDay),
    time: event.time || '',
    endTime: event.endTime || '',
    location: event.location || '',
    type: event.type,
    family: event.family,
    familyLabel: event.family ? FAMILY_LABELS[event.family] ?? null : null,
    isSystem: Boolean(event.systemKey),
    createdBy: event.createdBy ? person(event.createdBy) : SYSTEM_AUTHOR,
    isMine: sameId(event.createdBy, me._id),
    myRsvp,
    counts,
  };
};

// בתוך כל יום: אירועים של יום שלם קודם, ואחריהם לפי שעה
const byDateTime = (a, b) =>
  a.date.localeCompare(b.date) ||
  Number(b.allDay) - Number(a.allDay) ||
  (a.time || '').localeCompare(b.time || '') ||
  new Date(a.createdAt) - new Date(b.createdAt);

// ===== בדיקת התנגשויות בלו"ז =====
// אירוע בלי שעת סיום נחשב כשעה אחת; אירוע של יום שלם תופס את כל היום
const DEFAULT_MINUTES = 60;
const toMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const spanOf = (ev) => {
  if (ev.allDay) return [0, 24 * 60];
  const start = toMinutes(ev.time);
  return [start, ev.endTime ? toMinutes(ev.endTime) : start + DEFAULT_MINUTES];
};
const overlaps = (a, b) => a[0] < b[1] && b[0] < a[1];
const whenLabel = (ev) => (ev.allDay ? 'יום שלם' : ev.endTime ? `${ev.time}–${ev.endTime}` : ev.time);

// מחזיר את המשתמשים שיש להם כבר אירוע בלו"ז שחופף לזמן המבוקש.
// אירועים שהמשתמש סימן בהם "לא מגיע" לא נחשבים. שם האירוע לא נחשף (הוא עשוי להיות אישי)
const busyInvitees = async (users, slot) => {
  if (!users.length) return [];
  const wanted = spanOf(slot);
  const overlapping = (await Event.find({ date: slot.date }).lean()).filter((ev) => overlaps(spanOf(ev), wanted));
  return users
    .map((u) => {
      const family = familyOf(u.lastName);
      const clashes = overlapping.filter(
        (ev) => canSee(ev, u, family) && !ev.rsvps.some((r) => sameId(r.user, u._id) && r.status === 'no'),
      );
      return clashes.length ? { ...person(u), times: clashes.map(whenLabel) } : null;
    })
    .filter(Boolean);
};

// אירוע לכולם או משפחתי "מזמין" קבוצה שלמה, אז בודקים אותו מול האירועים המשותפים הקיימים:
// אירוע לכולם מתנגש בכל אירוע לכולם ובכל אירוע משפחתי; אירוע משפחתי מתנגש באירוע לכולם
// ובאירוע של אותה משפחה. אירועים אישיים של אחרים לא חוסמים אירועים קבוצתיים
const sharedConflicts = async (slot, type, family, myFamily) => {
  const wanted = spanOf(slot);
  const existing = await Event.find({ date: slot.date, type: { $in: ['all', 'family'] } }).lean();
  return existing
    .filter((ev) => overlaps(spanOf(ev), wanted) && (ev.type === 'all' || type === 'all' || ev.family === family))
    .map((ev) => ({
      id: String(ev._id),
      group: ev.type === 'all' ? 'אירוע לכולם' : FAMILY_LABELS[ev.family] || 'אירוע משפחתי',
      // את שם האירוע מציגים רק אם המשתמש מוזמן אליו בעצמו
      title: ev.type === 'all' || ev.family === myFamily ? ev.title : null,
      when: whenLabel(ev),
    }));
};

const busyMessage = (busy) =>
  `לא ניתן לבצע את ההזמנה: ל${busy.map((b) => b.name).join(', ל')} כבר יש אירוע בלו״ז בזמן הזה`;

// בדיקת זמינות לפני הזמנה (הטופס קורא לזה כשמסמנים מוזמן)
router.post('/availability', async (req, res) => {
  const { date, allDay, time, endTime } = req.body;
  if (!DATE_RE.test(date || '') || (!allDay && !TIME_RE.test(time || ''))) {
    return res.status(400).json({ message: 'יש לבחור תאריך ושעה לפני בחירת מוזמנים' });
  }
  const slot = {
    date,
    allDay: Boolean(allDay),
    time: allDay ? '' : time,
    endTime: allDay || !TIME_RE.test(endTime || '') ? '' : endTime,
  };
  const users = await User.find({ _id: { $in: idList(req.body.userIds) } }).select(NAME_FIELDS).lean();
  res.json({ busy: await busyInvitees(users, slot) });
});

// בני משפחה ומשתמשים (לבחירת מוזמנים), וטווח התאריכים המותר
router.get('/people', async (req, res) => {
  const users = await User.find().select(NAME_FIELDS).sort({ firstName: 1 }).lean();
  res.json({ range: TRIP_RANGE, me: person(req.me), families: FAMILY_LABELS, people: users.map(person) });
});

// כל האירועים שהמשתמש המחובר מוזמן אליהם
router.get('/', async (req, res) => {
  const or = [{ type: 'all' }, { createdBy: req.me._id }, { type: 'custom', invitees: req.me._id }];
  if (req.myFamily) or.push({ type: 'family', family: req.myFamily });

  const events = await Event.find({ $or: or }).populate('createdBy', NAME_FIELDS).lean();
  events.sort(byDateTime);
  res.json({ events: events.map((e) => summary(e, req.me)), myFamily: req.myFamily, range: TRIP_RANGE });
});

// בדיקת השדות של אירוע חדש. מחזיר הודעת שגיאה, או null אם הכול תקין
const validateEvent = ({ title, description, location, date, allDay, time, endTime, type }, myFamily) => {
  if (!title) return 'יש לתת לאירוע שם';
  if (title.length > MAX_TITLE) return `שם האירוע יכול להכיל עד ${MAX_TITLE} תווים`;
  if (description.length > MAX_TEXT) return 'התיאור ארוך מדי';
  if (location.length > MAX_LOCATION) return 'המיקום ארוך מדי';
  if (!DATE_RE.test(date)) return 'יש לבחור תאריך';
  if (date < TRIP_RANGE.min || date > TRIP_RANGE.max) return 'אפשר להוסיף אירועים רק בין 29.07.2027 ל-22.08.2027';
  if (!allDay && !TIME_RE.test(time)) return 'יש לבחור שעה, או לסמן אירוע של יום שלם';
  if (endTime && (!TIME_RE.test(endTime) || endTime <= time)) return 'שעת הסיום צריכה להיות אחרי שעת ההתחלה';
  if (!TYPES.includes(type)) return 'סוג האירוע אינו תקין';
  if (type === 'family' && !myFamily) return 'שם המשפחה שלך לא משויך למשפחה, אז אי אפשר ליצור אירוע משפחתי';
  return null;
};

// יצירת אירוע
router.post('/', async (req, res) => {
  const allDay = Boolean(req.body.allDay);
  const fields = {
    title: String(req.body.title || '').trim(),
    description: String(req.body.description || '').trim(),
    location: String(req.body.location || '').trim(),
    date: String(req.body.date || ''),
    allDay,
    time: allDay ? '' : String(req.body.time || ''),
    endTime: allDay ? '' : String(req.body.endTime || ''),
    type: req.body.type,
  };
  const invalid = validateEvent(fields, req.myFamily);
  if (invalid) return res.status(400).json({ message: invalid });

  const { type } = fields;
  if (type === 'all' || type === 'family') {
    const family = type === 'family' ? req.myFamily : null;
    const clashes = await sharedConflicts(fields, type, family, req.myFamily);
    if (clashes.length) {
      return res.status(409).json({
        code: 'SHARED_CONFLICT',
        message: 'לא ניתן לבצע את ההזמנה: בזמן הזה כבר קיים אירוע שכולל את המוזמנים',
        clashes,
      });
    }
  }

  let invitees = [];
  if (type === 'custom') {
    const ids = idList(req.body.invitees).filter((id) => !sameId(id, req.me._id));
    if (!ids.length) return res.status(400).json({ message: 'יש לבחור לפחות מוזמן אחד' });
    const users = await User.find({ _id: { $in: ids } }).select(NAME_FIELDS).lean();
    if (users.length !== ids.length) return res.status(400).json({ message: 'חלק מהמוזמנים לא נמצאו' });

    const busy = await busyInvitees(users, fields);
    if (busy.length) return res.status(409).json({ code: 'INVITEE_BUSY', message: busyMessage(busy), busy });
    invitees = ids;
  }

  const event = await Event.create({
    ...fields,
    family: type === 'family' ? req.myFamily : null,
    createdBy: req.me._id,
    invitees,
    // יוצר האירוע מגיע כברירת מחדל
    rsvps: [{ user: req.me._id, status: 'yes' }],
  });
  res.status(201).json({ id: String(event._id) });

  // התראה לכל המוזמנים (חוץ ממי שיצר)
  const audience = await audienceOf(event);
  notify({
    to: audience.map((u) => u._id),
    except: req.me._id,
    title: `📅 אירוע חדש: ${event.title}`,
    body: `${whenText(event)} · הוסיף/ה: ${fullName(req.me)}`,
    url: `/schedule/${event._id}`,
  });
});

// טוען אירוע ומוודא שהמשתמש מוזמן אליו. אם לא, עונה 404 ומחזיר null
const loadEvent = async (req, res) => {
  const event = isId(req.params.id)
    ? await Event.findById(req.params.id).populate('createdBy', NAME_FIELDS).populate('invitees', NAME_FIELDS)
    : null;
  if (!event || !canSee(event, req.me, req.myFamily)) {
    res.status(404).json(NOT_FOUND);
    return null;
  }
  return event;
};

// פרטי האירוע המלאים: מוזמנים, אישורי הגעה ותגובות
router.get('/:id', async (req, res) => {
  const event = await loadEvent(req, res);
  if (!event) return;

  const [audience, comments] = await Promise.all([
    audienceOf(event),
    EventComment.find({ event: event._id }).sort({ createdAt: 1 }).populate('author', NAME_FIELDS).lean(),
  ]);
  const rsvpByUser = Object.fromEntries(event.rsvps.map((r) => [String(r.user), r.status]));

  res.json({
    ...summary(event, req.me),
    description: event.description,
    guests: audience.map((u) => ({ ...person(u), rsvp: rsvpByUser[String(u._id)] || null })),
    comments: comments.map((c) => ({
      id: String(c._id),
      parent: c.parent ? String(c.parent) : null,
      text: c.text,
      author: person(c.author || { _id: '', firstName: 'משתמש', lastName: 'שנמחק' }),
      createdAt: c.createdAt,
    })),
  });
});

// אישור הגעה
router.put('/:id/rsvp', async (req, res) => {
  const { status } = req.body;
  if (!RSVP.includes(status)) return res.status(400).json({ message: 'אישור ההגעה אינו תקין' });
  const event = await loadEvent(req, res);
  if (!event) return;

  const existing = event.rsvps.find((r) => sameId(r.user, req.me._id));
  if (existing) {
    existing.status = status;
    existing.updatedAt = new Date();
  } else {
    event.rsvps.push({ user: req.me._id, status });
  }
  await event.save();
  res.json({ myRsvp: status });
});

// ביטול אישור הגעה (חוזר למצב "טרם אישרת")
router.delete('/:id/rsvp', async (req, res) => {
  const event = await loadEvent(req, res);
  if (!event) return;

  event.rsvps = event.rsvps.filter((r) => !sameId(r.user, req.me._id));
  await event.save();
  res.json({ myRsvp: null });
});

// תגובה או תגובה לתגובה
router.post('/:id/comments', async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ message: 'לא ניתן לשלוח תגובה ריקה' });
  if (text.length > MAX_TEXT) return res.status(400).json({ message: 'התגובה ארוכה מדי' });

  const event = await loadEvent(req, res);
  if (!event) return;

  let parent = null;
  if (req.body.parentId) {
    const found = isId(req.body.parentId)
      ? await EventComment.exists({ _id: req.body.parentId, event: event._id })
      : null;
    if (!found) return res.status(400).json({ message: 'התגובה המקורית לא נמצאה' });
    parent = found._id;
  }

  const comment = await EventComment.create({ event: event._id, author: req.me._id, parent, text });
  res.status(201).json({
    id: String(comment._id),
    parent: parent ? String(parent) : null,
    text: comment.text,
    author: person(req.me),
    createdAt: comment.createdAt,
  });
});

// מחיקת אירוע (רק מי שיצר אותו; את האירועים הקבועים אי אפשר למחוק)
router.delete('/:id', async (req, res) => {
  const event = await loadEvent(req, res);
  if (!event) return;
  if (event.systemKey) return res.status(403).json({ message: 'זה אירוע קבוע של הטיול ואי אפשר למחוק אותו' });
  if (!sameId(event.createdBy, req.me._id)) return res.status(403).json({ message: 'רק מי שיצר את האירוע יכול למחוק אותו' });

  const audience = await audienceOf(event);
  await Promise.all([EventComment.deleteMany({ event: event._id }), event.deleteOne()]);
  res.json({ ok: true });
  notify({
    to: audience.map((u) => u._id),
    except: req.me._id,
    title: `❌ אירוע בוטל: ${event.title}`,
    body: `${whenText(event)} · ביטל/ה: ${fullName(req.me)}`,
    url: '/schedule',
  });
});

// יוצר (או מעדכן) את האירועים הקבועים של הטיול: הטיסות של כל משפחה ותחילת ההפלגה.
// אישורי ההגעה והתגובות עליהם נשמרים בין הפעלות של השרת
const seedSystemEvents = () =>
  Event.bulkWrite(
    SYSTEM_EVENTS.map(({ systemKey, ...fields }) => ({
      updateOne: {
        filter: { systemKey },
        update: {
          $set: { ...fields, allDay: false },
          $setOnInsert: { systemKey, createdBy: null, invitees: [], rsvps: [] },
        },
        upsert: true,
      },
    })),
  );

module.exports = router;
module.exports.seedSystemEvents = seedSystemEvents;
