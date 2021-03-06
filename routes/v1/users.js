/*jslint node: true */
'use strict';

const _ = require('underscore');
const app = require('express').Router();
const jwt = require('jsonwebtoken');

const analytics = require('app/utils/analytics');
const { user: events } = require('app/utils/constants').analytics;
const config = require('app/config/config');
const Entry = require('app/models/entryModel');
const { isCurrentUser, validateSignupFields } = require('app/utils/users');
const Trip = require('app/models/tripModel');
const User = require('app/models/userModel');

app.post('/', validateSignupFields, (req, res, next) => {
  const params = _.pick(req.body, ['email', 'password', 'name', 'username']);

  new User(params)
    .save()
    .then(generateJWT.bind(null, req))
    .then(identifySignup.bind(null, req))
    .then(trackSignup.bind(null, req))
    .then((user) => {
      res.json({
        message: 'User created successfully.',
        user: _.omit(user._doc, 'password'),
        token: 'JWT ' + req.token
      });
    })
    .catch(next);
});

function generateJWT(req, user) {
  // Generate JWT once account is created successfully
  const token = jwt.sign(
    user._doc,
    process.env.JWT || config.secrets.jwt,
    { expiresIn: '90 days' }
  );

  if (!token) {
    return Promise.reject(new Error('Error generating authentication token'));
  }

  req.token = token;
  req.user = user;
  return user;
}

// Identify the user on analytics
function identifySignup(req, user) {
  analytics.alias(req);
  analytics.identify(req);
  return user;
}

function trackSignup(req, user) {
  analytics.track(req, events.SIGN_UP);
  return user;
}

app.get('/:userId', isCurrentUser, (req, res) => {
  analytics.track(req, events.GET_USER);
  res.json({ user: _.omit(req.user._doc, 'password') });
});

app.put('/:userId', isCurrentUser, (req, res, next) => {
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
    .then(generateJWT.bind(null, req))
    .then(identifyUpdateUser.bind(null, req))
    .then(trackUpdateUser.bind(null, req, Object.keys(newParams)))
    .then((newUser) => {
      res.json({
        message: 'User updated successfully.',
        token: 'JWT ' + req.token,
        user: _.omit(newUser._doc, 'password')
      });
    })
    .catch(next);
});

function identifyUpdateUser(req, user) {
  analytics.identify(req);
  return user;
}

function trackUpdateUser(req, params, user) {
  analytics.track(req, events.UPDATE_USER, { fields: params.toString() });
  return user;
}

app.delete('/:userId', isCurrentUser, (req, res, next) => {
  req.user
    .remove()
    .then(trackDeleteUser.bind(null, req))
    .then(() => res.json({ message: 'User deleted.' }))
    .catch(next);
});

function trackDeleteUser(req, user) {
  analytics.track(req, events.DELETE_USER);
  return user;
}

app.get('/:userId/trips', isCurrentUser, (req, res, next) => {
  const count = Number(req.query.count) || config.database.DEFAULT_TRIP_COUNT;
  const page = Number(req.query.page) || 1;
  var params = { creator: req.params.userId };

  Trip
    .findTrips(params, count, page)
    .then((trips) => {
      res.json({
        page,
        results: trips.length,
        trips
      });
    })
    .catch(next);
});

app.get('/:userId/entries', isCurrentUser, (req, res, next) => {
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
