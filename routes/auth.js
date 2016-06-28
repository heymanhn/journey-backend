var bcrypt = require('bcrypt');
var express = require('express');
var passport = require('passport');

var User = require('../models/userModel');
var app = express.Router();

app.post('/login', /*passport.authenticate('local'),*/ function(req, res, next) {
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;

  if (!username && !email) {
    return res.status(400).json({
      success: false,
      message: 'Missing username or email'
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Username or password missing'
    });
  }

  if (username) {
    User.findOne({ 'username': username }, processLogin);
  } else {
    User.findOne({ 'email': email }, processLogin);
  }

  function processLogin(err, user) {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if password is correct
    bcrypt.compare(password, user.password, function(err, result) {
      if (err) {
        return next(err);
      }

      if (!result) {
        res.status(401).json({
          success: false,
          message: 'Incorrect password'
        });
      } else {
        res.status(200).json({ user: user });
      }
    });
  }
});

app.post('/logout', passport.authenticate('local'), function(req, res, next) {
  // req.logout();
  res.json({ success: false });
});

module.exports = app;
