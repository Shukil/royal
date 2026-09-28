import { Link } from 'react-router-dom';
import { cabins, DECK, findCabin } from './cabins';
import { firstNameOf, getUser } from './session';

const DECK_PLAN_URL = 'https://www.cruisedeckplans.com/DP/deckplans/deckbydeck.php?ship=Odyssey-of-the-Seas&deck=10';

const CabinDetails = () => {
  const user = getUser();
  const cabin = findCabin(user);
  const firstName = firstNameOf(user);
  const roommates = cabin?.guests.filter((g) => g !== firstName) ?? [];

  return (
    <div className="page">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">פרטי החדר שלך</h1>
          <p className="card__lead">Odyssey of the Seas · הפלגה בים התיכון</p>
        </header>

        <div className="card__body">
          {!user && (
            <p className="alert alert--error" role="alert">
              כדי לראות את פרטי החדר שלך צריך <Link to="/login">להתחבר</Link>.
            </p>
          )}

          {user && !cabin && (
            <p className="alert alert--error" role="alert">
              לא מצאנו חדר ששויך לשם {firstName}. ודא שנרשמת עם השם הפרטי שלך.
            </p>
          )}

          {cabin && (
            <>
              <section className="section">
                <h2 className="section__title">
                  {cabin.type} <span dir="ltr">({cabin.typeEn})</span>
                </h2>

                <dl className="facts">
                  <div className="fact">
                    <dt>מספר חדר</dt>
                    <dd>{cabin.number}</dd>
                  </div>
                  <div className="fact">
                    <dt>סיפון (Deck)</dt>
                    <dd>{DECK}</dd>
                  </div>
                  <div className="fact">
                    <dt>קטגוריה</dt>
                    <dd dir="ltr">{cabin.category}</dd>
                  </div>
                  <div className="fact">
                    <dt>שותפים לחדר</dt>
                    <dd>{roommates.length ? roommates.join(', ') : cabin.guests.join(' ו')}</dd>
                  </div>
                  <div className="fact">
                    <dt>גודל החדר</dt>
                    <dd>{cabin.size}</dd>
                  </div>
                  {cabin.balcony && (
                    <div className="fact">
                      <dt>מרפסת</dt>
                      <dd>{cabin.balcony}</dd>
                    </div>
                  )}
                  <div className="fact">
                    <dt>תפוסה מקסימלית</dt>
                    <dd>עד {cabin.maxGuests} אורחים</dd>
                  </div>
                </dl>

                <p className="prose">{cabin.note}</p>
              </section>

              <section className="section">
                <h2 className="section__title">מה יש בחדר</h2>
                <ul className="amenities">
                  <li>{cabin.beds}</li>
                  {cabin.amenities.map((a) => <li key={a}>{a}</li>)}
                </ul>
                <p className="tip">
                  הגודל הוא ממוצע לקטגוריה לפי אתרי מפות הסיפונים, והפרטים עשויים להשתנות. הפרטים המחייבים מופיעים באישור ההזמנה של Royal Caribbean.
                </p>
              </section>
            </>
          )}

          <section className="section">
            <h2 className="section__title">החדרים של החבורה</h2>
            <div className="table-wrap">
              <table className="metro">
                <thead>
                  <tr>
                    <th scope="col">חדר</th>
                    <th scope="col">אורחים</th>
                    <th scope="col">סוג</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(cabins).map(([number, c]) => (
                    <tr key={number} aria-current={cabin?.number === number ? 'true' : undefined}>
                      <td>{number}</td>
                      <td>{c.guests.join(' ו')}</td>
                      <td>{c.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <a href={DECK_PLAN_URL} target="_blank" rel="noreferrer" className="btn btn--primary btn--block">
            צפה בתוכנית סיפון 10 (Deck Plan)
          </a>
        </div>
      </article>
    </div>
  );
};

export default CabinDetails;
