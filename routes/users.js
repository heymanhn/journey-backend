var _ = require('underscore');
var express = require('express');
var jwt = require('jsonwebtoken');

var ensureAuth = require('../utils/auth').ensureAuth;
var isCurrentUser = require('../utils/users').isCurrentUser;
var userIDExists = require('../utils/users').userIDExists;
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

  // Only create the user if the username or email doesn't exist
  duplicateUserCheck(params, res, next, function() {
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
        message: 'User created successfully.',
        user: user,
        token: 'JWT ' + token
      });
    });
  });
});

/*
 * For now, only allow the currently authenticated user to get information
 * about him/herself.
 */
app.get('/:id', ensureAuth, userIDExists, isCurrentUser,
  function(req, res, next) {
    res.status(200).json({
      success: true,
      user: req.userDoc
    });
  }
);

/*
 * PUT /users/:id
 *
 * Updates the user. Only allowed on currently authenticated user.
 *
 * Fields that can be updated:
 * - username
 * - email
 * - password
 * - name
 *
 */
app.put('/:id', ensureAuth, userIDExists, isCurrentUser,
  function(req, res, next) {
    var user = req.userDoc;
    var newParams = {
      username: req.body.username,
      password: req.body.password,
      email: req.body.email,
      name: req.body.name
    };

    // Only keep the params that need to be modified
    newParams = _.pick(newParams, function(value, key) {
      return value !== undefined && value !== user[key];
    });

    duplicateUserCheck(newParams, res, next, function() {
      _.each(newParams, function(value, key) {
        user[key] = value;
      });

      user.save(function(err, newUser) {
        if (err) {
          console.log(err);
          return next(err);
        }

        res.status(200).json({
          success: true,
          message: 'User updated successfully.',
          user: newUser
        });
      });
    });
  }
);

/*
 * DELETE /users/:id
 *
 * Deletes the user. Only allowed on currently authenticated user.
 */
app.delete('/:id', ensureAuth, userIDExists, isCurrentUser,
  function(req, res, next) {
    var user = req.userDoc;
    user.remove(function (err, user) {
      if (err) {
        console.log(err);
        next(err);
      }

      res.status(200).json({
        success: true,
        message: 'User deleted.'
      });
    });
  }
);

/*
 * Helper functions
 */

/*
 * Checks if there already exists a user with the specified username or email.
 *
 */
function duplicateUserCheck(params, res, next, success) {
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
      return success();
    }
  });
}

module.exports = app;
