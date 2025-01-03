const express = require("express");
const path = require("path");
const cors = require("cors");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { userInfo } = require("os");

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
        res.status(404).json({ error: error.message });
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
        `insert into users(username,password,salary,fullname) Values(?,?,?,?); `,
        [username, hashedPassword, parseInt(salary), fullname]
      );

      const payload = {
        username: username,
        fullname: fullname,
        salaryAmount: salary,
      };
      const jwtToken = jwt.sign(payload, "my-token");

      res.status(200).json({
        token: jwtToken,
        response: `${fullname} Sign Up Successfully`,
      });
    } else {
      res
        .status(400)
        .json({ error: `You have an account with this username ${username}` });
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
        res.status(200).json({ token: jwtToken, status: "SignIn success" });
      } else {
        res.status(400).json({
          error: `Entered password incorrect`,
        });
      }
    } else {
      res.status(400).json({
        error: `You don't have an account with  ${username}`,
      });
    }
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post("/addspend", jwtVerification, async (req, res) => {
  const { username } = req;

  const { spendname, spendtype, amount, datetime } = req.body;
  console.log(req.body);

  try {
    const user = await db.get("select * from users where username=?", [
      username,
    ]);
    const query = `INSERT INTO spends (userid,spendname,spendtype,amount,datetime) VALUES(?,?,?,?,?);`;

    const response = await db.run(query, [
      user.id,
      spendname,
      spendtype,
      parseInt(amount),
      datetime,
    ]);
    console.log(response);
    res.status(200).json({ response: "Insert successfully" });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.get("/monthspends/:month", jwtVerification, async (req, res) => {
  try {
    const { username } = req;
    const { month } = req.params;

    const user = await db.get("select * from users where username=?", [
      username,
    ]);
    const query = `select userid, spendid,spendname,spendtype,amount,datetime from spends
     where userid=? 
     group by spendid
     having cast(strftime('%m',datetime) as INT)=? and cast(strftime('%Y',datetime) as INT)=?
     order by datetime asc;`;
    const data = await db.all(query, [
      user.id,
      month.slice(5, 8),
      month.slice(0, 4),
    ]);

    res.status(200).json({ response: data });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.delete("/delete/:id", jwtVerification, async (req, res) => {
  const { id } = req.params;
  try {
    const query = `delete from spends where spendid=?`;
    const response = db.run(query, [id]);
    res.status(200).json({ status: `deleted row no ${id}` });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.get("/dayspends/:date", jwtVerification, async (req, res) => {
  const { username } = req;
  const { date } = req.params;
  const dateArr = date.split(" ");

  try {
    const user = await db.get("select * from users where username=?", [
      username,
    ]);
    const query = `select spendid,userid,spendname,spendtype,amount,datetime from spends
       where userid=?
       group by spendid
       having cast(strftime('%d',datetime)as INTEGER)=? and cast(strftime('%m',datetime)as INTEGER)=? and cast(strftime('%Y',datetime)as INTEGER)=?
       order by datetime;`;

    const data = await db.all(query, [
      user.id,
      dateArr[0],
      dateArr[1],
      dateArr[2],
    ]);
    res.status(200).json({ response: data });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.get("/profile/:date", jwtVerification, async (req, res) => {
  const { username } = req;
  const { date } = req.params;
  const [month, year] = date.split("-");
  try {
    const query1 =
      "select id,username,fullname,salary from users where username=? ";
    const userInfo = await db.get(query1, [username]);
    if (userInfo !== undefined) {
      const totalamount = `select sum(amount) as total, count(amount) as taskcount from spends 
         where userid=? and  cast(strftime('%m',datetime)as INTEGER)=? and cast(strftime('%Y',datetime)as INTEGER)=?;`;
      const totalamountresponse = await db.all(totalamount, [
        userInfo.id,
        month,
        year,
      ]);

      const houseExpences = `select sum(amount) as total, count(amount) as taskcount from spends
       where userid=? and spendtype='House Expences' and cast(strftime('%m',datetime)as INTEGER)=? and cast(strftime('%Y',datetime)as INTEGER)=?`;
      const houseExpencesresponse = await db.all(houseExpences, [
        userInfo.id,
        month,
        year,
      ]);

      const Luxury = `select sum(amount) as total, count(amount) as taskcount from spends
         where userid=? and spendtype=? and cast(strftime('%m',datetime) as INTEGER)=? and cast(strftime('%Y',datetime) as INTEGER)=?`;
      const Luxuryresponse = await db.all(Luxury, [
        userInfo.id,
        "Luxury",
        month,
        year,
      ]);

      const savings = `select sum(amount) as total, count(amount) as taskcount from spends
      where userid=? and spendtype='Savings' and cast(strftime('%m',datetime)as INTEGER)=? and cast(strftime('%Y',datetime)as INTEGER)=?`;
      const savingsresponse = await db.all(savings, [userInfo.id, month, year]);

      const userSpends = await db.all(
        `select * from spends 
        where userid=?  and cast(strftime('%m',datetime)as INTEGER)=? and cast(strftime('%Y',datetime)as INTEGER)=? 
        order by datetime desc 
        limit 5;`,
        [userInfo.id, month, year]
      );

      res.status(200).json({
        userInfo,
        userSpends,
        totalamount: [
          totalamountresponse[0].total,
          totalamountresponse[0].taskcount,
        ],
        housespend: [
          houseExpencesresponse[0].total,
          houseExpencesresponse[0].taskcount,
        ],
        savings: [savingsresponse[0].total, savingsresponse[0].taskcount],
        Luxury: [Luxuryresponse[0].total, Luxuryresponse[0].taskcount],
      });
    } else {
      res.status(404).json({ error: "user not found" });
    }
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});
