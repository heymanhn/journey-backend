/*jslint node: true */
'use strict';

var bcrypt = require('bcrypt');
var mongoose = require('mongoose');
var utils = require('./userUtils');

var userSchema = new mongoose.Schema({
  signupDate: { type: Date, default: Date.now },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  username: { type: String, unique: true }
});

userSchema.pre('save', utils.checkUsernameExists);
userSchema.pre('save', utils.checkEmailExists);
userSchema.pre('save', utils.checkPasswordLength);
userSchema.pre('save', utils.hashPassword);

// Compares a plain-text password to the user's hashed password
userSchema.methods.checkPassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
