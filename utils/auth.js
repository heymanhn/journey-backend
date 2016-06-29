var passport = require('passport');

module.exports = {
  ensureAuth: function(req, res, next) {
    /*
     * This custom implementation of the authenticate() sets req.user to the
     * user object every time, overriding the default session-based behavior.
     */
    passport.authenticate('jwt', function(err, user, info) {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not Authorized'
        });
      }

      req.user = user;
      next();
    })(req, res, next);
  }
};
