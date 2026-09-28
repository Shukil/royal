const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

const MAX_ITEMS = 100;
const MAX_TEXT = 200;

// הרשימה שכל נוסע מקבל עד שהוא עורך אותה בפעם הראשונה
const DEFAULT_ITEMS = [
  'דרכון (בתוקף 6 חודשים לפחות)',
  'כרטיס עלייה למטוס ולאונייה (SetSail Pass)',
  'ביטוח נסיעות',
  'תרופות קבועות + כדורים נגד בחילת ים',
  'משקפי שמש וקרם הגנה',
  'בגדי ים וכפכפים',
  'בגד ערב לארוחות החגיגיות',
  'מתאם חשמל אירופאי ומטען נייד',
  'יורו במזומן לטיפים ולרומא',
];

const toResponse = (user) => ({
  items: user.personalChecklist
    ? user.personalChecklist.map((i) => ({ id: i._id, text: i.text, done: i.done }))
    : DEFAULT_ITEMS.map((text, idx) => ({ id: `default-${idx}`, text, done: false })),
  isDefault: !user.personalChecklist,
});

// קורא/מעדכן רק את שדה הרשימה (בלי לטעון סיסמה ושאר פרטי המשתמש)
const FIELD = 'personalChecklist';
const respond = (res, user) =>
  user ? res.json(toResponse(user)) : res.status(401).json({ message: 'יש להתחבר' });

router.use(auth);

// הרשימה של המשתמש המחובר
router.get('/', async (req, res) => {
  respond(res, await User.findById(req.userId).select(FIELD).lean());
});

// שמירת הרשימה כולה (הוספה, עריכה, מחיקה וסימון נשלחים יחד)
router.put('/', async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ message: 'פורמט הרשימה אינו תקין' });
  if (items.length > MAX_ITEMS) {
    return res.status(400).json({ message: `הרשימה יכולה להכיל עד ${MAX_ITEMS} פריטים` });
  }

  const clean = [];
  for (const item of items) {
    const text = String(item?.text || '').trim();
    if (!text) return res.status(400).json({ message: 'לא ניתן לשמור פריט ריק' });
    if (text.length > MAX_TEXT) return res.status(400).json({ message: `פריט יכול להכיל עד ${MAX_TEXT} תווים` });
    clean.push({ text, done: Boolean(item.done) });
  }

  const user = await User.findByIdAndUpdate(req.userId, { $set: { [FIELD]: clean } }, { returnDocument: 'after' })
    .select(FIELD)
    .lean();
  respond(res, user);
});

// חזרה לרשימת ברירת המחדל
router.delete('/', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.userId, { $unset: { [FIELD]: 1 } }, { returnDocument: 'after' })
    .select(FIELD)
    .lean();
  respond(res, user);
});

module.exports = router;
