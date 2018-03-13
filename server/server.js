const express = require('express')
const app = express()
var session = require('express-session');
const path = require('path');
var passport = require('passport')
var shortid = require('shortid');
const FacebookStrategy = require('passport-facebook').Strategy;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../client'));
app.use(express.static(path.join(__dirname, '../client')));

var port = 3000
const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

client.connect();
const db_creation_string=`CREATE TABLE IF NOT EXISTS invitations(id SERIAL PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT current_timestamp, updated_at timestamp NOT NULL DEFAULT current_timestamp, senderId TEXT, receiverId TEXT);
                        CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY, name TEXT, link TEXT, email TEXT);`;

app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true,
  proxy: true, // add this line
  cookie: {
    secure: true,
    maxAge: 3600000,
  }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
// Deserialize user from the sessions
passport.deserializeUser((user, done) => done(null, user));
//shortid
passport.use(new FacebookStrategy({
    clientID: '340100819812558',
    clientSecret: '534199fb0a8251d6de3c0bd16bdb7914',
    callbackURL: "https://invitation-system.herokuapp.com/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'photos', 'email'],
    enableProof: true
  },
  function(accessToken, refreshToken, profile, done) {
    let pro_email=profile.emails[0].value;
    client.query(`SELECT link FROM users WHERE email='${pro_email}'`,(err,res)=>{
        if(err){console.log(err)}
        if(res.rows.length >=1){console.log("ran"); done(null, res);}
        else{
          console.log("yep");
            let shortId= shortid.generate();
            client.query(`INSERT INTO users (name, link, email) VALUES ('${profile.displayName}','${shortId}','${pro_email}')`,(err,res)=>{
              if(err){console.log(err)}
              else{
                done(null, res);
              }
            })
        }
    })
  }
));
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

app.enable('trust proxy');
const express_enforces_ssl = require('express-enforces-ssl');
app.use(express_enforces_ssl());

app.get('/', (req, res) =>{ 
    client.query(db_creation_string, (err, res) => {
        if (err) {
          console.log(err)
        } else {
          console.log("done" + res)
        }
    });
    res.render('index')
})

app.get('/auth/facebook/callback',
passport.authenticate('facebook', { successRedirect: '/home',
failureRedirect: '/auth/facebook' }))

app.get('/auth/facebook',
passport.authenticate('facebook',{scope:'email'}));

app.get('/home',isLoggedIn,(req,res)=>{
    console.log(req.user.rows[0].link)
    console.log("this is res"+req.res)
    res.render('home',{
      user : req.user
    })
})
function isLoggedIn(req, res, next) {
  console.log(req.isAuthenticated())
      // if user is authenticated in the session, carry on
      if (req.isAuthenticated())
          return next();
  
      // if they aren't redirect them to the home page
      res.redirect('/');
  }
app.listen(process.env.PORT, function() {
 console.log('running at localhost: ' + port);
});
