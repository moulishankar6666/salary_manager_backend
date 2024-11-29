const express = require("express");
const path = require("path");
const cors = require("cors");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

//middleware to parse json requests
let db;
const app = express();
app.use(express.json());
app.use(cors());

const port = 8090;

const dbConnection = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, "app.db"),
      driver: sqlite3.Database,
    });
    console;
    app.listen(port, () => {
      console.log("server running on port ", port);
    });
    console.log("database connected successfully");
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};

dbConnection();

app.post("/add", async (req, res) => {});

app.get("/all", async (req, res) => {
  try {
    const query = `select * from spends;`;

    const response = await db.all(query);
    res.json({ data: response });
  } catch (err) {
    console.error("Error_on_all_request", err.message);
  }
});
