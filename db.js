const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

async function connectDb() {
  try {
    const db = await open({
      filename: path.join(__dirname, "database.sqlite"),
      driver: sqlite3.Database,
    });
    return db;
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

module.exports = connectDb;
