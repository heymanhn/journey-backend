/*jslint node: true */
'use strict';

const _ = require('underscore');
const app = require('express').Router();
const jwt = require('jsonwebtoken');

const analytics = require('app/utils/analytics');
const { user: events } = require('app/utils/constants').analytics;
const config = require('app/config/config');
const ensureAuth = require('app/utils/auth').ensureAuth;
const Entry = require('app/models/entryModel');
const { isCurrentUser, validateSignupFields } = require('app/utils/users');
const Trip = require('app/models/tripModel');
const User = require('app/models/userModel');

app.post('/', validateSignupFields, (req, res, next) => {
  const params = _.pick(req.body, ['email', 'password', 'name', 'username']);

  new User(params)
    .save()
    .then(generateJWT.bind(null, req))
    .then(identifySignup)
    .then(trackSignup)
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
  return user;
}

// Identify the user on analytics
function identifySignup(user) {
  analytics.identify(user);
  return user;
}

function trackSignup(user) {
  analytics.track(user, events.SIGN_UP);
  return user;
}

app.get('/:userId', ensureAuth, isCurrentUser, (req, res) => {
  analytics.track(req.user, events.GET_USER);
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
    .then(identifySignup)
    .then(trackUpdateUser.bind(null, Object.keys(newParams)))
    .then((newUser) => {
      res.json({
        message: 'User updated successfully.',
        user: _.omit(newUser._doc, 'password')
      });
    })
    .catch(next);
});

function trackUpdateUser(params, user) {
  analytics.track(user, events.UPDATE_USER, { fields: params.toString() });
  return user;
}

app.delete('/:userId', ensureAuth, isCurrentUser, (req, res, next) => {
  req.user
    .remove()
    .then(trackDeleteUser)
    .then(() => res.json({ message: 'User deleted.' }))
    .catch(next);
});

function trackDeleteUser(user) {
  analytics.track(user, events.DELETE_USER);
  return user;
}

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
