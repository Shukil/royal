// ארבעת סוגי האירועים והצבע של כל אחד (הצבעים בקובץ ה-CSS, לפי המחלקה event--<type>)
export const EVENT_TYPES = {
  all: { label: 'אירוע לכולם', short: 'לכולם', hint: 'יופיע בלו״ז של כל הנוסעים' },
  family: { label: 'אירוע משפחתי', short: 'משפחתי', hint: 'יופיע בלו״ז של כל המשפחה שלך' },
  personal: { label: 'אירוע אישי', short: 'אישי', hint: 'יופיע רק בלו״ז שלך' },
  custom: { label: 'בהתאמה אישית', short: 'בהתאמה אישית', hint: 'יופיע בלו״ז שלך ושל מי שתזמין' },
};

export const RSVP_LABELS = {
  yes: { label: 'מגיע/ה', icon: '✅' },
  maybe: { label: 'אולי', icon: '🤔' },
  no: { label: 'לא מגיע/ה', icon: '❌' },
};

// "יום שלם", "19:00" או "19:00–21:30"
export const formatWhen = (ev) => {
  if (ev.allDay) return 'יום שלם';
  return ev.endTime ? `${ev.time}–${ev.endTime}` : ev.time;
};

export const mapsUrl = (location) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

// "2027-07-29" -> "29.07.2027"
export const formatDate = (date) => date.split('-').reverse().join('.');

// "2027-08-17" -> "שלישי 17.08"
export const formatDay = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('he-IL', { weekday: 'long', timeZone: 'UTC' });
  return `${weekday} ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
};
