'use strict';

const passport = require('passport');

module.exports = {
  checkAuthStatus(req, res, next) {
    if (!req.get('Authorization')) {
      return next();
    }

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
   * Checks if an anonymous ID is provided in the headers (especially if no
   * Authorization header is present). If it's present and valid, adds it to
   * the req object.
   */
  checkGuestStatus(req, res, next) {
    if (req.user) {
      return next();
    }

    const anonymousId = req.get('AnonymousID');
    const pattern = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-' +
      '[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'i');

    if (!anonymousId) {
      return next(new Error('Missing AnonymousId in headers'));
    } else if (!anonymousId.match(pattern)) {
      return next(new Error('AnonymousId has invalid format'));
    }

    req.anonymousUser = { anonymousId };
    next();
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
