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

function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = { maybeAttachUser, requireRole };
