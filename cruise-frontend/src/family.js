// שיוך משפחה לפי שם המשפחה. בן שהם / בן שוהם הם חלק ממשפחת עגייב
// (חייב להתאים ל-utils/family.js בשרת)
const normalizeName = (s) => String(s || '').replace(/[-־]/g, ' ').replace(/\s+/g, ' ').trim();

const FAMILIES = {
  singer: ['סינגר', 'זינגר'],
  agayev: ['עגייב', 'עגיב', 'בן שהם', 'בן שוהם'],
};

const FAMILY_BY_LAST_NAME = new Map(
  Object.entries(FAMILIES).flatMap(([key, names]) => names.map((n) => [normalizeName(n), key])),
);

export const familyOf = (lastName) => FAMILY_BY_LAST_NAME.get(normalizeName(lastName)) ?? null;
