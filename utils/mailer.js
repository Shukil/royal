const nodemailer = require('nodemailer');

// אם לא הוגדרו פרטי SMTP ב-.env, המיילים יודפסו לקונסול (נוח לפיתוח)
const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const layout = (title, text, link, buttonText) => `
  <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
    <h2 style="color: #0b2343;">${title}</h2>
    <p style="line-height: 1.7;">${text}</p>
    <p style="margin: 28px 0;">
      <a href="${link}" style="background: #1667b8; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">${buttonText}</a>
    </p>
    <p style="color: #56627a; font-size: 13px;">אם הכפתור לא עובד, העתיקו את הקישור לדפדפן:<br><span dir="ltr">${link}</span></p>
  </div>`;

async function sendMail({ to, subject, html, link }) {
  if (!transporter) {
    console.log(`\n[mail] SMTP not configured. Email to ${to}: "${subject}"\n[mail] Link: ${link}\n`);
    return;
  }
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

const sendResetEmail = (to, firstName, link) =>
  sendMail({
    to,
    link,
    subject: 'שחזור סיסמה · Odyssey of the Seas',
    html: layout(
      `היי ${firstName},`,
      'קיבלנו בקשה לאיפוס הסיסמה שלך. הקישור תקף לשעה אחת. אם לא ביקשת איפוס, אפשר להתעלם מהמייל הזה.',
      link,
      'בחירת סיסמה חדשה'
    ),
  });

module.exports = { sendResetEmail };
