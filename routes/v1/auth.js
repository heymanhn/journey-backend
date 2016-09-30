'use strict';

const _ = require('underscore');
const app = require('express').Router();
const jwt = require('jsonwebtoken');

const config = require('../../config/config');
const User = require('../../models/userModel');
const checkLoginParams = require('../../utils/auth').checkLoginParams;

app.post('/login', checkLoginParams, (req, res, next) => {
  const opts = { [req.loginType]: req.body[req.loginType] };

  User.findOne(opts, (err, user) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return next(new Error('Invalid username or email'));
    }

    if (!user.checkPassword(req.body.password)) {
      return next(new Error('Invalid password'));
    } else {
      const token = jwt.sign(
        user._doc,
        process.env.JWT || config.secrets.jwt,
        { expiresIn: '90 days' }
      );

      if (!token) {
        return next(new Error('Error generating authentication token'));
      }

      res.json({
        user: _.omit(user._doc, 'password'),
        token: 'JWT ' + token
      });
    }
  });
});

module.exports = app;
