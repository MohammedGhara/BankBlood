// src/routes/issue.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Inventory = require('../models/inventory');
const { rankAlternatives } = require('../lib/compat');
const { logEvent } = require('../lib/audit');  // <-- make sure this exists

const IssueDTO = Joi.object({
  bloodType: Joi.string().valid('A+','A-','B+','B-','AB+','AB-','O+','O-').required(),
  units: Joi.number().integer().min(1).required(),
  originalRequested: Joi.string().valid('A+','A-','B+','B-','AB+','AB-','O+','O-').optional(),
});

// POST /issue  { bloodType, units }
router.post('/', async (req, res) => {
  // validate input
  const { error, value } = IssueDTO.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
  }

  const { bloodType, units, originalRequested } = value;
  try {
    // stock of the requested type
    const row = await Inventory.findOne({ where: { bloodType } });
    const have = Number(row?.units || 0);

    // ✅ enough → deduct & log issue.ok (requested === issuedType)
    if (have >= units) {
      await Inventory.decrement('units', { by: units, where: { bloodType } });
      const requestedForLog = originalRequested || bloodType;
      // LOG success with the fields your admin table expects
      logEvent({
        req,
        action: 'issue.ok',
        entityType: 'Inventory',
        entityId: bloodType,
        details: {
          requested: bloodType,   // what was asked
           issuedType: bloodType,  // what we actually dispensed (same here)
          units: Number(units)
        }
      }).catch(()=>{});

      return res.json({ ok: true, used: { type: bloodType, units: Number(units) }, alternative: false });
    }

    // ❌ not enough → compute alternatives; DO NOT auto-issue (keep your UX)
    const inventory = await Inventory.findAll({ order: [['bloodType', 'ASC']] });
    const ranked = rankAlternatives(bloodType, bloodType, inventory); // your helper

    // an alternative that could fully satisfy (for message only; still just suggest)
    const fullMatch = ranked.find(r => r.available >= units) || null;

    // LOG suggestion so admin sees what was asked and what we proposed
    logEvent({
      req,
      action: 'issue.suggest',
      entityType: 'Inventory',
      entityId: bloodType,
      details: {
        requested: bloodType,
        units: Number(units),
        best: fullMatch ? fullMatch.type : null, // best candidate (if any)
        suggested: ranked.slice(0, 3)            // top 3 for the UI
      }
    }).catch(()=>{});

    // return 409 with the full ranked list for the UI to let the user choose
    return res.status(409).json({
      ok: false,
      needAlternative: true,
      message: fullMatch
        ? `Insufficient ${bloodType}. Recommended alternative: ${fullMatch.type}.`
        : `Insufficient ${bloodType}. No single alternative has ${units} units.`,
      requested: bloodType,
      units,
      alternatives: ranked
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
