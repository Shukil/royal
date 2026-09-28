// שיוך חדרים לפי השם הפרטי (חייב להתאים ל-cruise-frontend/src/cabins.js)
const CABIN_BY_FIRST_NAME = {
  'שוקי': '10545',
  'דניאל': '10545',
  'חיים': '10541',
  'רחל': '10541',
  'גל': '10543',
  'יובל': '10543',
  'אורלי': '10558',
  'עמית': '10558',
};

const UNASSIGNED = 'לא שויך';

const cabinFor = (firstName) => CABIN_BY_FIRST_NAME[String(firstName || '').trim()] || UNASSIGNED;

module.exports = { cabinFor, UNASSIGNED };
