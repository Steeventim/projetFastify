require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "steeve10",
    database: process.env.DB_NAME || "cenadi",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: console.log, // Active les logs SQL en développement
  },
  test: {
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "steeve10", 
    database: process.env.DB_TEST_NAME || "cenadi_test",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false, // Désactive les logs en test
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false, // Désactive les logs en production
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
};
