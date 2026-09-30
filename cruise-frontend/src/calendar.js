// הוספת אירוע מהלו"ז ליומן Google או ליומן של Apple (קובץ ics).
// השעות בלו"ז הן בשעון המקומי של היעד, ולכן הן נשמרות ביומן כשעה "צפה" (בלי אזור זמן):
// 19:00 יופיע כ-19:00 בכל מקום שבו הטלפון נמצא
const DEFAULT_MINUTES = 60;

const pad = (n) => String(n).padStart(2, '0');
const compactDate = (date) => date.replaceAll('-', '');

// "2027-08-17" -> "20270818" (היום שאחרי, לסיום של אירוע יום שלם)
const nextDay = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
};

// תאריך + שעה + דקות נוספות -> "20270817T190000" (כולל מעבר ליום הבא אם צריך)
const stamp = (date, time, addMinutes = 0) => {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm + addMinutes));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`;
};

const range = (ev) => {
  if (ev.allDay) return { start: compactDate(ev.date), end: nextDay(ev.date), allDay: true };
  return {
    start: stamp(ev.date, ev.time),
    end: ev.endTime ? stamp(ev.date, ev.endTime) : stamp(ev.date, ev.time, DEFAULT_MINUTES),
    allDay: false,
  };
};

const detailsText = (ev, url) => [ev.description, url && `פרטים, אישור הגעה ותגובות: ${url}`].filter(Boolean).join('\n\n');

export const googleCalendarUrl = (ev, url) => {
  const { start, end } = range(ev);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${start}/${end}`,
    details: detailsText(ev, url),
  });
  if (ev.location) params.set('location', ev.location);
  return `https://calendar.google.com/calendar/render?${params}`;
};

// לפי RFC 5545: בריחה של תווים מיוחדים, וקיפול שורות ארוכות
const escapeIcs = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// שורה ארוכה מקופלת כך שאף שורה לא עוברת 75 בתים ב-UTF-8 (אות עברית = 2 בתים).
// שורות ההמשך מתחילות ברווח, ולא חותכים באמצע תו
const encoder = new TextEncoder();
const fold = (line) => {
  const out = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > 75) {
      out.push(current);
      current = ' ';
      bytes = 1;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n');
};

// ev.alarms: כמה דקות לפני תחילת האירוע להקפיץ תזכורת בטלפון, למשל [120, 60]
const veventLines = (ev, url, now) => {
  const { start, end, allDay } = range(ev);
  return [
    'BEGIN:VEVENT',
    `UID:${ev.id}@odyssey-cruise-2027`,
    `DTSTAMP:${now}`,
    allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
    allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`,
    `SUMMARY:${escapeIcs(ev.title)}`,
    ev.location && `LOCATION:${escapeIcs(ev.location)}`,
    `DESCRIPTION:${escapeIcs(detailsText(ev, url))}`,
    url && `URL:${url}`,
    ...(ev.alarms || []).flatMap((minutes) => [
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcs(ev.title)}`,
      `TRIGGER:-PT${minutes}M`,
      'END:VALARM',
    ]),
    'END:VEVENT',
  ];
};

// קובץ יומן אחד עם כמה אירועים
export const icsCalendar = (events, url) => {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Odyssey Cruise 2027//Schedule//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flatMap((ev) => veventLines(ev, url, now)),
    'END:VCALENDAR',
  ].filter(Boolean);
  return `${lines.map(fold).join('\r\n')}\r\n`;
};

export const icsContent = (ev, url) => icsCalendar([ev], url);

export const downloadIcs = (ev, url) => downloadIcsFile(ev.title, icsContent(ev, url));

export const downloadIcsFile = (name, content) => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = `${name.replace(/[\\/:*?"<>|]/g, '').trim() || 'event'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
};
