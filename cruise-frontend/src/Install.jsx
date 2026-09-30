import { useState } from 'react';
import { detectPlatform, isStandalone, promptInstall, useCanInstall } from './installPrompt';
import Notifications from './Notifications';

const PLATFORMS = [
  { id: 'ios', label: 'אייפון / אייפד' },
  { id: 'android', label: 'אנדרואיד (Chrome)' },
  { id: 'samsung', label: 'סמסונג (Samsung Internet)' },
  { id: 'desktop', label: 'מחשב' },
];

// סמל השיתוף של אייפון (ריבוע עם חץ למעלה), כדי שיהיה קל לזהות אותו על המסך
const ShareIcon = () => (
  <svg className="install__glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="סמל השיתוף">
    <path d="M12 3v12M7.5 7.5L12 3l4.5 4.5" />
    <path d="M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2" />
  </svg>
);

const steps = {
  ios: [
    <>פותחים את האתר ב-<strong>Safari</strong>. (בגרסאות חדשות של iOS אפשר גם מ-Chrome, דרך אותו כפתור שיתוף.)</>,
    <>לוחצים על כפתור השיתוף <ShareIcon /> בתחתית המסך. באייפד הוא למעלה, ליד שורת הכתובת.</>,
    <>גוללים למטה ברשימה ובוחרים <strong>״הוסף למסך הבית״</strong> (Add to Home Screen).</>,
    <>אם מופיע מתג <strong>״פתח כאפליקציית רשת״</strong>, משאירים אותו פעיל.</>,
    <>לוחצים <strong>״הוסף״</strong> בפינה העליונה. הסמל ״האודיסי״ יופיע במסך הבית.</>,
  ],
  android: [
    <>פותחים את האתר ב-<strong>Chrome</strong>.</>,
    <>לוחצים על תפריט שלוש הנקודות <strong>⋮</strong> בפינה העליונה.</>,
    <>בוחרים <strong>״התקנת אפליקציה״</strong> או <strong>״הוספה למסך הבית״</strong>.</>,
    <>מאשרים ב-<strong>״התקנה״</strong>. הסמל ״האודיסי״ יופיע במסך הבית וברשימת האפליקציות.</>,
  ],
  samsung: [
    <>פותחים את האתר ב-<strong>Samsung Internet</strong>.</>,
    <>לוחצים על התפריט <strong>≡</strong> בתחתית המסך.</>,
    <>בוחרים <strong>״הוסף דף אל״</strong> ואז <strong>״מסך הבית״</strong>.</>,
    <>מאשרים ב-<strong>״הוסף״</strong>.</>,
  ],
  desktop: [
    <>פותחים את האתר ב-<strong>Chrome</strong> או ב-<strong>Edge</strong>.</>,
    <>בקצה שורת הכתובת מופיע סמל התקנה (מסך עם חץ). לוחצים עליו.</>,
    <>אם הסמל לא מופיע: בתפריט <strong>⋮</strong> או <strong>…</strong> בוחרים ״התקנת הדף כאפליקציה״ (Chrome: ״העברה, שמירה ושיתוף״ ← ״התקנת הדף כאפליקציה״).</>,
    <>מאשרים ב-<strong>״התקנה״</strong>. האתר ייפתח בחלון משלו, ויופיע בתפריט התחל.</>,
  ],
};

const Install = () => {
  const [platform, setPlatform] = useState(detectPlatform);
  const [standalone] = useState(isStandalone);
  const canInstall = useCanInstall();
  const [result, setResult] = useState(null);

  const install = async () => {
    const accepted = await promptInstall();
    setResult(accepted ? 'done' : 'dismissed');
  };

  return (
    <div className="page">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">להתקין את האתר כאפליקציה 📲</h1>
          <p className="card__lead">סמל במסך הבית, מסך מלא, ועובד גם בלי אינטרנט על הספינה</p>
        </header>

        <div className="card__body">
          {standalone ? (
            <>
              <p className="install__status install__status--ok">🎉 האתר כבר פתוח כאפליקציה במכשיר הזה. אין צורך לעשות כלום.</p>
              <Notifications />
            </>
          ) : result === 'done' ? (
            <p className="install__status install__status--ok">🎉 מעולה! האפליקציה הותקנה. אפשר לפתוח אותה מהסמל ״האודיסי״.</p>
          ) : (
            canInstall && (
              <div className="install__quick">
                <p>המכשיר הזה מאפשר התקנה בלחיצה אחת:</p>
                <button type="button" className="btn btn--gold" onClick={install}>📲 התקנה עכשיו</button>
                {result === 'dismissed' && <p className="field__hint">ההתקנה בוטלה. אפשר לנסות שוב, או לפי ההוראות למטה.</p>}
              </div>
            )
          )}

          <section className="section">
            <h2 className="section__title">למה כדאי</h2>
            <ul className="prose">
              <li><strong>עובד בלי אינטרנט:</strong> על הספינה האינטרנט בתשלום. המדריכים, הלו״ז האחרון, פרטי החדר ודף החירום נשארים זמינים.</li>
              <li><strong>סמל במסך הבית:</strong> נפתח במסך מלא כמו אפליקציה רגילה, בלי שורת כתובת.</li>
              <li><strong>מתעדכן לבד:</strong> כשיש חיבור, גרסה חדשה של האתר נכנסת אוטומטית.</li>
            </ul>
          </section>

          <section className="section">
            <h2 className="section__title">איך מתקינים</h2>
            <div className="install__tabs" role="tablist" aria-label="סוג המכשיר">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={platform === p.id}
                  className={`install__tab${platform === p.id ? ' is-on' : ''}`}
                  onClick={() => setPlatform(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <ol className="install__steps" role="tabpanel">
              {steps[platform].map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </section>

          <section className="section">
            <h2 className="section__title">אחרי ההתקנה</h2>
            <ul className="prose">
              <li><strong>מתחברים שוב בתוך האפליקציה.</strong> באייפון האפליקציה נפרדת מ-Safari, ולכן צריך להתחבר בה עם אותו אימייל וסיסמה.</li>
              <li><strong>לפני ההפלגה, עם אינטרנט:</strong> עוברים פעם אחת על הלו״ז, פרטי החדר, כל מדריכי היעדים (כולל המפות) ודף החירום. כך הכול נשמר לשימוש בלי חיבור.</li>
              <li>כשאין חיבור מופיע למעלה פס צהוב. אפשר לקרוא הכול, אבל לאשר הגעה, לסמן בצ׳ק ליסט או להגיב אפשר רק כשיש חיבור.</li>
            </ul>
          </section>
        </div>
      </article>
    </div>
  );
};

export default Install;
