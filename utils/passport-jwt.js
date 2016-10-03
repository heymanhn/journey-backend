'use strict';

/*
 * JSON Web Token strategy for passport
 */
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const config = require('app/config/config');
const User = require('app/models/userModel');

module.exports = function(passport) {
  const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeader(),
    secretOrKey: process.env.JWT || config.secrets.jwt
  };

  passport.use(new JwtStrategy(options, (jwt_payload, cb) => {
    User.findOne({'_id': jwt_payload._id}, (err, user) => {
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
