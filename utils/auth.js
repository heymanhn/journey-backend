'use strict';

const passport = require('passport');

module.exports = {
  ensureAuth(req, res, next) {
    /*
     * This custom implementation of authenticate() sets req.user to the
     * user object every time, overriding the default session-based behavior.
     */
    passport.authenticate('jwt', (err, user) => {
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
  checkLoginParams(req, res, next) {
    const { email, password, username }  = req.body;

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
