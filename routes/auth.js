var express = require('express');
var passport = require('passport');

var User = require('../models/userModel');
var app = express.Router();

app.post('/login', passport.authenticate('local'), function(req, res, next) {
  res.json({ success: false });
});

app.post('/logout', passport.authenticate('local'), function(req, res, next) {
  // req.logout();
  res.json({ success: false });
});

module.exports = app;
