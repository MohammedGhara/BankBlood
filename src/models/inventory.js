const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inventory = sequelize.define('Inventory', {
  bloodType: {
    type: DataTypes.ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-'),
    allowNull: false,
    unique: true
  },
  units: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
});

module.exports = Inventory;
