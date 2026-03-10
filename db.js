const { createClient } = require("@libsql/client");
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
require("dotenv").config();

async function connectDb() {
  if (process.env.NODE_ENV === "production") {
    const db = createClient({
      url: process.env.TURSO_URL,
      authToken: process.env.TURSO_TOKEN,
    });
    return db;
  } else {
    // inside connectDb else block:
    const sqlite = await open({
      filename: './database.sqlite',
      driver: sqlite3.Database,
    });

    return {
      execute: async (query) => {
        const sql  = typeof query === 'string' ? query : query.sql;
        const args = typeof query === 'string' ? [] : (query.args || []);

        const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

        if (args.length > 0) {
          if (isSelect) {
            const rows = await sqlite.all(sql, args);
            return { rows };
          } else {
            await sqlite.run(sql, args);
            return { rows: [] };
          }
        } else {
          await sqlite.exec(sql);
          return { rows: [] };
        }
      }
    };
  }
}

module.exports = connectDb;
