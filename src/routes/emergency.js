// src/routes/emergency.js
const express = require('express');
const router = express.Router();
const Inventory = require('../models/inventory');
const { logEvent } = require('../lib/audit');  // ensure this path is correct

// POST /emergency → drain all O- units at once
router.post('/', async (req, res) => {   // <-- use req (not _req)
  try {
    const row = await Inventory.findOne({ where: { bloodType: 'O-' } });
    const available = Number(row?.units || 0);

    if (!row || available <= 0) {
      // log: no O- available
      logEvent({
        req,
        action: 'emergency.empty',
        entityType: 'Inventory',
        entityId: 'O-',
        details: {}
      }).catch(() => {});
      return res.status(409).json({ ok: false, reason: 'EMPTY', message: 'No O- units available.' });
    }

    // deduct everything
    await Inventory.decrement('units', { by: available, where: { bloodType: 'O-' } });

    // log: issued all O-
    logEvent({
      req,
      action: 'emergency.ok',
      entityType: 'Inventory',
      entityId: 'O-',
      details: {  requested: 'O-',      // always request O- in emergency
    issuedType: 'O-',     // 👈 make sure logs show O- as issued type
    units: available   }
    }).catch(() => {});

    return res.json({ ok: true, issued: available, type: 'O-' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
