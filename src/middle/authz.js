const jwt = require('jsonwebtoken');
const User = require('../models/user');

async function maybeAttachUser(req, _res, next) {
  try {
    const h = req.headers.authorization || '';
    const t = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!t) return next();
    const p = jwt.verify(t, process.env.JWT_SECRET || 'dev-secret');
    if (!p?.sub) return next();
    const u = await User.findByPk(p.sub);
    if (u) req.user = { id: u.id, email: u.email, role: u.role, fullName: u.fullName };
  } catch {}
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = { maybeAttachUser, requireRole };
