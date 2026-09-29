import { Link } from 'react-router-dom';
import Flag from './Flag';
import TravelWarning from './TravelWarning';

// מספרי הטלפון נבדקו מול דפי "צרו קשר" הרשמיים של הנציגויות (embassies.gov.il)
// ודף השאלות של Royal Caribbean, ב-29.09.2026. כדאי לבדוק שוב לפני הטיסה
const tel = (n) => `tel:${n.replace(/[^\d+]/g, '')}`;
const waLink = (n) => `https://wa.me/${n.replace(/\D/g, '')}`;

const Phone = ({ number, whatsapp = false }) => (
  <a className="phone" href={whatsapp ? waLink(number) : tel(number)} dir="ltr" target={whatsapp ? '_blank' : undefined} rel={whatsapp ? 'noreferrer' : undefined}>
    {whatsapp ? '💬' : '📞'} {number}
  </a>
);

const missions = [
  {
    country: 'it',
    name: 'שגרירות ישראל ברומא',
    where: 'לרומא ולנאפולי',
    address: 'Via Michele Mercati 14, Roma',
    lines: [
      { label: 'מרכזייה', number: '+39 06 3619 8500' },
      { label: 'טלפון חירום', number: '+39 340 058 0062' },
    ],
  },
  {
    country: 'gr',
    name: 'שגרירות ישראל באתונה',
    where: 'לסנטוריני ולמיקונוס',
    address: 'Marathonodromon 1, Psychiko, Athens',
    lines: [
      { label: 'מרכזייה', number: '+30 210 670 5500' },
      { label: 'חירום (הודעות ווטסאפ בלבד)', number: '+30 694 427 1668', whatsapp: true },
    ],
    note: 'לפי השגרירות: אם הדרכון אבד או נגנב כשהשגרירות סגורה, מגישים תלונה במשטרה המקומית (100) ושולחים ווטסאפ למספר החירום.',
  },
  {
    country: 'tr',
    name: 'הקונסוליה הכללית באיסטנבול',
    where: 'לקושאדסי',
    address: 'Levent, Cömert Sk No:1C, Beşiktaş, İstanbul',
    lines: [
      { label: 'טלפון חירום', number: '+90 531 305 97 88' },
      { label: 'כללי', number: '+90 212 317 65 00' },
      { label: 'חירום, שגרירות אנקרה', number: '+90 532 305 97 88' },
    ],
    note: 'השגרירות באנקרה סגורה לשירותים קונסולריים. משרד החוץ מזהיר שבטורקיה עלול להיות קושי במתן סיוע.',
  },
];

const Emergency = () => (
  <div className="page">
    <article className="card">
      <header className="card__header">
        <h1 className="card__title">חירום ומידע חשוב 🆘</h1>
        <p className="card__lead">מספרי חירום, נציגויות ישראל, אזהרות מסע ומה עושים כשמשהו משתבש</p>
      </header>

      <div className="card__body">
        <section className="section">
          <div className="sos">
            <p className="sos__number"><a href="tel:112" dir="ltr">112</a></p>
            <p className="sos__text">
              <strong>מספר החירום בכל היעדים בטיול</strong> (איטליה, יוון וטורקיה): משטרה, אמבולנס וכיבוי אש, מכל טלפון.
            </p>
          </div>
          <ul className="prose">
            <li><strong>על הספינה:</strong> בחירום מתקשרים מהטלפון שבחדר. מספר החירום של הספינה כתוב על הטלפון עצמו. יש על הספינה מרכז רפואי, והטיפול בו בתשלום (ביטוח הנסיעות מכסה אותו בדרך כלל).</li>
            <li><strong>משטרת יוון:</strong> <a href="tel:100">100</a></li>
            <li>
              <strong>חדר המצב של משרד החוץ, 24/7:</strong> <Phone number="+972 2 530 3155" /> לישראלים בחו״ל שנקלעו לחירום או למצוקה, כשאין מענה מהנציגות.
            </li>
          </ul>
        </section>

        <section className="section" id="warnings">
          <h2 className="section__title">אזהרות מסע ⚠️</h2>
          <TravelWarning />
        </section>

        <section className="section" id="missions">
          <h2 className="section__title">נציגויות ישראל</h2>
          <div className="missions">
            {missions.map((m) => (
              <div key={m.name} className="mission">
                <h3 className="mission__name"><Flag code={m.country} /> {m.name}</h3>
                <p className="mission__where">{m.where} · <span dir="ltr">{m.address}</span></p>
                <ul className="mission__lines">
                  {m.lines.map((l) => (
                    <li key={l.number}><span>{l.label}:</span> <Phone number={l.number} whatsapp={l.whatsapp} /></li>
                  ))}
                </ul>
                {m.note && <p className="mission__note">{m.note}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="section prose" id="ship">
          <h2 className="section__title">קשר עם הספינה 🚢</h2>
          <ul>
            <li>
              <strong>מהבית לספינה:</strong> קרובים בארץ יכולים להתקשר לספינה ב-<Phone number="+1 321 953 9003" />. העלות <span dir="ltr">$7.95</span> לדקה, בכרטיס אשראי, ועוד עלות השיחה לחו״ל. צריך לומר את שם הספינה (Odyssey of the Seas), את שם האורח ואת מספר החדר.
            </li>
            <li><strong>בין בני המשפחה על הספינה:</strong> צ׳אט באפליקציה של Royal Caribbean דרך ה-Wi-Fi של הספינה, או מהטלפון בחדר לחדר.</li>
            <li>
              <strong>מספרי החדרים שלנו:</strong> ב<Link to="/cabin">דף פרטי החדר</Link>. כדאי לשלוח אותם גם לקרובים בארץ.
            </li>
          </ul>
        </section>

        <section className="section prose" id="what-if">
          <h2 className="section__title">מה עושים אם…</h2>
          <h3 className="subhead">מאחרים לחזור לספינה</h3>
          <ul>
            <li>הספינה לא מחכה לנוסעים שמאחרים מטיול עצמאי. ה-All Aboard הוא חצי שעה לפני ההפלגה, ובמסך ״היום״ בדף הבית יש ספירה לאחור.</li>
            <li>אם ברור שלא תספיקו: מתקשרים לסוכן הנמל של הספינה. המספר מופיע בתוכנייה היומית (Cruise Compass), אז כדאי לצלם אותה בבוקר.</li>
            <li>מי שפספס את הספינה מגיע לנמל הבא על חשבונו, ובשביל זה צריך דרכון. לכן כדאי לצאת לחוף עם תעודה מזהה, כרטיס SeaPass וצילום של הדרכון בטלפון.</li>
          </ul>
          <h3 className="subhead">הדרכון אבד או נגנב</h3>
          <ul>
            <li>מגישים תלונה במשטרה המקומית ושומרים את האישור.</li>
            <li>פונים לנציגות ישראל במדינה (למעלה). אם זה קרה בנמל, מעדכנים גם את דלפק Guest Services בספינה.</li>
          </ul>
          <h3 className="subhead">מישהו מהקבוצה לא עונה</h3>
          <ul>
            <li>קובעים מראש נקודת מפגש בכל נמל ושעה לחזור אליה, ונותנים לילדים פתק עם שם הספינה, מספר החדר ומספר טלפון של מבוגר.</li>
            <li>על הספינה: פונים לדלפק Guest Services.</li>
          </ul>
          <h3 className="subhead">בעיה רפואית בחוף</h3>
          <ul>
            <li>בחירום: <a href="tel:112">112</a>. כשאפשר, מתקשרים גם למוקד 24 השעות של ביטוח הנסיעות, לפני שמשלמים על טיפול.</li>
            <li>שמרו בטלפון את מספר המוקד ואת מספר הפוליסה של ביטוח הנסיעות. בכוונה לא שומרים אותם כאן באתר.</li>
          </ul>
        </section>

        <section className="section prose" id="before-ashore">
          <h2 className="section__title">לפני שיורדים לחוף ✅</h2>
          <ul className="checklist-static">
            <li>כרטיס SeaPass ותעודה מזהה (ומי שצריך, דרכון)</li>
            <li>שעת ה-All Aboard ומספר סוכן הנמל מהתוכנייה היומית</li>
            <li>טלפון טעון, ומטען נייד</li>
            <li>מזומן קטן במטבע המקומי</li>
            <li>מים, כובע וקרם הגנה</li>
          </ul>
        </section>

        <p className="tip">
          המספרים נבדקו מול האתרים הרשמיים של משרד החוץ ו-Royal Caribbean בספטמבר 2026. כדאי לבדוק אותם שוב לפני הטיסה, ולשמור את החשובים גם באנשי הקשר בטלפון.
        </p>
      </div>
    </article>
  </div>
);

export default Emergency;
