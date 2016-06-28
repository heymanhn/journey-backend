var _ = require('underscore');
var express = require('express');
var passport = require('passport');

var User = require('../models/userModel');
var app = express.Router();

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

  // Check if the username or email already exists
  User.find({
    $or: [
      { username: params.username },
      { email: params.email }
    ]
  }, function(err, users) {
    if (err) {
      console.log(err);
      return next(err);
    }

    if (users && users.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    } else {
      User.generateHash(params.password, function(err, hash) {
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

          // Log the user in once account created
          res.status(200).json({ success: true });
        });
      });
    }
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
