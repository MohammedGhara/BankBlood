// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./src/config/database');
const { maybeAttachUser, requireRole } = require('./src/middle/authz');

// register models once so Sequelize knows about them
require('./src/models/donation');
require('./src/models/inventory');
require('./src/models/user');
require('./src/models/log');

// routes
const donationRoutes  = require('./src/routes/donations');
const inventoryRoutes = require('./src/routes/inventory');
const authRoutes      = require('./src/routes/auth');
const issueRoutes     = require('./src/routes/issue');
const emergencyRoutes = require('./src/routes/emergency');

// swagger
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./src/docs/swagger.yaml');

const app = express();

// CORS: allow your Vite dev server
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: false
}));

app.use(express.json());

// health
app.get('/health', (_req, res) => res.json({ ok: true }));

// mount routes (no /api prefix per your frontend config)

app.use('/auth', authRoutes);

app.use(maybeAttachUser);
app.use('/admin/logs', requireRole('admin'), require('./src/routes/admin.logs'));

app.use('/donations', donationRoutes);
app.use('/inventory', inventoryRoutes);

app.use('/issue', issueRoutes);
app.use('/emergency', emergencyRoutes);

// swagger (optional — you can ignore this while testing in the browser)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
const adminLogsRoutes = require('./src/routes/admin.logs');
app.use('/admin/logs', requireRole('admin'), adminLogsRoutes);
// init
(async () => {
  // SQLite pragmas (safe defaults)
  await sequelize.query('PRAGMA journal_mode = WAL;');
  await sequelize.query('PRAGMA busy_timeout = 5000;');

  // sync models
  await sequelize.sync();

  // ensure all blood types exist in inventory with 0 units
  const Inventory = require('./src/models/inventory');
  for (const t of ['A+','A-','B+','B-','AB+','AB-','O+','O-']) {
    await Inventory.findOrCreate({ where: { bloodType: t }, defaults: { units: 0 } });
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Swagger UI:   http://localhost:${port}/api-docs`);
  });
})();
