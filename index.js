const express = require("express");
const path = require("path");
const cors = require("cors");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

//middleware to parse json requests
let db;
const app = express();
app.use(express.json());
app.use(cors());

const port = 8091;

const dbConnection = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, "app.db"),
      driver: sqlite3.Database,
    });

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

const jwtVerification = (req, res, next) => {
  let jwtToken;
  const authHeader = req.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    res.json({ response: "Invalid jwt Token" }).status(401);
  } else {
    jwt.verify(jwtToken, "my-token", async (error, payload) => {
      if (error) {
        res.json({ error: error.message });
      } else {
        req.username = payload.username;
        next();
      }
    });
  }
};

app.post("/signup", async (req, res) => {
  const { username, password, salary, fullname } = req.body;
  try {
    const checkUser = `select * from users where username=?;`;
    const user = await db.get(checkUser, [username]);
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createUser = await db.run(
        `insert into users(username,password,salary,fullname) values(?,?,?,?);`,
        [username, hashedPassword, parseInt(salary), fullname]
      );
      res.json({ response: `${fullname} is signup successfully` }).status(200);
    } else {
      res
        .json({ response: `You have an account with username ${username}` })
        .status(400);
    }
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.post("/signin", async (req, res) => {
  const { username, password } = req.body;
  try {
    const checkUser = `select * from users where username=?;`;
    const user = await db.get(checkUser, [username]);
    if (user) {
      const ispasswordMatched = await bcrypt.compare(password, user.password);
      if (ispasswordMatched) {
        const payload = {
          username: user.username,
          fullname: user.fullname,
          salaryAmount: user.amount,
        };
        const jwtToken = jwt.sign(payload, "my-token");
        res.json({ response: jwtToken, status: "Login success" }).status(200);
      } else {
        res.json({ response: `Invalid password` }).status(400);
      }
    } else {
      res
        .json({
          response: `You don't have an account with username ${username}`,
        })
        .status(400);
    }
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get("/allusers", async (req, res) => {
  try {
    const query1 = `select * from users;`;
    const query2 = `select * from spends;`;
    // const deletetable = "delete from spends;";

    const response1 = await db.all(query1);
    const response2 = await db.all(query2);
    // const response3 = await db.run(deletetable);
    res.json({ users: response1, spends: response2 });
    // res.json({ spends: response3 });
  } catch (err) {
    console.error("Error_on_all_request", err.message);
  }
});

app.post("/addspend", jwtVerification, async (req, res) => {
  const { username } = req;
  const user = await db.get("select * from users where username=?", [username]);
  const { spendname, spendtype, amount, datetime } = req.body;

  try {
    const query = `INSERT INTO spends (userid,spendname,spendtype,amount,datetime) VALUES(?,?,?,?,?);`;
    const response = await db.run(query, [
      user.id,
      spendname,
      spendtype,
      parseInt(amount),
      datetime,
    ]);
    res.json({ response: "Insert successfully" });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get("/monthspends", jwtVerification, async (req, res) => {
  try {
    const { username } = req;
    const user = await db.get("select * from users where username=?", [
      username,
    ]);
    const query = `select * from spends where userid=?; `;
    const data = await db.all(query, [user.id]);
    res.json({ response: data });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const query = `delete from spends where id=?`;
    const response = db.run(query, [id]);
    res.json({ status: `deleted row no ${id}` });
  } catch (err) {
    res.json({ error: err.message });
  }
});
