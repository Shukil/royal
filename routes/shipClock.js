const express = require('express');
const ShipClock = require('../models/ShipClock');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { notify } = require('../utils/push');
const router = express.Router();

// ימי ההפלגה (מהעלייה לספינה ועד הירידה)
const CRUISE = { min: '2027-08-15', max: '2027-08-22' };
const MAX_SHIFT = 2;

const toResponse = (rows) => ({
  days: Object.fromEntries(rows.map((r) => [r.date, { shift: r.shift, updatedBy: r.updatedBy, updatedAt: r.updatedAt }])),
});

router.use(auth);

// שעון הספינה בכל הימים שעודכנו. יום שלא מופיע = כמו השעה המקומית
router.get('/', async (req, res) => {
  res.json(toResponse(await ShipClock.find().lean()));
});

// עדכון שעון הספינה ליום אחד. shift=0 מחזיר את היום לשעה המקומית
router.put('/:date', async (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < CRUISE.min || date > CRUISE.max) {
    return res.status(400).json({ message: 'אפשר לעדכן את שעון הספינה רק בימי ההפלגה' });
  }
  const shift = Number(req.body.shift);
  if (!Number.isInteger(shift) || Math.abs(shift) > MAX_SHIFT) {
    return res.status(400).json({ message: 'הפרש השעות אינו תקין' });
  }

  const me = await User.findById(req.userId).select('firstName lastName').lean();
  if (!me) return res.status(401).json({ message: 'יש להתחבר' });

  if (shift === 0) {
    await ShipClock.deleteOne({ date });
  } else {
    await ShipClock.findOneAndUpdate(
      { date },
      { shift, updatedBy: `${me.firstName} ${me.lastName}`, updatedAt: new Date() },
      { upsert: true, runValidators: true },
    );
  }
  res.json(toResponse(await ShipClock.find().lean()));

  const hours = Math.abs(shift) === 1 ? 'שעה' : 'שעתיים';
  notify({
    except: me._id,
    title: '🚢 שעון הספינה עודכן',
    body: shift === 0
      ? `ב-${date.split('-').reverse().slice(0, 2).join('.')} הספינה לפי השעה המקומית`
      : `ב-${date.split('-').reverse().slice(0, 2).join('.')} הספינה ${hours} ${shift > 0 ? 'קדימה' : 'אחורה'} מהשעה המקומית`,
    url: '/',
  });
});

module.exports = router;
