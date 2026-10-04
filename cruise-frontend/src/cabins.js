// פרטי החדרים של הקבוצה ב-Odyssey of the Seas.
// המידע על סוג החדר נלקח מאתרי מפות הסיפונים (iCruise, CruiseMapper);
// הגודל הוא ממוצע לקטגוריה ולא מדידה של החדר הספציפי.
// מי גר באיזה חדר נקבע רק בשרת (utils/cabins.js), ומגיע עם פרטי המשתמש (cabinNumber, cabinGuests).

const INTERIOR = {
  category: '4V',
  type: 'חדר פנימי',
  typeEn: 'Interior Stateroom',
  size: '15.4 מ״ר (166 sq ft)',
  balcony: null,
  maxGuests: 4,
  beds: 'שתי מיטות יחיד שמתחברות למיטה זוגית (Royal King)',
  amenities: ['פינת ישיבה', 'חדר רחצה פרטי עם מקלחת', 'פינת איפור ושולחן', 'מייבש שיער', 'טלוויזיה', 'טלפון', 'כספת'],
  note: 'חדר ללא חלון, שקט וחשוך במיוחד. מושלם לשינה טובה אחרי יום ארוך בחוף.',
};

const BALCONY = {
  category: '1D',
  type: 'חדר עם מרפסת',
  typeEn: 'Ocean View Balcony',
  size: '18.4 מ״ר (198 sq ft)',
  balcony: '5.1 מ״ר (55 sq ft)',
  maxGuests: 3,
  beds: 'שתי מיטות יחיד שמתחברות למיטה זוגית (Royal King)',
  amenities: ['מרפסת פרטית עם נוף לים', 'פינת ישיבה עם ספה', 'חדר רחצה פרטי עם מקלחת', 'פינת איפור ושולחן', 'מייבש שיער', 'טלוויזיה', 'טלפון', 'כספת'],
  note: 'מרפסת פרטית לקפה של בוקר מול הים ולכניסה לנמלים.',
};

export const DECK = 10;

export const cabins = {
  '10545': INTERIOR,
  '10543': INTERIOR,
  '10541': INTERIOR,
  '10558': BALCONY,
};

// החדר של המשתמש המחובר, עם השמות של מי שגר בו
export const findCabin = (user) => {
  const details = cabins[user?.cabinNumber];
  return details ? { number: user.cabinNumber, guests: user.cabinGuests || [], ...details } : null;
};
