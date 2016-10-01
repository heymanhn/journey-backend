'use strict';

const bcrypt = require('bcrypt');
const saltRounds = 8;

function fieldExistsCheck(field, value, next) {
  if (!this.isModified(field) || !value) {
    return next();
  }

  let User = this.model('User');
  User
    .count({ [field]: value })
    .exec()
    .then(function(count) {
      if (count === 0) {
        return next();
      } else {
        return Promise.reject(new Error(`${field} already exists`));
      }
    })
    .catch(next);
}

module.exports = {
  fieldExistsCheck,

  checkUsernameExists(next) {
    fieldExistsCheck.bind(this)('username', this.username, next);
  },

  checkEmailExists(next) {
    fieldExistsCheck.bind(this)('email', this.email, next);
  },

  checkEmailValid(next) {
    const emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;

    if (!this.email.match(emailRegex)) {
       return next(new Error('Invalid email address entered'));
    } else {
      next();
    }
  },

  checkPasswordLength(next) {
    if (this.password.length < 6) {
      return next(new Error('Password needs to be at least 6 characters'));
    } else {
      next();
    }
  },

  hashPassword(next) {
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
