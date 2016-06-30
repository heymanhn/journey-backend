/*jslint node: true */
'use strict';

var express = require('express');
var jwt = require('jsonwebtoken');

var config = require('../../config/config');
var User = require('../../models/userModel');
var app = express.Router();

app.post('/login', function(req, res, next) {
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;

  if (!username && !email) {
    return res.status(400).json({
      success: false,
      message: 'Missing username or email'
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Username or password missing'
    });
  }

  if (username) {
    User.findOne({ 'username': username }, processLogin);
  } else {
    User.findOne({ 'email': email }, processLogin);
  }

  function processLogin(err, user) {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if password is correct
    user.checkPassword(password, function(err, result) {
      if (err) {
        console.log(err);
        return next(err);
      }

      if (!result) {
        res.status(401).json({
          success: false,
          message: 'Incorrect password'
        });
      } else {
        var token = jwt.sign(
          user._doc,
          config.secrets.jwt,
          { expiresIn: '90 days' }
        );

        res.status(200).json({
          success: true,
          user: user,
          token: 'JWT ' + token
        });
      }
    });
  }
});

module.exports = app;
