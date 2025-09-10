const express = require('express');
const router = express.Router();
const Donation = require('../models/donation');
const Inventory = require('../models/inventory');
const { logEvent } = require('../lib/audit');
const { requireRole } = require('../middle/authz');
const { CreateDonationDTO, DonationResponseDTO } = require('../dtos/donation.dto');

router.use(requireRole(['admin', 'doctor']));

router.post('/', async (req, res) => {
  // validate input
  const { error, value } = CreateDonationDTO.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  try {
    const donation = await Donation.create(value);
    await Inventory.increment('units', { by: 1, where: { bloodType: value.bloodType } });
     logEvent({
      req,
      action: 'donation.create',
      entityType: 'Donation',
      entityId: donation.id,
      details: {
        donorId: donation.donorId,
        donorName: donation.donorName,
        bloodType: donation.bloodType,   // ✅ this drives the Blood Type column
        units: 1 
      }
    }).catch(()=>{});

    return res.status(201).json(DonationResponseDTO(donation));
  } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Donor already exists' });
    }
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
