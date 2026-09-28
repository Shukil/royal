// טיפול מרוכז בשגיאות. ב-Express 5 שגיאה בפונקציה async מגיעה לכאן אוטומטית,
// כך שהנתיבים לא צריכים try/catch משלהם
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  // גוף בקשה שאינו JSON תקין
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'הבקשה אינה תקינה' });
  }
  // נתונים שלא עברו את בדיקות המודל, או מזהה בפורמט שגוי
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: 'הנתונים שנשלחו אינם תקינים' });
  }
  console.error(err);
  res.status(500).json({ message: 'שגיאת שרת' });
};
