const express = require('express')
const app = express()
const path = require('path');

app.set('views', path.join(__dirname, '../client'));
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => res.render('index'))
var port = 3000


//
var passport = require('passport')
, FacebookStrategy = require('passport-facebook').Strategy;

passport.use(new FacebookStrategy({
  clientID: "340100819812558",
  clientSecret: "534199fb0a8251d6de3c0bd16bdb7914",
  callbackURL: "https://invitation-system.herokuapp.com/auth/facebook/callback"
}

));


app.listen(port, function() {
 console.log('running at localhost: ' + port);
});
