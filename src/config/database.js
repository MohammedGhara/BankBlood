const { Sequelize } = require('sequelize');
require('dotenv').config();
const path = require('path');

const dialect = process.env.DB_DIALECT || 'sqlite';

const options = {
  dialect,
  storage: process.env.DB_STORAGE || './bloodbank.sqlite',
  logging: false,

};
console.log('SQLite file path:', path.resolve(options.storage));

const sequelize = new Sequelize(options);

module.exports = sequelize;
