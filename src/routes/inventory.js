const express = require('express');
const router = express.Router();
const Inventory = require('../models/inventory');
const { requireRole } = require('../middle/authz');
router.get('/summary', requireRole(['customer', 'doctor', 'admin']), async (_req, res) => {
  const rows = await Inventory.findAll({
    attributes: ['bloodType', 'units', 'updatedAt'],
    order: [['bloodType', 'ASC']]
  });
  res.json(rows);
});
router.post('/', async (req, res) => {
  const { error, value } = CreateDonationDTO.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  try {
    const donation = await Donation.create(value);
    await Inventory.increment('units', { by: 1, where: { bloodType: value.bloodType } });
    res.status(201).json(DonationResponseDTO(donation));
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Duplicate not allowed' });
    }
    res.status(500).json({ error: e.message });
  }
});
// GET /inventory → [{ bloodType, units }]
router.get('/', async (_req, res) => {
  try {
    const rows = await Inventory.findAll({ order: [['bloodType','ASC']] });
    // Return a clean array
    res.json(rows.map(r => ({
      bloodType: r.bloodType,
      units: Number(r.units || 0),
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
module.exports = router;
