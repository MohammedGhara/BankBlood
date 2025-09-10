// src/routes/admin.users.js
const router = require('express').Router();
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const { requireRole } = require('../middle/authz');

// admin only for everything in this router
router.use(requireRole('admin'));

// shape to return to the client (no passwordHash!)
function publicUser(u) {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

// GET /admin/users?q=&role=&page=&pageSize=
router.get('/', async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '20', 10), 1), 100);
  const q = (req.query.q || '').trim();
  const role = (req.query.role || '').trim();

  const where = {};
  if (q) {
    where[Op.or] = [
      { email: { [Op.like]: `%${q}%` } },
      { fullName: { [Op.like]: `%${q}%` } },
    ];
  }
  if (role) where.role = role;

  const { rows, count } = await User.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    attributes: ['id','fullName','email','role','createdAt','updatedAt'],
  });

  res.json({ items: rows.map(publicUser), total: count, page, pageSize });
});

// POST /admin/users  { fullName, email, password, role }
router.post('/', async (req, res) => {
  const { fullName, email, password, role = 'customer' } = req.body || {};
  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'fullName, email and password are required' });
  }
  if (!['admin','doctor','customer'].includes(role)) {
    return res.status(400).json({ error: 'invalid role' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ fullName, email, passwordHash, role });
    return res.status(201).json(publicUser(user));
  } catch (e) {
    if (String(e).includes('UNIQUE') || String(e).includes('unique')) {
      return res.status(409).json({ error: 'email already exists' });
    }
    console.error(e);
    return res.status(500).json({ error: 'failed to create user' });
  }
});

// PATCH /admin/users/:id  { fullName?, role?, password? }
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ error: 'not found' });

  const updates = {};
  if (req.body.fullName) updates.fullName = req.body.fullName;
  if (req.body.role) {
    const newRole = req.body.role;
    if (!['admin','doctor','customer'].includes(newRole)) {
      return res.status(400).json({ error: 'invalid role' });
    }
    // prevent demoting the last admin
    if (user.role === 'admin' && newRole !== 'admin') {
      const admins = await User.count({ where: { role: 'admin' } });
      if (admins <= 1) return res.status(400).json({ error: 'cannot demote the last admin' });
    }
    updates.role = newRole;
  }
  if (req.body.password) {
    updates.passwordHash = await bcrypt.hash(req.body.password, 10);
  }
  await user.update(updates);
  return res.json(publicUser(user));
});

// DELETE /admin/users/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ error: 'not found' });

  // prevent deleting the last admin
  if (user.role === 'admin') {
    const admins = await User.count({ where: { role: 'admin' } });
    if (admins <= 1) return res.status(400).json({ error: 'cannot delete the last admin' });
  }
  // optional: prevent self-delete
  if (req.user && req.user.id === user.id) {
    return res.status(400).json({ error: 'cannot delete yourself' });
  }

  await user.destroy();
  return res.json({ ok: true });
});

module.exports = router;
