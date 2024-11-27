const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./salarymanager.db", (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to Sqlite database");
  }
});

const query =
  "CREATE TABLE IF NOT EXISTS spends (id INTEGER PRIMARY KEY AUTOINCREMENT,  spending_name TEXT NOT NULL, spending_type TEXT NOT NULL , amount INTEGER NOT NULL );";
db.run(query, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("spends table created");
  }
});

module.exports = db;
