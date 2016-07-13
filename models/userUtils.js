/*jslint node: true */
'use strict';

var bcrypt = require('bcrypt');
const saltRounds = 8;

module.exports = {
  preSaveHook: function(next) {
    if (!this.isModified('password')) {
      return next();
    }

    bcrypt.hash(this.password, saltRounds, function(err, hash) {
      if (err) {
        return next(err);
      }

      this.password = hash;
      next();
    }.bind(this));
  }
};
