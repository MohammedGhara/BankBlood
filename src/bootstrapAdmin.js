// src/bootstrapAdmin.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const open = require('open');
const User = require('./models/user');

async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const rawPass = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !rawPass) {
    console.warn('[admin bootstrap] ADMIN_EMAIL / ADMIN_PASSWORD missing in .env');
    return null;
  }

  let admin = await User.findOne({ where: { email } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(rawPass, 10);
    admin = await User.create({
      fullName: name,
      email,
      passwordHash,
      role: 'admin',
    });
    console.log(`[admin bootstrap] Created admin: ${email}`);
  } else {
    console.log(`[admin bootstrap] Admin already exists: ${email}`);
  }
  return admin;
}

async function openAdminPage(port) {
  const shouldOpen = (process.env.AUTO_OPEN_ADMIN || '').toLowerCase() === 'true';
  if (!shouldOpen) return;

  // If you run client separately (Vite), set ADMIN_OPEN_URL in .env (e.g. http://localhost:5173/admin)
  const explicit = process.env.ADMIN_OPEN_URL;
  const url = explicit || `http://localhost:${port}/admin`;
  try {
    await open(url);
    console.log(`[admin bootstrap] Opened ${url}`);
  } catch (e) {
    console.warn('[admin bootstrap] Could not open admin page:', e.message);
  }
}

module.exports = { ensureAdminUser, openAdminPage };
