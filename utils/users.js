/*jslint node: true */
'use strict';

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
      var err = new Error('Cannot perform this action on another user');
      err.status = 403;
      return next(err);
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
        err = new Error('User not found');
        err.status = 404;
        return next(err);
      } else {
        req.userDoc = user;
        next();
      }
    });
  }
};
