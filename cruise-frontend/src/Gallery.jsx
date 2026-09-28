// תמונה אחת עם כיתוב וקרדיט (דרישת רישיון Creative Commons)
export const Photo = ({ photo, className = '' }) => (
  <figure className={`photo ${className}`}>
    <img src={photo.src} alt={photo.caption} loading="lazy" decoding="async" />
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
    {photos.map((p) => <Photo key={p.src} photo={p} />)}
  </div>
);

export default Gallery;
