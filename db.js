const { createClient } = require('@libsql/client');
require('dotenv').config();

async function connectDb() {
  try {
    const db = createClient({
      url: process.env.TURSO_URL,
      authToken: process.env.TURSO_TOKEN,
    });
    return db;
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

module.exports = connectDb;