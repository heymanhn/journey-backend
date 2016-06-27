var express = require('express');
var passport = require('passport');

var User = require('../models/userModel');
var app = express.Router();

app.get('/', function(req, res, next) {
  res.json('OK');
});

module.exports = app;
