// שיוך משפחה לפי שם המשפחה. בן שהם / בן שוהם הם חלק ממשפחת עגייב
// זו הרשימה היחידה: האתר מקבל את המשפחה מהשרת (userPayload ב-routes/auth.js)
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

module.exports = { FAMILIES, familyOf };
