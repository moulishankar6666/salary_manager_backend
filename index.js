const express = require("express");
// const dotenv = require("dotenv");
const sqlite3 = require("sqlite3");
const path = require("path");
const { open } = require("sqlite");
const cors = require("cors");

//middleware to parse json requests
let db;
const app = express();
app.use(express.json());
app.use(cors());
// dotenv.config();

const port = 3000;

const connectToDB = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, "salarymanager.db"),
      driver: sqlite3.Database,
    });
    console.log("DB is connected successfully");
  } catch (error) {
    console.error("DB Error :", error.message);
    process.exit(1);
  }
};
connectToDB();

app.post("/add", async (req, res) => {
  try {
    const query = `INSERT INTO spends (spending_name,spending_type,amount) VALUES(?,?,?);`;
    const response = await db.run(query, ["shopping", "House Expenses", 5000]);
    res.json({ data: response });
  } catch (err) {
    console.error("Error", err.message);
  }
});

app.get("/all", async (req, res) => {
  try {
    const query = `SELECT * FROM spends`;
    const response = await db.all(query);
    res.json({ data: response });
  } catch (error) {
    console.error(error.msg);
  }
});

app.listen(port, (err) => {
  console.log("server running on port ", port);
});
