/*jslint node: true */
'use strict';

var express = require('express');
var jwt = require('jsonwebtoken');

var config = require('../../config/config');
var User = require('../../models/userModel');
var checkLoginParams = require('../../utils/auth').checkLoginParams;

var app = express.Router();

/*
 * POST /login
 *
 * Users can log in with either their usernames or email address, in
 * combination with their passwords.
 *
 * Upon successful login, the backend generates a JSON web token and returns
 * it to the client.
 *
 * The checkLoginParams() middleware sets req.loginType based on whether
 * the request provides a username or an email.
 */
app.post('/login', checkLoginParams, function(req, res, next) {
  var opts = {};
  opts[req.loginType] = req.body[req.loginType];

  User.findOne(opts, function(err, user) {
    if (err) {
      return next(err);
    }

    if (!user) {
      return next(new Error('Invalid username or email'));
    }

    if (!user.checkPassword(req.body.password)) {
      return next(new Error('Invalid password'));
    } else {
      var token = jwt.sign(
        user._doc,
        config.secrets.jwt,
        { expiresIn: '90 days' }
      );

      res.json({
        user: user,
        token: 'JWT ' + token
      });
    }
  });
});

module.exports = app;
