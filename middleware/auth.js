const jwt = require('jsonwebtoken');

// מוודא שנשלח טוקן תקין (Authorization: Bearer <token>) ושומר את מזהה המשתמש ב-req.userId
module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'יש להתחבר' });

  try {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ message: 'פג תוקף ההתחברות, יש להתחבר מחדש' });
  }
};
