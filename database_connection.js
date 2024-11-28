// const sqlite3 = require("sqlite3");
// const path = require("path");
// const { open } = require("sqlite");

// let db;
// const connectToDB = async () => {
//   try {
//     db = await open({
//       filename: path.join(__dirname, "salarymanager.db"),
//       driver: sqlite3.Database,
//     });
//     console.log("DB is connected successfully");
//   } catch (error) {
//     console.error(error.message);
//     process.exit(1);
//   }
// };
// connectToDB();

// const query =
//   "CREATE TABLE IF NOT EXISTS spends (id INTEGER PRIMARY KEY AUTOINCREMENT  ,  spending_name TEXT NOT NULL, spending_type TEXT NOT NULL , amount INTEGER NOT NULL );";
// db.run(query, (err) => {
//   if (err) {
//     console.error("Error", err.message);
//   } else {
//     console.log("spends table created");
//   }
// });
