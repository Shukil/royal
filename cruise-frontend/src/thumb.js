// תמונות Wikimedia נשמרות ב-photos.js ברוחב 960 פיקסלים. לכרטיסיות קטנות (גלריות) ולרקע כהה
// מספיק הגרסה ברוחב 500, והיא קטנה בכ-70% (למשל 125KB במקום 36KB). 500 ו-960 הם שניהם גדלים
// סטנדרטיים של Wikimedia, כך שהם נשמרים אצלם מראש
const WIDE = /\/960px-/;

export const thumb = (src, width) => (WIDE.test(src) ? src.replace(WIDE, `/${width}px-`) : src);

// srcSet לכרטיסייה: 500 לרוב המסכים, ו-960 למסך צפוף במיוחד
export const cardSrcSet = (src) => (WIDE.test(src) ? `${thumb(src, 500)} 500w, ${src} 960w` : undefined);
export const CARD_SIZES = '(max-width: 640px) 250px, 300px';
