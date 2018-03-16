const express = require("express");
const app = express();
var session = require("express-session");
const path = require("path");
var passport = require("passport");
var shortid = require("shortid");
const FacebookStrategy = require("passport-facebook").Strategy;
const bodyParser = require("body-parser");
var nodemailer = require("nodemailer");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../client"));
app.use(express.static(path.join(__dirname, "../client")));

var port = 3000;
const { Client } = require("pg");
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

client.connect();
const db_creation_string = `CREATE TABLE IF NOT EXISTS invitations(id SERIAL PRIMARY KEY, created_at TIMESTAMP, updated_at TIMESTAMP, link TEXT, senderId TEXT, sendermsg TEXT, senderName TEXT, receiverId TEXT);
                        CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY, name TEXT, link TEXT, email TEXT);`;

app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
    proxy: true, // add this line1
    cookie: {
      secure: true,
      maxAge: 3600000
    }
  })
);
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
// Deserialize user from the sessions
passport.deserializeUser((user, done) => done(null, user));
//shortid
passport.use(
  new FacebookStrategy(
    {
      clientID: "340100819812558",
      clientSecret: "534199fb0a8251d6de3c0bd16bdb7914",
      callbackURL:
        "https://invitation-system.herokuapp.com/auth/facebook/callback",
      profileFields: ["id", "displayName", "photos", "email"],
      enableProof: true
    },
    function(accessToken, refreshToken, profile, done) {
      let pro_email = profile.emails[0].value;
      client.query(
        `SELECT * FROM users WHERE email='${pro_email}'`,
        (err, res) => {
          if (err) {
            console.log(err);
          }
          if (res.rows.length >= 1) {
            console.log("ran");
            done(null, res);
          } else {
            console.log("yep");
            let shortId = shortid.generate();
            client.query(
              `INSERT INTO users (name, link, email) VALUES ('${
                profile.displayName
              }','${shortId}','${pro_email}')`,
              (err, res) => {
                if (err) {
                  console.log(err);
                } else {
                  done(null, res);
                }
              }
            );
          }
        }
      );
    }
  )
);
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.enable("trust proxy");
const express_enforces_ssl = require("express-enforces-ssl");
app.use(express_enforces_ssl());
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true
  })
);

app.get("/", (req, res) => {
  client.query(db_creation_string, (err, res) => {
    if (err) {
      console.log(err);
    } else {
      console.log("done" + res);
    }
  });
  res.render("index");
});

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    successRedirect: "/home",
    failureRedirect: "/auth/facebook"
  })
);

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: "email" })
);

app.get("/home", isLoggedIn, (req, res) => {
  console.log(req.user);
  res.render("home", {
    name: req.user.rows[0].name,
    link: req.user.rows[0].link,
    email: req.user.rows[0].email
  });
});
app.post("/invite", (req, res) => {
  let senderId = req.body.link,
    sendermsg = req.body.msg,
    receiverId = req.body.to,
    newLink = shortid.generate();
    senderName = req.body.name;
  let current = new Date().toLocaleDateString();
  client.query(
    `INSERT INTO invitations (created_at,updated_at, link, senderId,sendermsg,senderName,receiverId) VALUES ('${current}','${current}','${newLink}','${senderId}','${sendermsg}','${senderName}','${receiverId}')`,
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        sendEmail(receiverId, senderId, newLink);
        res.send("invited");
      }
    }
  );
});
app.get("/myInvitations", (req, res) => {
  client.query(
    `SELECT * from invitations where senderId='Akshar Takle'`,
    (err, doc) => {
      if (err) {
        console.log(err);
      } else {
        console.log(doc);
        res.status(200).send(doc.rows);
      }
    }
  );
});
function isLoggedIn(req, res, next) {
  console.log(req.isAuthenticated());
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated()) return next();

  // if they aren't redirect them to the home page
  res.redirect("/");
}
function sendEmail(_to, _from, _link) {
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "cinemarkbooking@gmail.com",
      pass: "Cinemark@123"
    }
  });
  let clientUrl = `https://invitation-system.herokuapp.com/invite/${_from}-${_link}`;
  var mailOptions = {
    from: "takleakshar@gmail.com",
    to: _to,
    subject: "You have been Invited to Awesome App",
    html: `<p> Your invitation link is: <a href='${clientUrl}'> ${clientUrl}</a>`
  };
  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}
app.get("/invite/:id", (req, res) => {
  console.log(req.params);
  let sender = req.params.id
    .trim()
    .split("-")[0]
    .trim();
  let inviteLink = req.params.id
    .trim()
    .split("-")[1]
    .trim();
  console.log(sender);
  console.log(inviteLink);
  client.query(`SELECT * FROM invitations WHERE senderid='${sender}' AND link='${inviteLink}'`, (err, doc) => {
    if (err) {
      console.log(err);
    } else {
      let seen=new Date().toLocaleDateString();
      client.query(`UPDATE invitations SET updated_at='${seen}' WHERE senderid='${sender}' AND link='${inviteLink}'`,(err,doc)=>{
        if(err){return console.log(err)}
        else{
          console.log("seen updated")
        }
      })
      res.render("invite", { result: doc.rows[0] });
    }
  });
});
app.listen(process.env.PORT, function() {
  console.log("running at localhost: " + port);
});
