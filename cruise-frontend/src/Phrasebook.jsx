import { useEffect, useState } from 'react';
import { languages } from './phrases';

// קול להשמעה בשפה המבוקשת, מהקולות שמותקנים בטלפון (speechSynthesis).
// אם אין קול מתאים, לא מציגים כפתור השמעה: קול בשפה אחרת היה מקריא את המילים לא נכון
// מחזיר undefined כל עוד רשימת הקולות לא נטענה, ו-null אם אין קול מתאים
const useVoice = (speechLang) => {
  const [voice, setVoice] = useState(() => ('speechSynthesis' in window ? undefined : null));

  useEffect(() => {
    if (!('speechSynthesis' in window)) return undefined;
    const synth = window.speechSynthesis;
    const prefix = speechLang.split('-')[0];
    const pick = () => {
      const voices = synth.getVoices();
      if (!voices.length) return;
      setVoice(
        voices.find((v) => v.lang.replace('_', '-') === speechLang)
          ?? voices.find((v) => v.lang.toLowerCase().startsWith(prefix))
          ?? null,
      );
    };
    pick();
    // בכרום רשימת הקולות נטענת אחרי רגע
    synth.addEventListener('voiceschanged', pick);
    return () => synth.removeEventListener('voiceschanged', pick);
  }, [speechLang]);

  return voice;
};

const speak = (text, voice) => {
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.8; // קצת לאט, כדי שיהיה אפשר לחזור אחרי זה
  synth.speak(u);
};

const Phrasebook = ({ lang }) => {
  const language = languages[lang];
  const voice = useVoice(language.speech);

  return (
    <div className="phrasebook">
      <p className="tip">{language.tip}</p>
      <ul className="phrases">
        {language.phrases.map((p) => (
          <li key={p.text} className="phrase">
            <span className="phrase__he">{p.he}</span>
            <span className="phrase__say">{p.say}</span>
            <span className="phrase__text" dir="ltr" lang={lang}>
              {p.text}
              {p.latin && <span className="phrase__latin" lang="en"> · {p.latin}</span>}
            </span>
            {voice && (
              <button
                type="button"
                className="phrase__play"
                onClick={() => speak(p.text, voice)}
                aria-label={`השמעה: ${p.he} ב${language.name}`}
                title="השמעה"
              >
                🔊
              </button>
            )}
          </li>
        ))}
      </ul>
      {voice === null && (
        <p className="field__hint">
          אין בטלפון הזה קול ב{language.name}, אז אין כפתור השמעה. אפשר להוסיף קול בהגדרות הנגישות (הקראה) של הטלפון.
        </p>
      )}
    </div>
  );
};

export default Phrasebook;
