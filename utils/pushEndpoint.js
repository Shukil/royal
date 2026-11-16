const net = require('net');

// כתובת ההתראות (endpoint) מגיעה מהדפדפן של המשתמש, והשרת שולח אליה בקשות. בלי בדיקה, משתמש מחובר
// היה יכול לרשום כתובת של שרת אחר (או של רשת פנימית, כמו 169.254.169.254) ולגרום לשרת לפנות אליה (SSRF).
// לכן מקבלים רק כתובות של שירותי ההתראות האמיתיים של הדפדפנים. הדומיין חייב להיות אחד מהרשימה
// או תת-דומיין שלו (עד הנקודה, כך ש-fcm.googleapis.com.evil.com לא עובר)
const ALLOWED_DOMAINS = [
  'fcm.googleapis.com', // Chrome, Edge, Brave, Opera, דפדפן סמסונג (אנדרואיד ומחשב)
  'android.googleapis.com', // כתובות ישנות של אותו שירות
  'push.services.mozilla.com', // Firefox
  'notify.windows.com', // Edge ב-Windows
  'push.apple.com', // Safari ואייפון (web.push.apple.com)
];

const MAX_ENDPOINT_LENGTH = 1500;
const MAX_SUBSCRIPTIONS_PER_USER = 10;

const isAllowedPushEndpoint = (endpoint) => {
  if (typeof endpoint !== 'string' || !endpoint || endpoint.length > MAX_ENDPOINT_LENGTH) return false;

  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== '443') return false;

  // הכתובת חייבת להיות כבר בצורה הסטנדרטית שלה. כך אין הבדל בין איך שרת ה-web-push קורא אותה
  // לבין איך שהבדיקה קוראת אותה (למשל קו נטוי הפוך, רווחים או תווים נסתרים שמשנים את הדומיין)
  if (url.href !== endpoint) return false;

  const host = url.hostname.toLowerCase();
  if (host.endsWith('.') || host.startsWith('[') || net.isIP(host)) return false;
  return ALLOWED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
};

// המפתחות של המנוי: מחרוזות base64url בגודל הצפוי (p256dh = 65 בייטים, auth = 16 בייטים)
const B64URL = /^[A-Za-z0-9_-]+$/;
const hasValidKeys = (keys) =>
  Boolean(keys) &&
  typeof keys.p256dh === 'string' && typeof keys.auth === 'string' &&
  B64URL.test(keys.p256dh) && B64URL.test(keys.auth) &&
  keys.p256dh.length >= 80 && keys.p256dh.length <= 90 &&
  keys.auth.length >= 20 && keys.auth.length <= 24;

module.exports = { isAllowedPushEndpoint, hasValidKeys, MAX_SUBSCRIPTIONS_PER_USER };
