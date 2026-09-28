// פרטי החדרים של הקבוצה ב-Odyssey of the Seas.
// המידע על סוג החדר נלקח מאתרי מפות הסיפונים (iCruise, CruiseMapper);
// הגודל הוא ממוצע לקטגוריה ולא מדידה של החדר הספציפי.
// שיוך האורחים חייב להתאים ל-utils/cabins.js בשרת.
import { firstNameOf } from './session';

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
  '10545': { guests: ['שוקי', 'דניאל'], ...INTERIOR },
  '10543': { guests: ['גל', 'יובל'], ...INTERIOR },
  '10541': { guests: ['חיים', 'רחל'], ...INTERIOR },
  '10558': { guests: ['אורלי', 'עמית'], ...BALCONY },
};

// מאתר את החדר לפי השם הפרטי של המשתמש (או לפי מספר החדר שנשמר בהתחברות)
export const findCabin = (user) => {
  if (!user) return null;
  const firstName = firstNameOf(user);
  const byName = Object.entries(cabins).find(([, c]) => c.guests.includes(firstName));
  if (byName) return { number: byName[0], ...byName[1] };
  if (cabins[user.cabinNumber]) return { number: user.cabinNumber, ...cabins[user.cabinNumber] };
  return null;
};
