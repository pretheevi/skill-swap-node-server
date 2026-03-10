const { createClient } = require('@libsql/client');
require('dotenv').config();

async function connectDb() {
  const db = createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_TOKEN,
  });
  return db;
}

module.exports = connectDb;