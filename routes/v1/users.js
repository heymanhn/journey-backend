/*jslint node: true */
'use strict';

var _ = require('underscore');
var express = require('express');
var jwt = require('jsonwebtoken');

var config = require('../../config/config');
var ensureAuth = require('../../utils/auth').ensureAuth;
var Entry = require('../../models/entryModel');
var isCurrentUser = require('../../utils/users').isCurrentUser;
var userIDExists = require('../../utils/users').userIDExists;
var User = require('../../models/userModel');

var app = express.Router();

/*
 * User management endpoints
 * =========================
 */

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
    return next(new Error('Params missing: ' + missingKeys));
  }

  var newUser = new User(params);
  newUser.save(function(err, user) {
    if (err) {
      return next(err);
    }

    // Generate JWT once account is created successfully
    var token = jwt.sign(
      user._doc,
      config.secrets.jwt,
      { expiresIn: '90 days' }
    );

    res.json({
      message: 'User created successfully.',
      user: user,
      token: 'JWT ' + token
    });
  });
});

/*
 * For now, only allow the currently authenticated user to get information
 * about him/herself.
 */
app.get('/:userId', ensureAuth, userIDExists, isCurrentUser,
  function(req, res, next) {
    res.json({
      user: req.userDoc
    });
  }
);

/*
 * PUT /users/:userId
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
app.put('/:userId', ensureAuth, userIDExists, isCurrentUser,
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
    _.each(newParams, function(value, key) {
      if (key === 'password' && user.checkPassword(value)) {
        return;
      }

      user[key] = value;
    });

    user.save(function(err, newUser) {
      if (err) {
        return next(err);
      }

      res.json({
        message: 'User updated successfully.',
        user: newUser
      });
    });
  }
);

/*
 * DELETE /users/:userId
 *
 * Deletes the user. Only allowed on currently authenticated user.
 */
app.delete('/:userId', ensureAuth, userIDExists, isCurrentUser,
  function(req, res, next) {
    var user = req.userDoc;
    user.remove(function(err) {
      if (err) {
        return next(err);
      }

      res.json({
        message: 'User deleted.'
      });
    });
  }
);


/*
 * User state endpoints
 * =========================
 */

/*
 * GET /users/:userId/entries
 *
 * Get all journey entries created by this user, in reverse chronological order
 *
 * Query params:
 * - count: Number of items to return, default 20
 * - page: Page #, calculated based on 'count', default 1
 * - maxDate: Cut-off date for first entry to return
 *
 */
app.get('/:userId/entries', ensureAuth, userIDExists, isCurrentUser,
  function(req, res, next) {
    var count = Number(req.query.count) || config.database.DEFAULT_COUNT;
    var page = Number(req.query.page) || 1;
    var params = {
      creator: req.params.userId
    };

    if (req.query.maxDate) {
      params.date = {
        $lt: new Date(req.query.maxDate)
      };
    }

    Entry
      .find(params)
      .sort({ date: -1 })
      .skip(count * (page-1))
      .limit(count)
      .exec()
      .then(function(entries) {
        if (entries.length === 0) {
          var err = new Error('No entries found');
          err.status = 404;
          return Promise.reject(err);
        }

        res.json({
          page: page,
          results: entries.length,
          entries: entries
        });
      })
      .catch(next);
});

module.exports = app;
