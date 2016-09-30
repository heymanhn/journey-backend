/*jslint node: true */
'use strict';

const _ = require('underscore');
const app = require('express').Router();
const jwt = require('jsonwebtoken');

const config = require('../../config/config');
const ensureAuth = require('../../utils/auth').ensureAuth;
const Entry = require('../../models/entryModel');
const isCurrentUser = require('../../utils/users').isCurrentUser;
const Trip = require('../../models/tripModel');
const User = require('../../models/userModel');

app.post('/', (req, res, next) => {
  const params = _.pick(req.body, ['email', 'password', 'name', 'username']);

  // Input checking
  let missingKeys = [];
  _.each(params, (value, key) => {
    if (key !== 'name' && key !== 'username' && !value) {
      missingKeys.push(key);
    }
  });

  if (missingKeys.length > 0) {
    return next(new Error('Params missing: ' + missingKeys));
  }

  const newUser = new User(params);
  newUser.save((err, user) => {
    if (err) {
      return next(err);
    }

    // Generate JWT once account is created successfully
    const token = jwt.sign(
      user._doc,
      process.env.JWT || config.secrets.jwt,
      { expiresIn: '90 days' }
    );

    res.json({
      message: 'User created successfully.',
      user: _.omit(user._doc, 'password'),
      token: 'JWT ' + token
    });
  });
});

app.get('/:userId', ensureAuth, isCurrentUser, (req, res) => {
  res.json({ user: _.omit(req.userDoc._doc, 'password') });
});

app.put('/:userId', ensureAuth, isCurrentUser, (req, res, next) => {
  const user = req.userDoc;
  let newParams = _.pick(req.body, ['username', 'password', 'email', 'name']);

  // Only keep the params that need to be modified
  newParams = _.pick(newParams, (value, key) => {
    return value !== undefined && value !== user[key];
  });
  _.each(newParams, (value, key) => {
    if (key === 'password' && user.checkPassword(value)) {
      return;
    }

    user[key] = value;
  });

  user.save((err, newUser) => {
    if (err) {
      return next(err);
    }

    res.json({
      message: 'User updated successfully.',
      user: _.omit(newUser._doc, 'password')
    });
  });
});

app.delete('/:userId', ensureAuth, isCurrentUser, (req, res, next) => {
  const user = req.userDoc;
  user.remove((err) => {
    if (err) {
      return next(err);
    }

    res.json({ message: 'User deleted.' });
  });
});

app.get('/:userId/trips', ensureAuth, isCurrentUser, (req, res, next) => {
  const count = Number(req.query.count) || config.database.DEFAULT_TRIP_COUNT;
  const page = Number(req.query.page) || 1;
  var params = { creator: req.params.userId };

  Trip
    .findTrips(params, count, page)
    .then((trips) => {
      if (trips.length === 0) {
        let err = new Error('No trips found');
        err.status = 404;
        return Promise.reject(err);
      }

      res.json({
        page,
        results: trips.length,
        trips
      });
    })
    .catch(next);
});

app.get('/:userId/entries', ensureAuth, isCurrentUser, (req, res, next) => {
  const count = Number(req.query.count) || config.database.DEFAULT_ENTRY_COUNT;
  const page = Number(req.query.page) || 1;
  let params = { creator: req.params.userId };

  if (req.query.maxDate) {
    params.date = { $lt: new Date(req.query.maxDate) };
  }

  Entry
    .findEntries(params, count, page)
    .then((entries) => {
      if (entries.length === 0) {
        let err = new Error('No entries found');
        err.status = 404;
        return Promise.reject(err);
      }

      res.json({
        page,
        results: entries.length,
        entries
      });
    })
    .catch(next);
});

module.exports = app;
