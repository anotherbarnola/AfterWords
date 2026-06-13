const { createClient } = require("@libsql/client");
const path = require("path");
require("dotenv").config();

// Resolve database URL
let dbUrl = "file:local.db";
const authToken = process.env.TEAM_DB_AUTH_TOKEN || "";

if (process.env.TEAM_DB_URL) {
  dbUrl = process.env.TEAM_DB_URL;
  console.log(`Connecting to remote Turso Database: ${dbUrl}`);
} else if (process.env.TEAM_DB_PATH) {
  // SQLite file path needs file: prefix for libsql client
  const absolutePath = path.resolve(process.env.TEAM_DB_PATH);
  dbUrl = `file:${absolutePath}`;
  console.log(`Connecting to local SQLite Database via path: ${dbUrl}`);
} else {
  console.log(`Connecting to fallback local SQLite Database: ${dbUrl}`);
}

const client = createClient({
  url: dbUrl,
  authToken: authToken,
});

module.exports = {
  client,
  // Helper to execute a query with arguments and return rows
  query: async (sql, args = []) => {
    try {
      const result = await client.execute({ sql, args });
      // Map rows array to array of objects with column names
      return result.rows;
    } catch (error) {
      console.error(`Database error executing: ${sql}`, error);
      throw error;
    }
  },
  // Helper to execute a single statement (insert/update/delete)
  execute: async (sql, args = []) => {
    try {
      return await client.execute({ sql, args });
    } catch (error) {
      console.error(`Database error executing statement: ${sql}`, error);
      throw error;
    }
  },
};
