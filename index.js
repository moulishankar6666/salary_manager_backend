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
        `insert into users(username,password,salary,fullname) values(?,?,?,?); `,
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
        res.json({ response: jwtToken, status: "Login success" });
        res.status(200);
      } else {
        res.json({ response: `Invalid password` });
        res.status(404);
      }
    } else {
      res.json({
        response: `You don't have an account with username ${username}`,
      });
      res.status(404);
    }
  } catch (err) {
    res.json({ error: err.message });
    res.status(404);
  }
});

// app.get("/allusers", async (req, res) => {
//   try {
//     const query1 = `select * from users;`;
//     const query2 = `select * from spends;`;
//     // const deletetable = "delete from spends;";

//     const response1 = await db.all(query1);
//     const response2 = await db.all(query2);
//     // const response3 = await db.run(deletetable);
//     res.json({ users: response1, spends: response2 });
//     // res.json({ spends: response3 });
//   } catch (err) {
//     console.error("Error_on_all_request", err.message);
//   }
// });

app.post("/addspend", jwtVerification, async (req, res) => {
  const { username } = req;

  const { spendname, spendtype, amount, datetime } = req.body;
  console.log(req.body);

  try {
    const user = await db.get("select * from users where username=?", [
      username,
    ]);
    const query = `INSERT INTO spends (userid,spendname,spendtype,amount,datetime) VALUES(?,?,?,?,?);commit;`;

    const response = await db.run(query, [
      user.id,
      spendname,
      spendtype,
      parseInt(amount),
      datetime,
    ]);
    res.json({ response: "Insert successfully" });
    res.status(200);
  } catch (err) {
    res.json({ error: err.message });
    res.status(404);
  }
});

app.get("/monthspends/:month", jwtVerification, async (req, res) => {
  try {
    const { username } = req;
    const { month } = req.params;

    const user = await db.get("select * from users where username=?", [
      username,
    ]);
    const query = `select spendid,spendname,spendtype,amount,datetime,cast(strftime('%m',datetime) as INT)as month,cast(strftime('%Y',datetime) as INT)as year from spends where userid=? and month=? and year=? order by datetime asc;`;
    const data = await db.all(query, [
      user.id,
      month.slice(5, 8),
      month.slice(0, 4),
    ]);

    res.json({ response: data });
    res.status(200);
  } catch (err) {
    res.json({ error: err.message });
    res.status(404);
  }
});

app.delete("/delete/:id", jwtVerification, async (req, res) => {
  const { id } = req.params;
  try {
    const query = `delete from spends where id=?`;
    const response = db.run(query, [id]);
    res.json({ status: `deleted row no ${id}` });
    res.status(200);
  } catch (err) {
    res.json({ error: err.message });
    res.status(404);
  }
});

app.get("/dayspends/:day", jwtVerification, async (req, res) => {
  const { day } = req.params;
  try {
    const query =
      "select spendid,spendname,spendtype,amount,datetime,cast(strftime('%d',datetime)as INTEGER) as day from spends where day=? order by datetime";
    const data = await db.all(query, [day]);
    res.json({ response: data });
    res.status(200);
  } catch (err) {
    res.json({ error: err.message });
    res.status(404);
  }
});

app.get("/profile", jwtVerification, async (req, res) => {
  const { username } = req;
  try {
    const query1 =
      "select id,username,fullname,salary from users where username=? ";
    const userInfo = await db.get(query1, [username]);
    if (userInfo !== undefined) {
      const totalamount =
        "select sum(amount) as total from spends where userid=? ;";
      const totalamountresponse = await db.all(totalamount, [userInfo.id]);

      const houseExpences =
        "select sum(amount) as total from spends where userid=? and spendtype=?;";
      const houseExpencesresponse = await db.all(houseExpences, [
        userInfo.id,
        "House Expences",
      ]);
      const Luxury =
        "select sum(amount) as total from spends where userid=? and spendtype=?;";
      const Luxuryresponse = await db.all(Luxury, [userInfo.id, "Luxury"]);
      const savings =
        "select sum(amount) as total from spends where userid=? and spendtype=?;";
      const savingsresponse = await db.all(savings, [userInfo.id, "Savings"]);

      res
        .json({
          userInfo,
          totalamount: totalamountresponse[0].total,
          housespend: houseExpencesresponse[0].total,
          savings: savingsresponse[0].total,
          Luxury: Luxuryresponse[0].total,
        })
        .status(200);
    }
  } catch (err) {
    res.json({ error: err.message }).status(404);
  }
});
