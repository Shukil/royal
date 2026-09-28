import { photos } from './photos';
import Gallery, { Photo } from './Gallery';
import Spots from './Spots';

// תרשים הסיפונים הרשמי באתר של Royal Caribbean
const DECK_PLANS_URL = 'https://www.royalcaribbean.com/cruise-ships/odyssey-of-the-seas/deck-plans';

const toc = [
  { id: 'stats', label: 'נתונים' },
  { id: 'history', label: 'היסטוריה' },
  { id: 'dining', label: 'מסעדות' },
  { id: 'bars', label: 'ברים' },
  { id: 'attractions', label: 'אטרקציות' },
  { id: 'shows', label: 'מופעים' },
  { id: 'more', label: 'עוד על הספינה' },
];

const stats = [
  { label: 'אורך', value: '347 מ׳' },
  { label: 'רוחב מרבי', value: '49.4 מ׳' },
  { label: 'גובה', value: '72 מ׳' },
  { label: 'שוקע (Draft)', value: '8.7 מ׳' },
  { label: 'תפוסה ברוטו', value: '169,379 GT' },
  { label: 'סיפונים', value: '16 (14 לאורחים)' },
  { label: 'מהירות', value: '22 קשר (כ-41 קמ״ש)' },
  { label: 'אורחים', value: '4,284 (עד 5,510)' },
  { label: 'אנשי צוות', value: '1,663' },
  { label: 'חדרים', value: '2,105' },
  { label: 'מחלקה', value: 'Quantum Ultra' },
  { label: 'דגל', value: 'נסאו, איי בהאמה' },
];

const timeline = [
  { date: 'יוני 2015', text: 'Royal Caribbean מזמינה את הספינה' },
  { date: 'פברואר 2019', text: 'חיתוך הפלדה במספנת Meyer Werft בפפנבורג, גרמניה' },
  { date: 'נובמבר 2020', text: 'הספינה יוצאת מהמספנה לראשונה' },
  { date: 'מרץ 2021', text: 'מסירה לחברה, בטקס וירטואלי בגלל הקורונה' },
  { date: 'יולי 2021', text: 'ההפלגה הראשונה, לדרום הקריביים' },
  { date: 'נובמבר 2021', text: 'טקס הטבילה, עם הספורטאית הפראלימפית ארין בראון כסנדקית' },
];

const includedDining = [
  { name: 'Main Dining Room', where: 'חדר האוכל הראשי', note: 'ארוחות ערב בשירות מלא, תפריט שמתחלף כל ערב.' },
  { name: 'Windjammer', where: 'מזנון', note: 'בופה גדול לארוחות בוקר, צהריים וערב.' },
  { name: "Sorrento's", where: 'פיצרייה', note: 'פיצה במשולשים, פתוח עד מאוחר.' },
  { name: 'El Loco Fresh', where: 'מקסיקני', note: 'טאקו, בוריטו וקסדייה ליד הבריכה.' },
  { name: 'Café Promenade', where: 'בית קפה', note: 'מאפים, כריכים וקפה בסיסי.' },
  { name: 'The Café @ Two70', where: 'בית קפה', note: 'סלטים, מרקים וכריכים מול הנוף מירכתי הספינה.' },
  { name: 'Solarium Bistro', where: 'סולריום', note: 'אוכל קליל ובריא יותר במתחם המבוגרים.' },
  { name: 'Sprinkles', where: 'גלידה', note: 'גלידה אמריקאית רכה, בחינם.' },
];

const specialtyDining = [
  { name: 'Chops Grille', where: 'סטייקהאוס', note: 'נתחי בשר איכותיים. התשלום בנפרד.' },
  { name: "Giovanni's Italian Kitchen", where: 'איטלקי', note: 'פסטות, פיצות ובר יין.' },
  { name: 'Izumi', where: 'סושי ויפני', note: 'סושי ומנות יפניות, בתשלום לפי מנה.' },
  { name: 'Teppanyaki', where: 'יפני על הפלאנצ׳ה', note: 'שף שמבשל ומופיע מול השולחן.' },
  { name: 'Wonderland', where: 'גסטרונומיה יצירתית', note: 'מנות בהשראת "עליסה בארץ הפלאות".' },
  { name: 'Hooked Seafood', where: 'פירות ים', note: 'לובסטר רול, צדפות ועוגות סרטנים.' },
];

const bars = [
  { name: 'Bionic Bar', where: 'בר רובוטים', note: 'שתי זרועות רובוטיות מכינות את הקוקטייל שהזמנתם בטאבלט.' },
  { name: 'Lime & Coconut', where: 'סיפון הבריכה', note: 'שלושה ברים טרופיים, עם מוזיקה חיה ליד הבריכה.' },
  { name: 'Schooner Bar', where: 'בר פסנתר', note: 'קוקטיילים ופסנתר חי, ליד Chops Grille.' },
  { name: 'Playmakers', where: 'בר ספורט וארקייד', note: 'מסכי ספורט, אוכל ומשחקי ארקייד.' },
  { name: 'Music Hall', where: 'מועדון הופעות', note: 'להקות חיות וג׳אם סשנים עד מאוחר.' },
];

const attractions = [
  { title: 'RipCord by iFLY', body: 'סימולטור צניחה חופשית במנהרת רוח, בלב הים.' },
  { title: 'FlowRider', body: 'סימולטור גלישת גלים על הסיפון העליון.' },
  { title: 'North Star', body: 'קפסולת זכוכית שמתרוממת לגובה של יותר מ-90 מטר מעל פני הים. בתשלום.' },
  { title: 'SeaPlex', body: 'מתחם הספורט הגדול בצי: מכוניות מתנגשות, כדורסל, החלקה על גלגיליות ולייזר טאג.' },
  { title: 'קיר טיפוס', body: 'קיר טיפוס סלעים עם נוף לים.' },
  { title: 'בריכות וג׳קוזי', body: 'בריכות מרכזיות, ג׳קוזי תלויים מעל הים וסולריום מקורה למבוגרים בלבד.' },
  { title: 'Splashaway Bay', body: 'פארק מים לילדים עם מגלשות ומתזים.' },
  { title: 'Adventure Ocean', body: 'מועדוני ילדים לפי גילאים, ומועדון נפרד לבני נוער.' },
];

const shows = [
  { name: 'The Book', where: 'Two70', note: 'מסע בשבעה פרקים שמשלב אקרובטיקה, מסכים רובוטיים והקרנות ענק על חלונות המירכתיים. חינם, אבל צריך להזמין מקום מראש.' },
  { name: 'Showgirl!', where: 'Royal Theater', note: 'Past, Present, Future: מופע ריקוד נוצץ בהשראת הרביו של פריז ולאס וגאס.' },
  { name: 'The Effectors', where: 'Royal Theater', note: 'חבורת גיבורי-על נלחמת ברשע Crash ובצבא הרחפנים שלו, עם אפקטים ורחפנים מעופפים.' },  { name: 'Casino Royale', note: 'קזינו עם שולחנות ומכונות.' },
  { name: 'Comedy & Karaoke', note: 'מועדון סטנדאפ וערבי קריוקי.' },
];

const OdysseyInfo = () => (
  <div className="page">
    <article className="card">
      <header className="card__header">
        <h1 className="card__title">על האודיסי 🚢</h1>
        <p className="card__lead">Odyssey of the Seas · Royal Caribbean</p>
      </header>

      <div className="card__body">
        <nav className="toc" aria-label="תוכן העמוד">
          {toc.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="toc__link">{t.label}</a>
          ))}
        </nav>

        <Photo photo={photos.ship.hero} className="photo--hero" />

        <section className="section prose">
          <p>
            Odyssey of the Seas היא אחת הספינות החדשות של Royal Caribbean, מהדור המתקדם של מחלקת Quantum. היא נבנתה בגרמניה ונכנסה לשירות ב-2021, ומשלבת טכנולוגיה (בר רובוטים, מסכים רובוטיים וסימולטור צניחה) עם כל מה שספינת נופש גדולה מציעה: 15 מסעדות, בריכות, מופעים ומתחמי ספורט.
          </p>
        </section>

        <aside className="deck-plan" aria-labelledby="deck-plan-title">
          <div>
            <h2 id="deck-plan-title" className="deck-plan__title">🗺️ תרשים הסיפונים הרשמי</h2>
            <p className="deck-plan__text">
              המפה המלאה של כל סיפוני הספינה באתר של Royal Caribbean: חדרים, מסעדות, בריכות ואטרקציות. החדרים שלנו בסיפון 10.
            </p>
          </div>
          <a className="btn btn--primary" href={DECK_PLANS_URL} target="_blank" rel="noreferrer">
            לתרשים באתר Royal Caribbean ↗
          </a>
        </aside>

        <section className="section" id="stats">
          <h2 className="section__title">נתונים טכניים</h2>
          <dl className="facts">
            {stats.map((s) => (
              <div key={s.label} className="fact">
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="tip">
            לשם השוואה: האונייה ארוכה יותר מ-3 מגרשי כדורגל, וגבוהה כמו בניין של כ-24 קומות. על כל 2.6 אורחים יש איש צוות אחד.
          </p>
        </section>

        <section className="section" id="history">
          <h2 className="section__title">היסטוריה קצרה</h2>
          <ol className="timeline">
            {timeline.map((t) => (
              <li key={t.date} className="timeline__item">
                <span className="timeline__date">{t.date}</span>
                <span>{t.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="section" id="dining">
          <h2 className="section__title">מסעדות 🍽️</h2>
          <h3 className="subhead">כלולות במחיר</h3>
          <Spots items={includedDining} />
          <h3 className="subhead">מסעדות מיוחדות (בתשלום נוסף)</h3>
          <Spots items={specialtyDining} />
          <Gallery photos={photos.ship.dining} featured={false} />
          <p className="tip">
            כדאי להזמין מקום במסעדות המיוחדות מראש באפליקציה של Royal Caribbean. חבילות ארוחות שנקנות מראש יכולות לצאת משתלמות יותר.
          </p>
        </section>

        <section className="section" id="bars">
          <h2 className="section__title">ברים ולאונג׳ים 🍹</h2>
          <p className="prose">יש בספינה 14 ברים, כולל שלושה ברים על סיפון הבריכה. כמה מהבולטים:</p>
          <Spots items={bars} />
        </section>

        <section className="section" id="attractions">
          <h2 className="section__title">אטרקציות 🎢</h2>
          <div className="routes">
            {attractions.map((a) => (
              <div key={a.title} className="route">
                <h3 className="route__title">{a.title}</h3>
                <p className="route__note">{a.body}</p>
              </div>
            ))}
          </div>
          <Gallery photos={photos.ship.attractions} />
        </section>

        <section className="section" id="shows">
          <h2 className="section__title">מופעים ובידור 🎭</h2>
          <Spots items={shows} />
          <Gallery photos={photos.ship.shows} featured={false} />
        </section>

        <section className="section prose" id="more">
          <h2 className="section__title">עוד על הספינה</h2>
          <ul>
            <li><strong>אפליקציה:</strong> באפליקציה של Royal Caribbean מתכננים את היום, מזמינים מסעדות ומופעים, ומקבלים את הלו״ז היומי.</li>
            <li><strong>כרטיס SeaPass:</strong> משמש כמפתח לחדר, כתעודה בעלייה ובירידה מהספינה, וכאמצעי תשלום על הסיפון.</li>
            <li><strong>מטבע על הסיפון:</strong> דולר אמריקאי. החיובים נרשמים לחשבון החדר ומשולמים בסוף ההפלגה.</li>
            <li><strong>ספא וכושר:</strong> Vitality Spa וחדר כושר עם נוף לים.</li>
            <li><strong>אינטרנט:</strong> חבילת Voom לאינטרנט מהיר בלוויין, בתשלום.</li>
          </ul>
          <Photo photo={photos.ship.more[0]} className="photo--wide" />
          <p className="tip">
            הנתונים לפי ויקיפדיה ו-Royal Caribbean. רשימת המסעדות, הברים והמופעים מתעדכנת מדי פעם, אז כדאי לבדוק באפליקציה לקראת ההפלגה.
          </p>
        </section>
      </div>
    </article>
  </div>
);

export default OdysseyInfo;
