/*jslint node: true */
'use strict';

var passport = require('passport');

module.exports = {
  ensureAuth: function(req, res, next) {
    /*
     * This custom implementation of the authenticate() sets req.user to the
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
  }
};
