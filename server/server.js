const express = require('express')
const app = express()
const path = require('path');
var passport = require('passport')
var shortid = require('shortid');
const FacebookStrategy = require('passport-facebook').Strategy;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../client'));
app.use(express.static(path.join(__dirname, '../client')));


var port = 3000

const transformFacebookProfile = (profile) => ({
    name: profile.name,
    avatar: profile.picture.data.url,
  });
//

//db
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

client.connect();
const db_creation_string=`CREATE TABLE IF NOT EXISTS invitations(id SERIAL PRIMARY KEY, created_at timestamp with time zone NOT NULL DEFAULT current_timestamp, updated_at timestamp NOT NULL DEFAULT current_timestamp, senderId TEXT, receiverId TEXT);
                        CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY, name TEXT, link TEXT, email TEXT);`;


//shortid
passport.use(new FacebookStrategy({
    clientID: '340100819812558',
    clientSecret: '534199fb0a8251d6de3c0bd16bdb7914',
    callbackURL: "https://invitation-system.herokuapp.com/auth/facebook/callback",
    profileFields: ['id', 'name', 'displayName', 'picture', 'email'],
  },
  function(accessToken, refreshToken, profile, done) {
    console.log("done")
    client.query(`SELECT * FROM users WHERE users.email=${profile.email}`,(err,res)=>{
        if(err){console.log(err)}
        if(res){ done(null, res);}
        else{
            let shortId= shortid.generate();
            client.query(`INSERT INTO users (name, link, email) VALUES (${profile.name},${shortId},${profile.email})`)
        }
    })
  }
));
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
 
passport.serializeUser((user, done) => done(null, user));
// Deserialize user from the sessions
passport.deserializeUser((user, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());
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
passport.authenticate('facebook'));

app.get('/home',(req,res)=>{

    res.render('home')
})

app.listen(process.env.PORT, function() {
 console.log('running at localhost: ' + port);
});
