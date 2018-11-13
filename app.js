const express = require('express');
const tfa = require('node-2fa');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const http = require('http');
const path = require('path');
const fs = require('fs');

const owners = ['215644829969809421', '203894491784937472', '203894491784937472'];

const scopes = ['identify', 'email'];

passport.serializeUser(function(user, done) {
    return done(null, user);
});

passport.deserializeUser(function(obj, done) {
    return done(null, obj);
});

passport.use('discord', new DiscordStrategy({
        clientID: '488439593302097930',
        clientSecret: 'bCbxoSVYZCuV_ejNvB6lEba1roR-kV-A',
        callbackURL: 'http://localhost:3000/discord',
        scope: scopes
    },
    function (accessToken, refreshToke, profile, done) {
        process.nextTick(function() {
            return done(null, profile);
        });
    }));

const app = express();

app.set('port', 3000);

app.use(express.static('public'));

app.use(session({
    secret: 'tfa',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/discord', passport.authenticate('discord', {failureRedirect: '/'}), function (req, res) {
    res.redirect('/2fa');
});

app.use('/2fa', function (req, res) {
    if(!req.isAuthenticated()) {
        res.redirect('/');
        return;
    }
    if(!owners.includes(req.user.id)) {
        res.redirect('/');
        return;
    }

    res.sendFile(path.join(__dirname+'/html/2fa.html'));
});

var infoRouter = express.Router();

infoRouter.get('/', function (req, res) {
    if(!req.isAuthenticated()) {
        res.json({
            error: 'not authenticated'
        });
        return;
    }
    if(!owners.includes(req.user.id)) {
        res.json({
            error: 'not a owner'
        });
        return;
    }

    fs.readdir('keys', function (error, items) {
        if(error) {
            res.json({error: error});
        } else {
            res.json(items);
        }
    });
});

infoRouter.get('/:key', function (req, res) {
    if(!req.isAuthenticated()) {
        res.json({
            error: 'not authenticated'
        });
        return;
    }
    if(!owners.includes(req.user.id)) {
        res.json({
            error: 'not a owner'
        });
        return;
    }
    var key = req.params.key;
    fs.readFile('keys/' + key, function (err, data) {
        if(err) {
            res.json({error: err});
        } else {
            var json = JSON.parse(data);
            var secret = json['secret'];
            var newToken = tfa.generateToken(secret).token;
            json['secret'] = null;
            json['code'] = newToken;
            res.json(json);
        }
    })
});

app.use('/info', infoRouter);

app.use('/', function (req, res) {
    res.sendFile(path.join(__dirname+'/html/index.html'));
});

var server = http.createServer(app);
server.listen(3000);