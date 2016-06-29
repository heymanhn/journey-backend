var _ = require('underscore');
var express = require('express');
var jwt = require('jsonwebtoken');

var ensureAuth = require('../utils/auth');
var config = require('../config/config');
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
 *
 * Doesn't require authentication
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
      var newUser = new User(params);
      newUser.save(function(err, user) {
        if (err) {
          console.log(err);
          return next(err);
        }

        // Generate JWT once account is created successfully
        var token = jwt.sign(
          user._doc,
          config.secrets.jwt,
          { expiresIn: '90 days' }
        );

        res.status(200).json({
          success: true,
          message: 'Account created successfully',
          user: user,
          token: 'JWT ' + token
        });
      });
    }
  });
});

/*
 * For now, only allow the currently authenticated user to get information
 * about him/herself.
 */
app.get('/:id', ensureAuth, function(req, res, next) {
  var userId = req.params.id;
  if (userId !== req.user._id) {
    return res.status(401).json({
      success: false,
      message: 'Cannot get information about another user'
    });
  }

  User.findOne({ '_id': userId }, function(err, user) {
    if (err) {
      return next(err);
    }

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    } else {
      res.status(200).json({
        success: true,
        user: user
      });
    }
  });
});

/*
 * PUT /users/:id
 *
 * Updates the user. Only allowed on currently authenticated user.
 */
app.put('/:id', ensureAuth, function(req, res, next) {

  res.status(400).json({ success: false });
});

/*
 * DELETE /users/:id
 *
 * Deletes the user. Only allowed on currently authenticated user.
 */
app.delete('/:id', ensureAuth, function(req, res, next) {
  res.status(400).json({ success: false });
});

module.exports = app;
