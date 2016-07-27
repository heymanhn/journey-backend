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
 * Log in with either a username or email, as well as the password. The server
 * returns a JSON Web Token if authentication is successful.
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

      if (!token) {
        return next(new Error('Error generating authentication token'));
      }

      delete user._doc.password;
      res.json({
        user: user,
        token: 'JWT ' + token
      });
    }
  });
});

module.exports = app;
