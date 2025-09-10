const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Log = sequelize.define('Log', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  action: {
    type: DataTypes.ENUM(
      'auth.register','auth.login',
      'donation.create',
      'issue.ok','issue.suggest',
      'emergency.ok','emergency.empty'
    ),
    allowNull: false
  },
  actorId:    { type: DataTypes.INTEGER, allowNull: true },
  actorEmail: { type: DataTypes.STRING,  allowNull: true },
  actorRole:  { type: DataTypes.STRING,  allowNull: true },
  entityType: { type: DataTypes.STRING,  allowNull: true },
  entityId:   { type: DataTypes.STRING,  allowNull: true },
  details:    { type: DataTypes.JSON,    allowNull: true },
  ip:         { type: DataTypes.STRING,  allowNull: true },
}, {});

module.exports = Log;
