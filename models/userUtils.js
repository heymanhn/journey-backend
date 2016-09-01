/*jslint node: true */
'use strict';

var bcrypt = require('bcrypt');
const saltRounds = 8;

function fieldExistsCheck(field, value, next) {
  if (!this.isModified(field) || !this[field]) {
    return next();
  }

  var User = this.model('User');
  var opts = {};
  opts[field] = value;

  User
    .count(opts).exec()
    .then(function(count) {
      if (count === 0) {
        return next();
      } else {
        return Promise.reject(new Error(field + ' already exists'));
      }
    })
    .catch(next);
}

module.exports = {
  fieldExistsCheck: fieldExistsCheck,

  checkUsernameExists: function(next) {
    fieldExistsCheck.bind(this)('username', this.username, next);
  },

  checkEmailExists: function(next) {
    fieldExistsCheck.bind(this)('email', this.email, next);
  },

  checkEmailValid: function(next) {
    var emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;

    if (!this.email.match(emailRegex)) {
       return next(new Error('Invalid email address entered'));
    } else {
      next();
    }
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
