// src/lib/audit.js
const Log = require('../models/log');

async function logEvent({ req, action, entityType, entityId, details }) {
  try {
    const ip =
      (req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()) ||
      (req?.socket?.remoteAddress) || null;
    const user = req?.user || null;

    await Log.create({
      action,
      actorId:    user ? user.id    : null,
      actorEmail: user ? user.email : null,
      actorRole:  user ? user.role  : null,
      entityType: entityType || null,
      entityId:   entityId != null ? String(entityId) : null,
      details:    details || null,
      ip
    });
  } catch (e) {
    console.error('logEvent error:', e.message);
  }
}

module.exports = { logEvent };
