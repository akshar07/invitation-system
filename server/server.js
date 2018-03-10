const express = require('express')
const app = express()
const path = require('path');
var passport = require('passport')
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



passport.use(new FacebookStrategy({
    clientID: '340100819812558',
    clientSecret: '534199fb0a8251d6de3c0bd16bdb7914',
    callbackURL: "https://invitation-system.herokuapp.com/auth/facebook/callback",
    profileFields: ['id', 'name', 'displayName', 'picture', 'email'],
  },
  async (accessToken, refreshToken, profile, done) => done(null, transformFacebookProfile(profile._json))
//   function(accessToken, refreshToken, profile, cb) {
//     User.findOrCreate({ facebookId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
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

app.get('/', (req, res) => res.render('index.ejs'))

app.get('/auth/facebook/callback',
passport.authenticate('facebook', { successRedirect: '/home',
failureRedirect: '/auth/facebook' }))
app.get('/auth/facebook',
passport.authenticate('facebook'));

app.get('/home',(req,res)=>res.render('home.html'))

app.listen(process.env.PORT, function() {
 console.log('running at localhost: ' + port);
});
