/*jslint node: true */
'use strict';

const _ = require('underscore');
const app = require('express').Router();
const jwt = require('jsonwebtoken');

const config = require('../../config/config');
const ensureAuth = require('../../utils/auth').ensureAuth;
const Entry = require('../../models/entryModel');
const { isCurrentUser, validateSignupFields } = require('../../utils/users');
const Trip = require('../../models/tripModel');
const User = require('../../models/userModel');

app.post('/', validateSignupFields, (req, res, next) => {
  const params = _.pick(req.body, ['email', 'password', 'name', 'username']);

  new User(params)
    .save()
    .then(generateJWT.bind(null, res))
    .catch(next);
});

function generateJWT(res, user) {
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
}

app.get('/:userId', ensureAuth, isCurrentUser, (req, res) => {
  res.json({ user: _.omit(req.user._doc, 'password') });
});

app.put('/:userId', ensureAuth, isCurrentUser, (req, res, next) => {
  const user = req.user;
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

  user
    .save()
    .then((newUser) => {
      res.json({
        message: 'User updated successfully.',
        user: _.omit(newUser._doc, 'password')
      });
    })
    .catch(next);
});

app.delete('/:userId', ensureAuth, isCurrentUser, (req, res, next) => {
  const user = req.user;
  user
    .remove()
    .then(() => res.json({ message: 'User deleted.' }))
    .catch(next);
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
