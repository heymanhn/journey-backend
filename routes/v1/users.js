/*jslint node: true */
'use strict';

var _ = require('underscore');
var express = require('express');
var jwt = require('jsonwebtoken');

var config = require('../../config/config');
var ensureAuth = require('../../utils/auth').ensureAuth;
var Entry = require('../../models/entryModel');
var isCurrentUser = require('../../utils/users').isCurrentUser;
var Trip = require('../../models/tripModel');
var User = require('../../models/userModel');

var app = express.Router();

/*
 * POST /users
 *
 * Create a new user account. Requires user to provide a username, email, and
 * password. Optionally, user can provide a full name. Doesn't require
 * authentication.
 *
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
      user: _.omit(user._doc, 'password'),
      token: 'JWT ' + token
    });
  });
});


/*
 * GET /users/:userId
 *
 * Retrieve information about a user. Only allowed on currently authenticated
 * user.
 *
 */
app.get('/:userId', ensureAuth, isCurrentUser, function(req, res) {
  res.json({
    user: _.omit(req.userDoc._doc, 'password')
  });
});

/*
 * PUT /users/:userId
 *
 * Updates the user. Only allowed on currently authenticated user.
 *
 */
app.put('/:userId', ensureAuth, isCurrentUser, function(req, res, next) {
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
      user: _.omit(newUser._doc, 'password')
    });
  });
});

/*
 * DELETE /users/:userId
 *
 * Deletes the user. Only allowed on currently authenticated user.
 */
app.delete('/:userId', ensureAuth, isCurrentUser, function(req, res, next) {
  var user = req.userDoc;
  user.remove(function(err) {
    if (err) {
      return next(err);
    }

    res.json({
      message: 'User deleted.'
    });
  });
});

/*
 * GET /users/:userId/trips
 *
 * Get all the trips created by the currently authenticated user, in reverse
 * chronological order.
 *
 */
app.get('/:userId/trips', ensureAuth, isCurrentUser, function(req, res, next) {
  var page = Number(req.query.page) || 1;
  var params = {
    creator: req.params.userId
  };

  Trip
    .findTrips(params, page)
    .then(function(trips) {
      if (trips.length === 0) {
        var err = new Error('No trips found');
        err.status = 404;
        return Promise.reject(err);
      }

      res.json({
        page: page,
        results: trips.length,
        trips: trips
      });
    })
    .catch(next);
});

/*
 * GET /users/:userId/entries
 *
 * Get all journey entries created by this user, in reverse chronological
 * order.
 *
 * Query params:
 * - count: Number of items to return, default 20
 * - page: Page #, calculated based on 'count', default 1
 * - maxDate: Cut-off date for first entry to return
 *
 */
app.get('/:userId/entries', ensureAuth, isCurrentUser,
  function(req, res, next) {
  var count = Number(req.query.count) || config.database.DEFAULT_ENTRY_COUNT;
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
    .findEntries(params, count, page)
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
