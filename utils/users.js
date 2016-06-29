var User = require('../models/userModel');

module.exports = {
  /*
   * Only allows requests where the user in the JSON Web Token matches the user
   * that the operation is intended for.
   *
   * Assumes that the URI includes req.params.userId
   */
  isCurrentUser: function(req, res, next) {
    if (req.params.userId !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Cannot perform this action on another user.'
      });
    }

    next();
  },

  /*
   * Checks if the user exists in the DB. If so, stores the user's Mongo
   * document in the request object.
   *
   * Assumes that the URI includes req.params.userId
   */
  userIDExists: function(req, res, next) {
    User.findOne({ '_id': req.params.userId }, function(err, user) {
      if (err) {
        console.log(err);
        return next(err);
      }

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      } else {
        req.userDoc = user;
        next();
      }
    });
  }
}
