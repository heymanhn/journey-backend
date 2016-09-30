'use strict';

const _ = require('underscore');
const app = require('express').Router();
const jwt = require('jsonwebtoken');

const config = require('../../config/config');
const User = require('../../models/userModel');
const checkLoginParams = require('../../utils/auth').checkLoginParams;

app.post('/login', checkLoginParams, (req, res, next) => {
  User
    .findOne({ [req.loginType]: req.body[req.loginType] })
    .exec()
    .then(checkValidCredentials.bind(null, req.body.password))
    .then((user) => {
      const token = jwt.sign(
        user._doc,
        process.env.JWT || config.secrets.jwt,
        { expiresIn: '90 days' }
      );

      if (!token) {
        return Promise.reject(
          new Error('Error generating authentication token')
        );
      }

      res.json({
        user: _.omit(user._doc, 'password'),
        token: 'JWT ' + token
      });
    })
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

module.exports = app;
