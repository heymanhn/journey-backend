/*jslint node: true */
'use strict';

const User = require('../models/userModel');

module.exports = {
  /*
   * Only allows requests where the user in the JSON Web Token matches the user
   * that the operation is intended for.
   *
   * Assumes that the URI includes req.params.userId
   */
  isCurrentUser(req, res, next) {
    if (!req.params.userId) {
      let err = new Error('No user ID provided');
      err.status = 400;
      return next(err);
    }

    if (req.params.userId !== req.user.id) {
      let err = new Error('Cannot perform this action on another user');
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
  userIDExists(req, res, next) {
    if (!req.params.userId) {
      let err = new Error('No user ID provided');
      err.status = 400;
      return next(err);
    }

    User.findOne({ '_id': req.params.userId }, (err, user) => {
      if (err) {
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
