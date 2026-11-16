import { CARD_SIZES, cardSrcSet } from './thumb';

// תמונה אחת עם כיתוב וקרדיט (דרישת רישיון Creative Commons)
// card: כרטיסייה קטנה בגלריה. היא טוענת את הגרסה ברוחב 500 (thumb.js), ולא את ה-960 של התמונות הגדולות
export const Photo = ({ photo, className = '', card = false }) => (
  <figure className={`photo ${className}`}>
    <img
      src={photo.src}
      srcSet={card ? cardSrcSet(photo.src) : undefined}
      sizes={card ? CARD_SIZES : undefined}
      alt={photo.caption}
      loading="lazy"
      decoding="async"
      crossOrigin="anonymous"
    />
    <figcaption>
      <span className="photo__caption">{photo.caption}</span>
      <a className="photo__credit" href={photo.page} target="_blank" rel="noreferrer" dir="ltr">
        © {photo.credit} · {photo.license}
      </a>
    </figcaption>
  </figure>
);

// גלריה: התמונה הראשונה גדולה והשאר ברשת
const Gallery = ({ photos, featured = true }) => (
  <div className={featured ? 'gallery gallery--featured' : 'gallery'}>
    {photos.map((p, i) => <Photo key={p.src} photo={p} card={!(featured && i === 0)} />)}
  </div>
);

export default Gallery;
