/*jslint node: true */
'use strict';

var passport = require('passport');

module.exports = {
  ensureAuth: function(req, res, next) {
    /*
     * This custom implementation of authenticate() sets req.user to the
     * user object every time, overriding the default session-based behavior.
     */
    passport.authenticate('jwt', function(err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        err = new Error('Not Authorized');
        err.status = 401;
        return next(err);
      }

      req.user = user;
      next();
    })(req, res, next);
  },

  /*
   * Ensures the request includes a username/email and a password
   */
  checkLoginParams: function(req, res, next) {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;

    if (!username && !email) {
      return next(new Error('Username or email not provided'));
    }

    if (!password) {
      return next(new Error('Password not provided'));
    }

    req.loginType = username ? 'username' : 'email';
    next();
  }
};
