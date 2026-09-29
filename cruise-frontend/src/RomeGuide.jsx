import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { photos } from './photos';
import { destinations, guideOrder } from './destinations';
import Gallery, { Photo } from './Gallery';
import Spots from './Spots';
import CurrencyRates from './CurrencyRates';
import Weather from './Weather';
import TravelWarning from './TravelWarning';

const GuideMap = lazy(() => import('./GuideMap'));

const toc = [
  { id: 'port', label: 'הגעה לאונייה' },
  { id: 'about', label: 'על רומא' },
  { id: 'weather', label: 'מזג אוויר' },
  { id: 'photos', label: 'תמונות' },
  { id: 'routes', label: 'מסלולי הליכה' },
  { id: 'sites', label: 'אתרים' },
  { id: 'map', label: 'מפה' },
  { id: 'vatican', label: 'הוותיקן' },
  { id: 'food', label: 'אוכל' },
  { id: 'shopping', label: 'קניות' },
  { id: 'transport', label: 'תחבורה וטיפים' },
];

const facts = [
  { label: 'כינוי', value: 'העיר הנצחית' },
  { label: 'נוסדה (לפי המסורת)', value: '753 לפנה"ס' },
  { label: 'נהר', value: 'הטיבר (Tevere)' },
  { label: 'עונות מומלצות', value: 'אפריל–מאי, ספט׳–אוק׳' },
  { label: 'מטבע', currencies: ['EUR'] },
];

const routes = [
  {
    title: 'הצפון והקניות',
    stops: ['פיאצה דל פופולו', 'ויה דל קורסו', 'ויה קונדוטי', 'המדרגות הספרדיות', 'מזרקת טרווי'],
    note: 'חצי יום של הליכה נינוחה, רובה ברחובות קניות.',
  },
  {
    title: 'רומא העתיקה',
    stops: ['הקולוסאום', 'שער טיטוס', 'הפורום הרומאי', 'כיכר ונציה'],
    note: 'כדאי להתחיל מוקדם בבוקר, לפני החום והתורים.',
  },
  {
    title: 'המרכז ההיסטורי',
    stops: ['הפנתאון', 'פיאצה נבונה', 'קמפו דה פיורי', 'רחובות בעלי המלאכה'],
    note: 'קפה בדרך ב-Sant’Eustachio, שני צעדים מהפנתאון.',
  },
  {
    title: 'טרסטוורה והג׳יאנקולו',
    stops: ['שוק פורטה פורטזה (ראשון בבוקר)', 'שכונת טרסטוורה', 'גשר פבריציו', 'גבעת הג׳יאנקולו'],
    note: 'השכונה מתעוררת בערב, מקום טוב לארוחת ערב.',
  },
];

const sites = [
  {
    name: 'הקולוסאום',
    en: 'Colosseo',
    body: 'אמפיתיאטרון שבנייתו החלה בשנת 72 לספירה בימי אספסיאנוס והסתיימה בימי טיטוס. הכיל מעל 50 אלף צופים שצפו בקרבות גלדיאטורים. לאורך השנים נשדדו השיש, הפסלים ואפילו מוטות הברזל ושימשו כחומרי בנייה בעיר. מטרו B, תחנת Colosseo.',
  },
  {
    name: 'שער טיטוס',
    en: 'Arco di Tito',
    body: 'שער ניצחון בפורום, שהקדיש הקיסר דומיטיאנוס לאחיו טיטוס בשנת 82 לספירה לציון דיכוי המרד הגדול. בחלקו הפנימי תבליט מפורסם של תהלוכת השלל מירושלים, כולל המנורה.',
  },
  {
    name: 'הפורום הרומאי',
    en: 'Forum Romanum',
    body: 'מרכז רומא העתיקה, בין גבעת הקפיטולין (מושב השלטון) לגבעת הפלטין (מושב האצולה). כאן התקיימו אסיפות העם ובתי המשפט, ובמרכזו עברה "הדרך הקדושה" של תהלוכות הניצחון.',
  },
  {
    name: 'פיאצה דל פופולו',
    en: 'Piazza del Popolo',
    body: '"כיכר העם", שער הכניסה הצפוני לעיר במשך מאות שנים. באמצעה אובליסק ובקצה שתי כנסיות תאומות. בכנסיית סנטה מריה דל פופולו תלויים שני ציורים של קאראווג׳ו.',
  },
  {
    name: 'המדרגות הספרדיות',
    en: 'Piazza di Spagna',
    body: 'המדרגות מחברות את כיכר אספניה לכנסייה הצרפתית טריניטה די מונטי שבראש הגבעה. במאי הן יפות במיוחד, כשהאזליאות הוורודות פורחות. מטרו A, תחנת Spagna.',
  },
  {
    name: 'מזרקת טרווי',
    en: 'Fontana di Trevi',
    body: 'המזרקה המפורסמת ברומא, שהושלמה ב-1762. במרכזה נפטון על מרכבת צדף שסוחבים שני סוסי ים, אחד רגוע ואחד סוער, כמו הים. המנהג: לזרוק מטבע כשהגב למזרקה, כדי לחזור לרומא.',
  },
  {
    name: 'הפנתאון',
    en: 'Pantheon',
    body: 'מקדש רומי מ-125 לספירה שהפך לכנסייה במאה ה-7. הכיפה, בקוטר 43 מטר עם פתח עגול (אוקולוס) במרכזה, היא כיפת הבטון הלא-מזוין הגדולה בעולם שנשתמרה.',
  },
  {
    name: 'פיאצה נבונה',
    en: 'Piazza Navona',
    body: 'כיכר אובלית שנבנתה על שרידי אצטדיון של הקיסר דומיטיאנוס. במרכזה מזרקת ארבעת הנהרות של ברניני, המייצגת את הנילוס, הגנגס, הדנובה והריו דה לה פלאטה.',
  },
  {
    name: 'קמפו דה פיורי',
    en: "Campo de' Fiori",
    body: 'כיכר עם שוק ירקות ופרחים בבקרים ואזור בילוי בערבים. במרכזה פסלו של ג׳ורדנו ברונו, שהועלה כאן על המוקד. מסביב רחובות בעלי המלאכה: Via dei Giubbonari, Via dei Cappellari, Via dei Baullari ו-Via dei Balestrari.',
  },
  {
    name: 'מבצר סנט אנג׳לו',
    en: "Castel Sant'Angelo",
    body: 'נבנה כקבר לקיסר אדריאנוס (הקיסר של מרד בר כוכבא) והפך למבצר ולמקלט של האפיפיורים, עם מעבר סודי מהוותיקן. גשר סנט אנג׳לו שלפניו הוא גשר רומי עתיק להולכי רגל.',
  },
  {
    name: 'כיכר ונציה',
    en: 'Piazza Venezia',
    body: 'הכיכר המרכזית של רומא המודרנית, לרגלי הקפיטול, ליד הפורום ולאנדרטת ויטוריו עמנואל השני.',
  },
  {
    name: 'וילה בורגזה והגלריה',
    en: 'Villa & Galleria Borghese',
    body: 'פארק ענק וגלריה עם פסלי ברניני (אפולו ודפני, דוד) וציורים של טיציאן, רפאל וקאראווג׳ו. לגלריה חובה להזמין כרטיס מראש. מטרו A, תחנת Spagna, ומשם לפי השילוט.',
  },
  {
    name: 'טרסטוורה וגשר פבריציו',
    en: 'Trastevere · Ponte Fabricio',
    body: 'שכונה אותנטית של סמטאות צרות וכיכרות, שמתעוררת בערב. גשר פבריציו, "גשר ארבעת הראשים", כונה בעבר "גשר היהודים" ומוביל לאזור הגטו היהודי ההיסטורי.',
  },
  {
    name: 'גבעת הג׳יאנקולו',
    en: 'Gianicolo',
    body: 'מכיכר גריבלדי שבראש הגבעה נשקף אחד הנופים היפים על רומא. בדרך: הטמפייטו של ברמנטה, שנחשב לבניין בעל הפרופורציות המושלמות של הרנסנס.',
  },
  {
    name: 'מוזיאון MAXXI',
    en: 'Via Guido Reni 4A',
    body: 'מוזיאון לאמנות ועיצוב עכשוויים בתכנון זאהה חדיד, עם רמפות וגשרי בטון מתעקלים. אפשר ליהנות מהבניין ומהחללים הפתוחים גם בלי להיכנס לגלריות.',
  },
];

const sistine = [
  { title: 'תקרת מיכלאנג׳לו', body: 'תשעה ציורים מספר בראשית: שלושה מסיפור נח, שלושה מגן העדן (כולל בריאת האדם והמגע באצבע) ושלושה מבריאת העולם. מסביב נביאים וסיבילות.' },
  { title: 'יום הדין', body: 'הפרסקו על קיר המזבח, שצויר כ-20 שנה אחרי התקרה, עם יותר מ-200 דמויות. ישו במרכז כשופט, הצדיקים עולים והחוטאים נופלים.' },
  { title: 'קירות חיי משה וישו', body: 'שני מחזורים מקבילים מאת בוטיצ׳לי, פרוג׳ינו, רוסלי ואחרים. חפשו את משה עם קרניים, את לוחות הברית המרובעים ואת ים סוף הצבוע באדום.' },
];

const food = [
  { name: 'Su & Giu Cucina Romana', where: 'Via Tacito 42, פראטי', note: 'טרטוריה משפחתית קטנה, מחירים טובים. להזמין מקום.' },
  { name: 'Ad Hoc', where: 'Via di Ripetta 43', note: 'מסעדה מעולה ליד פיאצה דל פופולו.' },
  { name: 'Al Musei', where: 'Via Santamaura, ליד מוזיאון הוותיקן', note: 'אחרי הסיור בוותיקן.' },
  { name: 'Pinsere Roma', where: 'Via Flavia 98', note: 'פינסה רומאית. פתוח בצהריים בלבד, בימי חול.' },
  { name: 'Pasta Imperiale', where: 'Via dei Coronari', note: 'פסטה טרייה של אמא ובן, ארבעה שולחנות.' },
  { name: 'Gelateria dei Gracchi', where: 'Via dei Gracchi 272', note: 'גלידה.' },
  { name: 'Castroni', where: 'Via Cola di Rienzo 196', note: 'מעדנייה ענקית: קפה, גבינות, נקניקים וכמהין.' },
  { name: "Sant'Eustachio Il Caffè", where: "Piazza Sant'Eustachio 82", note: 'בית קפה מ-1938 ליד הפנתאון. על הבר, כמו המקומיים, זה זול יותר.' },
];

const shopping = [
  { name: 'מותגי יוקרה', where: 'Via Condotti, Via Frattina, Via Borgognona', note: 'בין פיאצה די ספניה לוויה דל קורסו.' },
  { name: 'רשתות ומחירים נוחים', where: 'Via del Corso, Via Nazionale, Via dei Giubbonari', note: 'בוויה דל קורסו יש כמה סניפים של זארה ו-H&M.' },
  { name: 'ליד הוותיקן', where: 'Via Cola di Rienzo', note: 'רחוב קניות ארוך של בגדים, נעליים ותיקים.' },
  { name: 'La Rinascente', where: 'Via del Corso 189', note: 'כלבו אלגנטי, פתוח גם בימי ראשון.' },
  { name: 'Euroma2', where: 'Via Cristoforo Colombo / Viale dell’Oceano Pacifico 83', note: 'קניון גדול עם כ-200 חנויות. מטרו B עד EUR Fermi ומשם אוטובוס קצר או מונית.' },
  { name: 'שוק פורטה פורטזה', where: 'Via Portuense, טרסטוורה', note: 'שוק פשפשים ענק, בימי ראשון בבוקר בלבד. מזומן בלבד, מתמקחים.' },
  { name: 'C.U.C.I.N.A', where: 'Piazza Euclide 40', note: 'חנות מעוצבת לכלי מטבח ואקססוריז.' },
];

const metro = [
  { stop: 'Colosseo', line: 'B', what: 'הקולוסאום והפורום' },
  { stop: 'Spagna', line: 'A', what: 'המדרגות הספרדיות, ויה דל קורסו, טרווי (הליכה)' },
  { stop: 'Flaminio', line: 'A', what: 'פיאצה דל פופולו' },
  { stop: 'Ottaviano / Cipro', line: 'A', what: 'כיכר סן פטרוס / מוזיאון הוותיקן' },
  { stop: 'Termini', line: 'A+B', what: 'תחנת הרכבת המרכזית, רכבות לצ׳יוויטווקיה' },
  { stop: 'EUR Fermi', line: 'B', what: 'קניון Euroma2' },
];

const RomeGuide = () => (
  <div className="page">
    <article className="card">
      <header className="card__header">
        <h1 className="card__title">המדריך לרומא 🏛️</h1>
        <p className="card__lead">הכנות, טיולים והגעה לנמל צ'יוויטווקיה (Civitavecchia)</p>
      </header>

      <div className="card__body">
        <nav className="toc" aria-label="תוכן המדריך">
          {toc.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="toc__link">{t.label}</a>
          ))}
        </nav>

        <TravelWarning country="it" compact />

        <section className="section prose" id="port">
          <h2 className="section__title">הגעה לאונייה 🚢</h2>
          <p>
            ה-Odyssey of the Seas מפליגה ב-15.08.2027 בשעה 15:00 בערך מנמל צ'יוויטווקיה, כ-80 ק"מ צפונית-מערבית למרכז רומא.
          </p>
          <ul>
            <li><strong>ברכבת:</strong> רכבת אזורית מ-Roma Termini, Roma San Pietro או Roma Ostiense לתחנת Civitavecchia, כשעה עד שעה ועשרים. מהתחנה כ-10 דקות הליכה לשער הנמל.</li>
            <li><strong>בתוך הנמל:</strong> אסור ללכת ברגל בין הרציפים. שאטל חינמי של הנמל יוצא מהשער (Largo della Pace) אל המסופים. שם המסוף מופיע באישור ההזמנה ובאפליקציה.</li>
            <li><strong>העברה פרטית או מונית ספיישל:</strong> הכי נוח עם מזוודות ובקבוצה, כשעה ורבע מהמלון.</li>
            <li><strong>ביום העלייה:</strong> כדאי להגיע בצהריים. מזוודות גדולות מוסרים לסבלים במסוף והן מגיעות לחדר עד הערב, אז לשמור בתיק היד בגד ים ותרופות.</li>
            <li><strong>בחזרה (22.08):</strong> הספינה חוזרת ב-05:00. לשדה פיומיצ'ינו כ-60–75 דקות נסיעה, ואין רכבת ישירה, אז כדאי להזמין העברה מראש.</li>
          </ul>
          <p><Link to="/itinerary">למסלול ההפלגה המלא ←</Link></p>
          <Photo photo={photos.rome.port} className="photo--wide" />
        </section>

        <section className="section" id="about">
          <h2 className="section__title">על רומא בקצרה</h2>
          <dl className="facts">
            {facts.map((f) => (
              <div key={f.label} className={f.currencies ? 'fact fact--wide' : 'fact'}>
                <dt>{f.label}</dt>
                <dd>{f.currencies ? <CurrencyRates codes={f.currencies} /> : f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="prose">
            <p>
              לפי האגדה, רומא נוסדה על ידי רומולוס, שגדל עם אחיו התאום רמוס אצל זאבה על גדות הטיבר. העיר שלטה באימפריה שהשתרעה בשיאה, בימי טריאנוס, מצפון אנגליה ועד מסופוטמיה. כל קיסר השאיר בה את חותמו: אספסיאנוס בנה את הקולוסאום ואדריאנוס את קסטל סנט׳אנג׳לו. היום העיר כולה היא אתר מורשת עולמית של אונסק״ו, עם יותר מ-900 כנסיות.
            </p>
          </div>
        </section>

        <section className="section" id="weather">
          <h2 className="section__title">מזג האוויר 🌤️</h2>
          <Weather id="rome" />
        </section>

        <section className="section" id="photos">
          <h2 className="section__title">תמונות מרומא 📷</h2>
          <Gallery photos={photos.rome.gallery} />
        </section>

        <section className="section" id="routes">
          <h2 className="section__title">מסלולי הליכה מומלצים 🚶</h2>
          <div className="routes">
            {routes.map((r) => (
              <div key={r.title} className="route">
                <h3 className="route__title">{r.title}</h3>
                <ol className="route__stops">
                  {r.stops.map((s) => <li key={s}>{s}</li>)}
                </ol>
                <p className="route__note">{r.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="sites">
          <h2 className="section__title">אתרים שכדאי להכיר 📸</h2>
          <div className="sites">
            {sites.map((s) => (
              <details key={s.name} className="site">
                <summary className="site__summary">
                  <span>{s.name}</span>
                  <span className="site__en" dir="ltr">{s.en}</span>
                </summary>
                <p className="site__body">{s.body}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="section" id="vatican">
          <h2 className="section__title">הוותיקן ⛪</h2>
          <div className="prose">
            <p>
              המדינה הקטנה בעולם (כ-400 דונם), מרכז הכנסייה הקתולית. דורש חצי יום לפחות, ומומלץ בסיור מודרך בעברית ובכרטיסים שהוזמנו מראש.
            </p>
            <ul>
              <li><strong>מוזיאון הוותיקן:</strong> ארמונות האפיפיורים מתקופת הרנסנס, חדרי רפאל והקפלה הסיסטינית.</li>
              <li><strong>בזיליקת פטרוס הקדוש:</strong> הכנסייה הגדולה בעולם, עם החופה מברונזה של ברניני ופסל הפייטה של מיכלאנג׳לו.</li>
              <li><strong>כיכר סן פטרוס:</strong> תוכננה בידי ברניני, עם שתי אכסדראות עמודים מקושתות, אובליסק מצרי ושתי מזרקות.</li>
            </ul>
          </div>

          <h3 className="subhead">מה לחפש בקפלה הסיסטינית</h3>
          <div className="routes">
            {sistine.map((s) => (
              <div key={s.title} className="route">
                <h4 className="route__title">{s.title}</h4>
                <p className="route__note">{s.body}</p>
              </div>
            ))}
          </div>

          <p className="tip">
            <strong>קוד לבוש:</strong> כתפיים וברכיים מכוסות. אין להיכנס עם תיקי גב גדולים, רק תיק צד קטן.
          </p>
        </section>

        <section className="section" id="map">
          <h2 className="section__title">מפה 🗺️</h2>
          <p className="field__hint">⚓ הנמל, והמספרים לפי רשימת האתרים. לחיצה על נקודה פותחת ניווט ב-Google Maps.</p>
          <Suspense fallback={<p className="empty">טוען מפה…</p>}>
            <GuideMap id="rome" />
          </Suspense>
        </section>

        <section className="section" id="food">
          <h2 className="section__title">המלצות קולינריות 🍕</h2>
          <div className="prose">
            <p>
              ברומא כדאי להתרחק ממסעדות שנמצאות ממש על הפיאצות המרכזיות (מלכודות תיירים). חפשו טרטוריות קטנות בסמטאות, ונסו את המנות המקומיות: פסטה קרבונרה, קצ'ו א פפה (Cacio e Pepe), ופיצה רומאית דקה ופריכה.
            </p>
          </div>
          <Spots items={food} />
          <p className="tip">הרשימה נאספה לפני כמה שנים. כדאי לוודא שהמקום עדיין פתוח ולהזמין מקום מראש.</p>
        </section>

        <section className="section" id="shopping">
          <h2 className="section__title">קניות 🛍️</h2>
          <Spots items={shopping} />
        </section>

        <section className="section" id="transport">
          <h2 className="section__title">תחבורה וטיפים 🚇</h2>
          <div className="table-wrap">
            <table className="metro">
              <thead>
                <tr>
                  <th scope="col">תחנת מטרו</th>
                  <th scope="col">קו</th>
                  <th scope="col">מה יש שם</th>
                </tr>
              </thead>
              <tbody>
                {metro.map((m) => (
                  <tr key={m.stop}>
                    <td dir="ltr">{m.stop}</td>
                    <td><span className={`line line--${m.line === 'B' ? 'b' : m.line === 'A' ? 'a' : 'ab'}`}>{m.line}</span></td>
                    <td>{m.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="prose">
            <ul>
              <li><strong>Roma Pass:</strong> כרטיס ל-48 או 72 שעות שכולל תחבורה ציבורית חופשית, כניסה חינם לאתר הראשון (או לשניים הראשונים) והנחות בשאר. אפשר לנצל אותו לכרטיס המשולב לקולוסאום, לפורום ולפלטין. נמכר בשדה התעופה ובנקודות מידע לתיירים.</li>
              <li><strong>כייסים:</strong> להיזהר במיוחד בשווקים, במטרו, באוטובוסים ובאתרים הצפופים.</li>
              <li><strong>ברגל:</strong> רוב המרכז ההיסטורי קומפקטי, וההליכה בין האתרים היא חלק מהחוויה.</li>
              <li><strong>זיופים:</strong> רוכלי הרחוב בוויה דל קורסו מוכרים תיקי מותגים מזויפים. זו עבירה באיטליה, גם לקונה.</li>
            </ul>
          </div>
        </section>

        {/* אותו תפריט כמו בתחתית כל מדריך יעד. רומא היא העצירה הראשונה, אז במקום "הקודם" יש קישור לכל המדריכים */}
        <nav className="guide-nav" aria-label="מדריכים נוספים">
          <Link to="/guides" className="quick-link">🧭 כל המדריכים</Link>
          <Link to="/itinerary" className="quick-link">🗺️ המסלול המלא</Link>
          <Link to={`/guide/${guideOrder[0]}`} className="quick-link">{destinations[guideOrder[0]].name} ←</Link>
        </nav>
      </div>
    </article>
  </div>
);

export default RomeGuide;
