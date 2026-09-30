import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from './api';
import { getToken } from './session';
import { guideOrder } from './destinations';
import { planDays, dayLabel } from './planChecks';
import RomeGuide from './RomeGuide';
import DestinationGuide from './DestinationGuide';
import OdysseyInfo from './OdysseyInfo';
import Emergency from './Emergency';
import Itinerary from './Itinerary';

// החיפוש עובר על התוכן של הדפים עצמם: כל דף מרונדר ל-HTML (בלי להציג אותו) ומפורק לקטעים.
// כך כל תוכן שנוסף לדפים נכנס לחיפוש לבד, בלי רשימה נפרדת לתחזק
const PAGES = [
  { path: '/rome-guide', element: <RomeGuide /> },
  ...guideOrder.map((id) => ({ path: `/guide/${id}`, route: '/guide/:id', element: <DestinationGuide /> })),
  { path: '/itinerary', element: <Itinerary /> },
  { path: '/odyssey', element: <OdysseyInfo /> },
  { path: '/emergency', element: <Emergency /> },
];

// הקטעים שמחפשים בהם. לוקחים רק את החיצוני (פריט ברשימה, ולא הפסקה שבתוכו)
const BLOCKS = 'details, li, tr, .fact, .phrase, p, h3';

const clean = (s) => s.replace(/\s+/g, ' ').trim();

// הטקסט של אלמנט, עם רווח בין אלמנטים סמוכים (textContent מדביק "תודה" ו-"Ευχαριστώ" למילה אחת)
const textOf = (el) => {
  if (!el) return '';
  const parts = [];
  const walker = el.ownerDocument.createTreeWalker(el, 4); // NodeFilter.SHOW_TEXT
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
  return clean(parts.join(' '));
};

const pageEntries = ({ path, route, element }) => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path={route || path} element={element} /></Routes>
    </MemoryRouter>,
  );
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const page = textOf(doc.querySelector('h1'));
  const entries = [];

  for (const el of doc.querySelectorAll(BLOCKS)) {
    if (el.parentElement.closest(BLOCKS) || el.closest('nav')) continue;
    const text = textOf(el);
    if (text.length < 3) continue;
    const section = el.closest('section');
    entries.push({
      page,
      heading: textOf(section?.querySelector('h2')),
      title: el.matches('details') ? textOf(el.querySelector('summary')) : '',
      text,
      to: section?.id ? `${path}#${section.id}` : path,
    });
  }
  return entries;
};

let staticIndex = null;
export const staticEntries = () => {
  staticIndex ??= PAGES.flatMap(pageEntries);
  return staticIndex;
};

// נתונים מהשרת: אירועים בלו״ז, משימות ותוכנית הטיול (בלי אינטרנט - מהעותק השמור)
export const serverEntries = async () => {
  if (!getToken()) return [];
  const [events, tasks, plan] = await Promise.all(
    ['/events', '/tasks', '/plan'].map((url) => api.get(url).then((r) => r.data).catch(() => null)),
  );
  const short = (iso) => iso.split('-').reverse().slice(0, 2).join('.');
  return [
    ...(events?.events || []).map((ev) => ({
      page: 'לו״ז',
      heading: `${short(ev.date)}${ev.time ? ` · ${ev.time}` : ''}`,
      title: ev.title,
      text: clean([ev.title, ev.location, ev.description].filter(Boolean).join(' · ')),
      to: `/schedule/${ev.id}`,
    })),
    ...(tasks?.tasks || []).map((t) => ({
      page: 'משימות',
      heading: `עד ${short(t.due)}${t.done ? ' · בוצעה' : ''}`,
      title: t.title,
      text: clean([t.title, t.note].filter(Boolean).join(' · ')),
      to: '/tasks',
    })),
    ...(plan?.items || []).map((i) => {
      const day = planDays.find((d) => d.date === i.date);
      return {
        page: 'תוכנית הטיול',
        heading: day ? `${dayLabel(day)} · ${day.place}` : short(i.date),
        title: i.title,
        text: clean([`${i.start}${i.end ? `–${i.end}` : ''}`, i.title, i.who, i.note].filter(Boolean).join(' · ')),
        to: `/plan?day=${i.date}`,
      };
    }),
  ];
};

// ===== התאמה =====

// אותיות לועזיות קטנות, בלי ניקוד ובלי סימני הטעמה, וגרש/גרשיים אחידים
const normChar = (c) =>
  c.toLowerCase().normalize('NFD').replace(/[̀-֑ͯ-ׇ]/g, '')
    .replace(/[׳`’]/g, "'").replace(/[״“”]/g, '"');

// טקסט מנורמל, ומיפוי מכל תו בו לתו במקור (כדי לסמן את ההתאמה בטקסט המקורי)
const normWithMap = (text) => {
  let out = '';
  const map = [];
  // האינדקסים לפי יחידות UTF-16, כמו ב-slice (אימוג׳י תופס שתיים)
  for (let i = 0; i < text.length;) {
    const c = String.fromCodePoint(text.codePointAt(i));
    for (const n of normChar(c)) {
      out += n;
      map.push(i);
    }
    i += c.length;
  }
  return { out, map };
};

export const normalize = (s) => [...s].map(normChar).join('');

// אותיות שימוש בתחילת מילה בעברית (ברכבל → רכבל, ובאיטלקית → איטלקית)
const PREFIXES = ['וב', 'וה', 'ול', 'ומ', 'וש', 'שה', 'מה', 'כש', 'לה', 'ב', 'ה', 'ו', 'ל', 'מ', 'ש', 'כ'];
const variants = (word) => {
  const list = [word];
  for (const p of PREFIXES) {
    if (word.startsWith(p) && word.length - p.length >= 2) list.push(word.slice(p.length));
  }
  return list;
};

export const search = (entries, query) => {
  const words = normalize(query).split(/\s+/).filter((w) => w.length >= 2);
  if (!words.length) return [];
  const phrase = normalize(query.trim());

  const results = [];
  for (const e of entries) {
    const text = normalize(e.text);
    const context = normalize(`${e.page} ${e.heading} ${e.title}`);
    let score = 0;
    let inText = 0;
    let all = true;
    for (const w of words) {
      const vs = variants(w);
      if (vs.some((v) => text.includes(v))) {
        score += 2;
        inText += 1;
      } else if (vs.some((v) => context.includes(v))) {
        score += 1;
      } else {
        all = false;
        break;
      }
    }
    // לפחות מילה אחת צריכה להופיע בקטע עצמו, ולא רק בשם הדף או בכותרת
    if (!all || !inText) continue;
    if (words.length > 1 && text.includes(phrase)) score += 3;
    if (e.title && normalize(e.title).includes(words[0])) score += 1;
    results.push({ ...e, score, words });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 60);
};

// קטע קצר מהטקסט סביב ההתאמה הראשונה, מפורק לחלקים מסומנים ולא מסומנים
export const snippet = (text, words, size = 140) => {
  const { out, map } = normWithMap(text);
  let at = -1;
  let len = 0;
  for (const w of words) {
    for (const v of variants(w)) {
      const i = out.indexOf(v);
      if (i !== -1 && (at === -1 || i < at)) {
        at = i;
        len = v.length;
      }
    }
  }
  if (at === -1) return [{ text: text.length > size ? `${text.slice(0, size)}…` : text }];

  const start = map[at];
  const end = map[at + len - 1] + 1;
  const from = Math.max(0, start - Math.floor(size / 3));
  const to = Math.min(text.length, from + size);
  return [
    { text: `${from > 0 ? '…' : ''}${text.slice(from, start)}` },
    { text: text.slice(start, end), mark: true },
    { text: `${text.slice(end, to)}${to < text.length ? '…' : ''}` },
  ];
};
