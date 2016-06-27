var express = require('express');
var passport = require('passport');

var User = require('../models/userModel');
var app = express.Router();

app.post('/register', function(req, res, next) {
  res.json('OK');
});

app.post('/login', passport.authenticate('local'), function(req, res, next) {
  res.json('OK');
});

module.exports = app;
