// src/routes/admin.logs.js
const express = require('express');
const { Op } = require('sequelize');
const Log = require('../models/log');

const router = express.Router();

/**
 * GET /admin/logs
 * Query params:
 *  - action: string (e.g. 'donation.create')
 *  - actor: substring of actorEmail
 *  - entityType: 'Donation' | 'User' | 'Inventory' ...
 *  - since, until: ISO dates (inclusive)
 *  - page, pageSize: pagination (defaults 1, 20)
 */
router.get('/', async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '20', 10), 1), 100);

  const where = {};
  if (req.query.action) where.action = req.query.action;
  if (req.query.actor)  where.actorEmail = { [Op.substring]: req.query.actor };
  if (req.query.entityType) where.entityType = req.query.entityType;

  if (req.query.since || req.query.until) {
    where.createdAt = {};
    if (req.query.since) where.createdAt[Op.gte] = new Date(req.query.since);
    if (req.query.until) where.createdAt[Op.lte] = new Date(req.query.until);
  }

  const { rows, count } = await Log.findAndCountAll({
    where,
    order: [['createdAt','DESC']],
    offset: (page - 1) * pageSize,
    limit: pageSize,
  });

  res.json({
    items: rows,
    total: count,
    page,
    pageSize,
    actions: [
      'auth.register','auth.login',
      'donation.create',
      'issue.ok','issue.suggest',
      'emergency.ok','emergency.empty'
    ],
    entityTypes: ['User','Donation','Inventory']
  });
});

module.exports = router;
