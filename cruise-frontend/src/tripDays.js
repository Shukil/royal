import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { destinations } from './destinations';

// ימי הטיול למסך "היום" בדף הבית: שלושה ימים ברומא ושמונת ימי ההפלגה.
// השעות בשעון המקומי של אותו יום (tz), לפי לוח ההפלגות, כמו ב-Itinerary.jsx (חייב להתאים לו).
// All Aboard: לפי Royal Caribbean, חצי שעה לפני ההפלגה מכל נמל
const guide = (id) => ({ to: `/guide/${id}`, label: `למדריך ל${destinations[id].name}` });
const ROME_GUIDE = { to: '/rome-guide', label: 'למדריך לרומא' };

export const tripDays = [
  {
    date: '2027-08-12', weekday: 'חמישי', tz: '+02:00', place: 'רומא', emoji: '🏛️', country: 'it',
    kicker: 'נוחתים ברומא',
    note: 'יום הטיסה. בלו״ז מופיעות שעות הנחיתה של כל משפחה.',
    guide: ROME_GUIDE, weather: 'rome',
  },
  {
    date: '2027-08-13', weekday: 'שישי', tz: '+02:00', place: 'רומא', emoji: '🏛️', country: 'it',
    kicker: 'יום בעיר הנצחית',
    guide: ROME_GUIDE, weather: 'rome',
  },
  {
    date: '2027-08-14', weekday: 'שבת', tz: '+02:00', place: 'רומא', emoji: '🏛️', country: 'it',
    kicker: 'יום אחרון ברומא',
    note: 'מחר עולים לספינה. כדאי לארוז הערב ולהכין בתיק היד בגד ים, תרופות ומסמכים.',
    guide: ROME_GUIDE, weather: 'rome',
  },
  {
    date: '2027-08-15', weekday: 'ראשון', tz: '+02:00', place: 'רומא (צ׳יוויטווקיה)', emoji: '🚢', country: 'it',
    kicker: 'יום 1 בהפלגה · עולים לספינה',
    depart: '15:00', boardBy: '13:30', boardByLabel: 'לסגירת הצ׳ק-אין', boardVerb: 'עולים',
    note: 'הצ׳ק-אין בנמל נסגר כשעה וחצי לפני ההפלגה, אז כדאי להגיע בצהריים. מזוודות גדולות מוסרים לסבלים במסוף.',
    guide: ROME_GUIDE, weather: 'rome',
  },
  {
    date: '2027-08-16', weekday: 'שני', tz: '+03:00', place: 'יום בים', emoji: '🌊', sea: true,
    kicker: 'יום 2 בהפלגה',
    note: 'יום להכיר את הספינה: FlowRider, RipCord, בריכות וספא. את התוכנייה היומית (Cruise Compass) מוצאים באפליקציה של Royal Caribbean.',
    guide: { to: '/odyssey', label: 'מה יש על האודיסי' },
  },
  {
    date: '2027-08-17', weekday: 'שלישי', tz: '+03:00', place: 'סנטוריני', emoji: destinations.santorini.emoji, country: 'gr',
    kicker: 'יום 3 בהפלגה · עגינה בסירות',
    arrive: '09:00', depart: '23:00', boardBy: '22:30',
    // מרווח הביטחון בתוכנית (דקות לפני שעת החזרה): התור לרכבל למטה והסירות לוקחים זמן
    planMargin: 90, planMarginWhy: 'התור לרכבל למטה והסירות',
    note: 'יורדים בסירות (Tender) עם כרטיס תור שמחלקים בבוקר. בערב התור לרכבל למטה ארוך, והסירה האחרונה יוצאת כחצי שעה לפני ההפלגה.',
    guide: guide('santorini'), weather: 'santorini',
  },
  {
    date: '2027-08-18', weekday: 'רביעי', tz: '+03:00', place: 'קושאדסי (אפסוס)', emoji: destinations.kusadasi.emoji, country: 'tr',
    kicker: 'יום 4 בהפלגה',
    arrive: '09:00', depart: '19:00', boardBy: '18:30',
    note: 'הספינה קושרת צמוד למרכז העיר. המטבע לירה טורקית, ולאפסוס כדאי לצאת מוקדם לפני החום.',
    guide: guide('kusadasi'), weather: 'kusadasi',
  },
  {
    date: '2027-08-19', weekday: 'חמישי', tz: '+03:00', place: 'מיקונוס', emoji: destinations.mykonos.emoji, country: 'gr',
    kicker: 'יום 5 בהפלגה',
    arrive: '07:00', depart: '17:00', boardBy: '16:30',
    note: 'הספינה קושרת בדרך כלל בנמל החדש בטורלוס, כ-2–3 ק״מ מהעיר. לחורה מגיעים ב-Sea Bus (בתשלום), בשאטל או במונית.',
    guide: guide('mykonos'), weather: 'mykonos',
  },
  {
    date: '2027-08-20', weekday: 'שישי', tz: '+02:00', place: 'יום בים', emoji: '🌊', sea: true,
    kicker: 'יום 6 בהפלגה',
    note: 'יום בים אחרון לפני נאפולי. כדאי להזמין מראש מקום במופעים ובמסעדות של הימים האחרונים.',
    guide: { to: '/odyssey', label: 'מה יש על האודיסי' },
  },
  {
    date: '2027-08-21', weekday: 'שבת', tz: '+02:00', place: 'נאפולי / קאפרי', emoji: destinations.naples.emoji, country: 'it',
    kicker: 'יום 7 בהפלגה · הערב אורזים',
    arrive: '07:00', depart: '18:00', boardBy: '17:30',
    note: 'הערב מוציאים את המזוודות הגדולות מחוץ לחדר לפי ההנחיות של הספינה. בתיק היד משאירים בגדים למחר ומסמכים.',
    guide: guide('naples'), weather: 'naples',
  },
  {
    date: '2027-08-22', weekday: 'ראשון', tz: '+02:00', place: 'רומא (צ׳יוויטווקיה)', emoji: '🏁', country: 'it',
    kicker: 'יום 8 · יורדים מהספינה',
    arrive: '05:00',
    note: 'מפנים את החדר בבוקר. הירידה מהספינה לפי שעות שמקבלים בערב הקודם.',
    guide: ROME_GUIDE, weather: 'rome',
  },
];

// תזכורות All Aboard ליומן בטלפון (calendar.js): אירוע לכל יום עם שעת חזרה לספינה,
// עם התראה שעתיים ושעה לפני. השעות "צפות", כך שהן נכונות בשעון המקומי של כל נמל
export const allAboardEvents = tripDays
  .filter((d) => d.boardBy)
  .map((d) => ({
    id: `all-aboard-${d.date}`,
    title: `⚓ ${d.boardVerb || 'חוזרים'} לספינה עד ${d.boardBy} · ${d.place}`,
    date: d.date,
    time: d.boardBy,
    endTime: d.depart,
    location: d.place,
    description: [`הספינה מפליגה ב-${d.depart} ולא מחכה למי שמאחר.`, d.note].filter(Boolean).join('\n'),
    alarms: [120, 60],
  }));

// שעה מקומית של יום בטיול -> זמן מוחלט (ms)
export const at = (day, time) => Date.parse(`${day.date}T${time}:00${day.tz}`);

const HOUR = 60 * 60 * 1000;

// "+03:00" -> 180 (דקות מ-UTC)
export const tzMinutes = (tz) => {
  const [, sign, h, m] = tz.match(/([+-])(\d{2}):(\d{2})/);
  return (sign === '-' ? -1 : 1) * (Number(h) * 60 + Number(m));
};

// השעה עכשיו (HH:MM) באזור הזמן של יום בטיול
export const clockAt = (now, tz) => {
  const d = new Date(now + tzMinutes(tz) * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

// היום בטיול שבו אנחנו נמצאים עכשיו, לפי שעון חצות-עד-חצות של אותו יום
export const findTripDay = (now) => {
  const i = tripDays.findIndex((d) => now >= at(d, '00:00') && now < at(d, '00:00') + 24 * HOUR);
  return i === -1 ? null : { day: tripDays[i], next: tripDays[i + 1] ?? null };
};

// השעון של מסך "היום". מתעדכן כל 20 שניות.
// תצוגה מקדימה: /?day=2027-08-17&time=21:00 מציג את המסך כאילו זה היום והשעה האלה
export const useTripClock = () => {
  const [params] = useSearchParams();
  const previewDay = tripDays.find((d) => d.date === params.get('day'));
  const previewTime = /^\d{2}:\d{2}$/.test(params.get('time') || '') ? params.get('time') : '10:00';
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20 * 1000);
    return () => clearInterval(id);
  }, []);

  return previewDay ? { now: at(previewDay, previewTime), preview: true } : { now, preview: false };
};
