const Family = require('../models/Family');
const User = require('../models/User');
const { FAMILIES, familyOf, normalizeName } = require('./family');

// המשפחות נשמרות במסד ומנוהלות מדף ניהול המשפחות. השמות שלהן נשמרים גם בזיכרון,
// כי כמעט כל תשובה של השרת מציגה אותם; כל שינוי בדף הניהול טוען אותם מחדש
let labels = {};

const loadFamilies = async () => {
  const list = await Family.find().sort({ createdAt: 1 }).lean();
  labels = Object.fromEntries(list.map((f) => [f.key, f.label]));
  return labels;
};

// { key: 'משפחת ...' } לפי סדר ההוספה
const familyLabels = () => labels;
const familyLabel = (key) => (key && labels[key]) || null;
const familyExists = (key) => Boolean(key && labels[key]);

// הקמה בהפעלת השרת: בפעם הראשונה יוצרים את המשפחות הידועות, ומשייכים למשפחה כל משתמש
// שעוד אין לו את השדה (לפי שם המשפחה, כמו קודם). אחרי זה השיוך משתנה רק מדף הניהול
const setupFamilies = async () => {
  if (!(await Family.exists({}))) {
    await Family.insertMany(Object.entries(FAMILIES).map(([key, f]) => ({ key, label: f.label })));
  }
  const unassigned = await User.find({ family: { $exists: false } }).select('lastName').lean();
  if (unassigned.length) {
    await User.bulkWrite(unassigned.map((u) => ({
      updateOne: { filter: { _id: u._id }, update: { $set: { family: familyOf(u.lastName) } } },
    })));
  }
  await loadFamilies();
};

// משפחה לנרשם חדש: המשפחה של מי שכבר רשום עם אותו שם משפחה, ואם אין כזה - הניחוש הקבוע
const familyForNewUser = async (lastName) => {
  const wanted = normalizeName(lastName);
  const relatives = await User.find({ family: { $type: 'string' } }).select('lastName family').lean();
  const relative = relatives.find((u) => normalizeName(u.lastName) === wanted && familyExists(u.family));
  if (relative) return relative.family;
  const guess = familyOf(lastName);
  return familyExists(guess) ? guess : null;
};

// ===== מנהלים =====
// מנהלי האתר: רשימת מיילים במשתנה הסביבה ADMIN_EMAILS (המאגר ציבורי, אז לא בקוד).
// בנוסף, מנהלי משפחה שסומנו בדף ניהול המשפחות (isAdmin). שני הסוגים רואים את כל דפי המנהלים
const siteAdminEmails = () =>
  String(process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
const isSiteAdmin = (user) => Boolean(user?.email) && siteAdminEmails().includes(user.email);
const isAdminUser = (user) => Boolean(user) && (isSiteAdmin(user) || Boolean(user.isAdmin));

module.exports = {
  loadFamilies,
  familyLabels,
  familyLabel,
  familyExists,
  setupFamilies,
  familyForNewUser,
  isSiteAdmin,
  isAdminUser,
};
