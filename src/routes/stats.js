const express = require("express");
const Inventory = require("../models/inventory");
const Donation = require("../models/donation");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await Inventory.findAll();
    const totalUnits = rows.reduce((s, r) => s + Number(r.units || 0), 0);
    const rareTypes = ["AB-","B-","A-","O-"];
    const rareUnits = rows
      .filter(r => rareTypes.includes(r.bloodType))
      .reduce((s, r) => s + Number(r.units || 0), 0);

    // example: last 5 donations
    const recentDonations = await Donation.findAll({
      limit: 5,
      order: [["createdAt","DESC"]],
      attributes: ["id","donorName","bloodType","units","createdAt"]
    });

    res.json({ totalUnits, rareUnits, typesTracked: rows.length, inventory: rows, recentDonations });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
