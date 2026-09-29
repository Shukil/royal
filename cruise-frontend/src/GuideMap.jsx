import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mapPoints } from './mapData';

// מפה של היעד עם הנמל והאתרים מהמדריך. מפות OpenStreetMap, בלי מפתח.
// הקובץ נטען רק כשפותחים מדריך (React.lazy), כדי ש-Leaflet לא יכביד על שאר האתר
const navUrl = (p) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`;

// מספור האתרים (הנמל מסומן בעוגן ולא ממוספר)
const numbered = (points) => {
  let n = 0;
  return points.map((p) => ({ ...p, num: p.kind === 'port' ? null : (n += 1) }));
};

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const GuideMap = ({ id }) => {
  const el = useRef(null);
  const points = mapPoints[id] ? numbered(mapPoints[id]) : null;

  useEffect(() => {
    if (!el.current || !mapPoints[id]) return undefined;
    const map = L.map(el.current, { scrollWheelZoom: false, tap: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true, // נשמר לשימוש בלי אינטרנט (vite.config.js)
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const markers = numbered(mapPoints[id]).map((p) => {
      const isPort = p.kind === 'port';
      const icon = L.divIcon({
        className: '',
        html: `<span class="map-pin${isPort ? ' map-pin--port' : ''}">${isPort ? '⚓' : p.num}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });
      return L.marker([p.lat, p.lon], { icon, title: p.name, zIndexOffset: isPort ? 1000 : 0 })
        .bindPopup(`<div dir="rtl" class="map-popup"><strong>${escapeHtml(p.name)}</strong><a href="${navUrl(p)}" target="_blank" rel="noreferrer">ניווט ב-Google Maps ↗</a></div>`)
        .addTo(map);
    });

    map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [30, 30] });
    return () => map.remove();
  }, [id]);

  if (!points) return null;

  return (
    <div className="guide-map">
      <div ref={el} className="guide-map__canvas" dir="ltr" role="region" aria-label="מפת היעד" />
      <ol className="guide-map__legend">
        {points.map((p) => (
          <li key={p.name}>
            <a href={navUrl(p)} target="_blank" rel="noreferrer">
              <span className={`map-pin map-pin--small${p.kind === 'port' ? ' map-pin--port' : ''}`} aria-hidden="true">
                {p.num ?? '⚓'}
              </span>
              {p.name}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default GuideMap;
