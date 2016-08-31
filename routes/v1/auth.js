/*jslint node: true */
'use strict';

var _ = require('underscore');
var express = require('express');
var jwt = require('jsonwebtoken');

var config = require('../../config/config');
var User = require('../../models/userModel');
var checkLoginParams = require('../../utils/auth').checkLoginParams;

var app = express.Router();

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
