// ניחוש ראשוני של המשפחה לפי שם המשפחה. בן שהם / בן שוהם הם חלק ממשפחת עגייב.
// משמש רק להקמת המשפחות במסד בפעם הראשונה ולנרשמים חדשים; מעבר לזה המשפחות
// והחברים בהן מנוהלים במסד, מדף ניהול המשפחות (utils/families.js, routes/admin.js)
const normalizeName = (s) => String(s || '').replace(/[-־]/g, ' ').replace(/\s+/g, ' ').trim();

const FAMILIES = {
  singer: { label: 'משפחת זינגר', lastNames: ['סינגר', 'זינגר'] },
  agayev: { label: 'משפחת עגייב', lastNames: ['עגייב', 'עגיב', 'בן שהם', 'בן שוהם'] },
};

// טבלת חיפוש: שם משפחה מנורמל -> מפתח המשפחה
const FAMILY_BY_LAST_NAME = new Map(
  Object.entries(FAMILIES).flatMap(([key, f]) => f.lastNames.map((n) => [normalizeName(n), key])),
);

const familyOf = (lastName) => FAMILY_BY_LAST_NAME.get(normalizeName(lastName)) ?? null;

module.exports = { FAMILIES, familyOf, normalizeName };
