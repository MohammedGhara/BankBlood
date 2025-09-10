// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { logEvent } = require('../lib/audit');

const router = express.Router();
const JWT_EXP = '2h';

// REGISTER
router.post('/register', async (req, res) => {
  try {
    let { fullName, email, password, role = 'customer' } = req.body;

    // normalize inputs
    email = (email || '').trim().toLowerCase();
    fullName = (fullName || '').trim();
    password = (password || '').trim();

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'fullName, email, password are required' });
    }

    const allowedRoles = ['admin','doctor','customer'];
    const normalizedRole = (role || 'customer').toLowerCase();
    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ fullName, email, passwordHash, role: normalizedRole });
    logEvent({
    req, action:'auth.register', entityType:'User', entityId:user.id,
    details:{ email:user.email, role:user.role }
  }).catch(()=>{});
    return res.status(201).json({ id: user.id, fullName: user.fullName, email: user.email, role: user.role });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});
// in src/routes/auth.js (after successful register)

router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    email = (email || '').trim().toLowerCase();
    password = (password || '').trim();

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // sign JWT
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '2h' }
    );

    // 👇 simulate req.user so logEvent captures it
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName
    };

    // 👇 log the login event
    await logEvent({
      req,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      details: { email: user.email, role: user.role }
    });

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;