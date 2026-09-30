import { tripDays } from './tripDays';

// הימים שאפשר לבנות להם תוכנית: כל ימי הטיול חוץ מהימים בים
// (חייב להתאים ל-PLAN_DAYS ב-utils/trip.js בשרת)
export const planDays = tripDays.filter((d) => !d.sea);

const DEFAULT_MARGIN = 45; // דקות ביטחון לפני שעת החזרה לספינה

const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// האם פריט בתוכנית מסתדר עם שעות הספינה. מחזיר רשימת בעיות: { level: 'error' | 'warn', text }
export const checkItem = (item, day) => {
  const issues = [];
  const finish = toMinutes(item.end || item.start);

  if (day.arrive && toMinutes(item.start) < toMinutes(day.arrive)) {
    issues.push({ level: 'warn', text: `מתחיל לפני שהספינה מגיעה (${day.arrive})` });
  }
  if (day.boardBy) {
    const boardBy = toMinutes(day.boardBy);
    const margin = day.planMargin || DEFAULT_MARGIN;
    const label = day.boardVerb === 'עולים' ? 'סגירת הצ׳ק-אין' : 'שעת החזרה לספינה';
    if (finish > boardBy) {
      issues.push({ level: 'error', text: `נגמר אחרי ${label} (${day.boardBy})` });
    } else if (finish > boardBy - margin) {
      const left = boardBy - finish;
      issues.push({
        level: 'warn',
        text: `נשארות רק ${left} דקות עד ${label} (${day.boardBy})${day.planMarginWhy ? `. כאן צריך לפחות ${margin} דקות בגלל ${day.planMarginWhy}` : ''}`,
      });
    }
  }
  return issues;
};

export const dayLabel = (d) => `${d.weekday} ${d.date.split('-').reverse().slice(0, 2).join('.')}`;
