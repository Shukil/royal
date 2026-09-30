import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { search, serverEntries, snippet, staticEntries } from './searchIndex';

const EXAMPLES = ['רכבל', 'תודה ביוונית', 'שגרירות', 'מעבורת לקאפרי', 'גלידה'];

const Search = () => {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const [entries, setEntries] = useState(staticEntries);

  // תוכן מהשרת (לו״ז, משימות, תוכנית) מצטרף כשהוא מגיע
  useEffect(() => {
    let alive = true;
    serverEntries().then((more) => alive && setEntries([...staticEntries(), ...more]));
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => search(entries, query), [entries, query]);
  const setQuery = (q) => setParams(q ? { q } : {}, { replace: true });

  return (
    <div className="page">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">חיפוש 🔍</h1>
          <p className="card__lead">במדריכים, במסלול, בדף החירום, בלו״ז, במשימות ובתוכנית. עובד גם בלי אינטרנט.</p>
        </header>

        <div className="card__body search">
          <form role="search" onSubmit={(e) => e.preventDefault()}>
            <label className="visually-hidden" htmlFor="search-q">מה לחפש</label>
            <input
              id="search-q"
              className="input search__input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="למשל: רכבל, שגרירות, תודה ביוונית"
              autoFocus
              autoComplete="off"
              enterKeyHint="search"
            />
          </form>

          {!query.trim() && (
            <p className="search__examples">
              נסו:{' '}
              {EXAMPLES.map((ex, i) => (
                <span key={ex}>
                  {i > 0 && ' · '}
                  <button type="button" className="link-btn" onClick={() => setQuery(ex)}>{ex}</button>
                </span>
              ))}
            </p>
          )}

          {query.trim().length >= 2 && (
            <p className="search__count" aria-live="polite">
              {results.length ? `${results.length === 60 ? 'יותר מ-60' : results.length} תוצאות` : 'לא נמצאו תוצאות. אפשר לנסות מילה אחרת או קצרה יותר.'}
            </p>
          )}

          <ol className="search__results">
            {results.map((r, i) => (
              <li key={`${r.to}-${i}`}>
                <Link to={r.to} className="search-result">
                  <span className="search-result__where">{[r.page, r.heading].filter(Boolean).join(' · ')}</span>
                  {r.title && <span className="search-result__title">{r.title}</span>}
                  <span className="search-result__text">
                    {snippet(r.text, r.words).map((part, j) =>
                      part.mark ? <mark key={j}>{part.text}</mark> : <span key={j}>{part.text}</span>,
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </article>
    </div>
  );
};

export default Search;
