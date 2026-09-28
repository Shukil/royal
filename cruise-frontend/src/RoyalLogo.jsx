// לוגו "הכתר והעוגן" של Royal Caribbean, כפי שמופיע בכותרת של royalcaribbean.com.
// הצבע נלקח מ-currentColor, כך שהוא לבן על רקע כהה וכחול על רקע בהיר
const CrownAnchor = () => (
  <svg className="royal-logo__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M4.7552 11.1035L4 3.28704L8.62843 6.62402L6.98947 8.44517L9.59323 10.2318L13.4989 8.48832L11.9928 6.54957L16 2.66669L20.0072 6.54957L18.5011 8.48832L22.4068 10.2318L25.0105 8.44517L23.3716 6.62402L28 3.28704L27.2448 11.1035H4.7552ZM4.89133 12.5125L5.14306 15.1137H13.4794L13.4773 24.1127H9.42253C8.51823 24.1127 7.73602 23.4157 7.73602 22.6044C7.73602 21.7931 8.59926 21.0907 9.54893 20.548L5.39047 17.6707L6.15648 25.595L16 29.3334L25.8435 25.595L26.6095 17.6707L22.4511 20.548C23.4007 21.0907 24.264 21.7931 24.264 22.6044C24.264 23.4157 23.4818 24.1116 22.5775 24.1127H18.5227L18.5206 15.1137H26.8569L27.1087 12.5125H4.89241H4.89133Z"
    />
  </svg>
);

const RoyalLogo = ({ compact = false }) => (
  <span className={compact ? 'royal-logo royal-logo--compact' : 'royal-logo'}>
    <CrownAnchor />
    <span className="royal-logo__text">
      <span className="royal-logo__word">ROYAL</span>
      <span className="royal-logo__word">CARIBBEAN</span>
    </span>
  </span>
);

export default RoyalLogo;
