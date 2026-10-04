// שיוך חדרים לפי השם הפרטי. זו הרשימה היחידה: האתר מקבל את החדר והשותפים מהשרת (userPayload ב-routes/auth.js)
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

// השמות הפרטיים של כל מי שגר בחדר
const guestsOf = (cabinNumber) =>
  Object.entries(CABIN_BY_FIRST_NAME).filter(([, n]) => n === cabinNumber).map(([name]) => name);

// כל החדרים ומי גר בכל אחד, לטבלת החדרים בדף "פרטי חדר"
const roster = () => {
  const byCabin = {};
  for (const [name, number] of Object.entries(CABIN_BY_FIRST_NAME)) (byCabin[number] ||= []).push(name);
  return byCabin;
};

module.exports = { cabinFor, guestsOf, roster, UNASSIGNED };
