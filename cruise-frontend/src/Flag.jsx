// דגלים כ-SVG, כי ב-Windows אימוג׳י דגלים מוצגים כאותיות (IT, GR)
const flags = {
  it: {
    label: 'איטליה',
    viewBox: '0 0 3 2',
    body: (
      <>
        <rect width="1" height="2" fill="#009246" />
        <rect x="1" width="1" height="2" fill="#fff" />
        <rect x="2" width="1" height="2" fill="#ce2b37" />
      </>
    ),
  },
  gr: {
    label: 'יוון',
    viewBox: '0 0 27 18',
    body: (
      <>
        <rect width="27" height="18" fill="#0d5eaf" />
        {[2, 6, 10, 14].map((y) => <rect key={y} y={y} width="27" height="2" fill="#fff" />)}
        <rect width="10" height="10" fill="#0d5eaf" />
        <rect y="4" width="10" height="2" fill="#fff" />
        <rect x="4" width="2" height="10" fill="#fff" />
      </>
    ),
  },
  il: {
    label: 'ישראל',
    viewBox: '0 0 220 160',
    body: (
      <>
        <rect width="220" height="160" fill="#fff" />
        <rect y="15" width="220" height="25" fill="#0038b8" />
        <rect y="120" width="220" height="25" fill="#0038b8" />
        <g fill="none" stroke="#0038b8" strokeWidth="5.5">
          <polygon points="110,43.9 141.25,98 78.75,98" />
          <polygon points="110,116.1 78.75,62 141.25,62" />
        </g>
      </>
    ),
  },
  tr: {
    label: 'טורקיה',
    viewBox: '0 0 1200 800',
    body: (
      <>
        <rect width="1200" height="800" fill="#e30a17" />
        <circle cx="425" cy="400" r="200" fill="#fff" />
        <circle cx="475" cy="400" r="160" fill="#e30a17" />
        <polygon
          fill="#fff"
          points="483.3,400 552.4,377.5 552.4,304.9 595.1,363.7 664.2,341.2 621.5,400 664.2,458.8 595.1,436.3 552.4,495.1 552.4,422.5"
        />
      </>
    ),
  },
};

const Flag = ({ code, labelled = false }) => {
  const f = flags[code];
  if (!f) return null;
  return (
    <svg
      className="flag"
      viewBox={f.viewBox}
      preserveAspectRatio="none"
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? f.label : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {f.body}
    </svg>
  );
};

export default Flag;
