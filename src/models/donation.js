const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Donation = sequelize.define('Donation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  donorId: { type: DataTypes.STRING, allowNull: false},
  donorName: { type: DataTypes.STRING, allowNull: false },
  bloodType: { type: DataTypes.ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-'), allowNull: false },
  donatedAt: { type: DataTypes.DATE, allowNull: false },
});

module.exports = Donation;
