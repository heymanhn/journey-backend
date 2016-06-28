var _ = require('underscore');
var bcrypt = require('bcrypt');
var express = require('express');
var passport = require('passport');

var User = require('../models/userModel');
var app = express.Router();

const saltRounds = 10;

/*
 * Requires:
 * - username
 * - email
 * - hashed password
 *
 * Optional:
 * - Name
 */
app.post('/', function(req, res, next) {
  var params = {
    username: req.body.username,
    password: req.body.password,
    email: req.body.email,
    name: req.body.name
  };

  // Input checking
  var missingKeys = [];
  _.each(params, function(value, key) {
    if (key !== 'name' && !value) {
      missingKeys.push(key);
    }
  });

  if (missingKeys.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Params missing: ' + missingKeys
    });
  }

  if (params.password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password needs to be at least 6 characters long'
    });
  }

  // TODO: Need to check if the user already exists

  // Hash the password
  bcrypt.hash(params.password, saltRounds, function(err, hash) {
    if (err) {
      console.log(err);
      return next(err);
    }

    params.password = hash;
    var newUser = new User(params);
    newUser.save(function(err, user) {
      if (err) {
        console.log(err);
        return next(err);
      }

      res.status(200).json({ success: true });
    });
  });
});

app.get('/:id', function(req, res, next) {
  User.findOne({ '_id': req.params.id }, function(err, user) {
    if (err) {
      return next(err);
    }

    res.status(200).json({ user: user });
  });
});

module.exports = app;
