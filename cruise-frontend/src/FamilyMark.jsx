import { TRIP_DATE, TRIP_NAME } from './brand';

// הסימן של ההפלגה המשפחתית: שמש שוקעת מעל שני גלים, בתוך עיגול
const Mark = () => (
  <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9.5 15a6.5 6.5 0 0 1 13 0Z" fill="var(--gold)" />
    <path d="M5 19.5c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 4.3-2 6.5 0 3.2 1.5 3.5 1.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M7.5 24c2-1.7 4-1.7 6 0s4 1.7 6 0 4-1.7 5 -.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".55" />
  </svg>
);

// הסימן והשם. בסרגל העליון (compact) מופיע גם התאריך, ובדפי ההתחברות הכול גדול יותר
const FamilyMark = ({ compact = false }) => (
  <span className={compact ? 'brand__lockup brand__lockup--compact' : 'brand__lockup'}>
    <Mark />
    <span className="brand__text">
      <span className="brand__name">{TRIP_NAME}</span>
      <span className="brand__date">{TRIP_DATE}</span>
    </span>
  </span>
);

export default FamilyMark;
