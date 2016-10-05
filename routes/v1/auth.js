'use strict';

const _ = require('underscore');
const app = require('express').Router();
const jwt = require('jsonwebtoken');

const analytics = require('app/utils/analytics');
const { auth: events } = require('app/utils/constants').analytics;
const config = require('app/config/config');
const User = require('app/models/userModel');
const checkLoginParams = require('app/utils/auth').checkLoginParams;

app.post('/login', checkLoginParams, (req, res, next) => {
  User
    .findOne({ [req.loginType]: req.body[req.loginType] })
    .exec()
    .then(checkValidCredentials.bind(null, req.body.password))
    .then(generateJWT.bind(null, req))
    .then(trackLogin.bind(null, req))
    .then(sendResponse.bind(null, req, res))
    .catch(next);
});

function checkValidCredentials(password, user) {
  if (!user) {
    return Promise.reject(new Error('Invalid username or email'));
  }

  if (!user.checkPassword(password)) {
    return Promise.reject(new Error('Invalid password'));
  }

  return user;
}

function generateJWT(req, user) {
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

function trackLogin(req, user) {
  analytics.alias(req);
  analytics.track(req, events.LOG_IN, { loginType: req.loginType });

  return user;
}

function sendResponse(req, res, user) {
  res.json({
    user: _.omit(user._doc, 'password'),
    token: 'JWT ' + req.token
  });
}

module.exports = app;
