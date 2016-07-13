/*jslint node: true */
'use strict';

var bcrypt = require('bcrypt');
const saltRounds = 8;

function fieldExistsCheck(field, value, next) {
  if (!this.isModified(field)) {
    return next();
  }

  var User = this.model('User');
  var opts = {};
  opts[field] = value;

  User.count(opts, function(err, count) {
    if (err) {
      return next(err);
    }

    if (count === 0) {
      return next();
    } else {
      return next(new Error(field + ' already exists'));
    }
  });
}

module.exports = {
  fieldExistsCheck: fieldExistsCheck,

  checkUsernameExists: function(next) {
    fieldExistsCheck.bind(this)('username', this.username, next);
  },

  checkEmailExists: function(next) {
    fieldExistsCheck.bind(this)('email', this.email, next);
  },

  checkPasswordLength: function(next) {
    if (this.password.length < 6) {
      return next(new Error('Password needs to be at least 6 characters'));
    } else {
      next();
    }
  },

  hashPassword: function(next) {
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
