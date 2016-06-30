/*jslint node: true */
'use strict';

/*
 * JSON Web Token strategy for passport
 */
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;

var config = require('../config/config');
var User = require('../models/userModel');

module.exports = function(passport) {
  var options = {
    jwtFromRequest: ExtractJwt.fromAuthHeader(),
    secretOrKey: config.secrets.jwt
  };

  passport.use(new JwtStrategy(options, function(jwt_payload, cb) {
    User.findOne({'_id': jwt_payload._id}, function(err, user) {
      if (err) {
        return cb(err, false);
      }
      if (user) {
        cb(null, user);
      } else {
        cb(null, false);
      }
    });
  }));
};
