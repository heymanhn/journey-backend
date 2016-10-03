'use strict';

const _ = require('underscore');
const User = require('app/models/userModel');

module.exports = {
  // Borrowed from Stack Overflow - GUID generator
  guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      let r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  },

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

  validateSignupFields(req, res, next) {
    const { email, password } = req.body;
    const params = { email, password };

    // Input checking
    let missingKeys = [];
    _.each(params, (value, key) => {
      if (!value) {
        missingKeys.push(key);
      }
    });

    if (missingKeys.length > 0) {
      return next(new Error('Params missing: ' + missingKeys));
    }

    next();
  }
};
