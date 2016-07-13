/*jslint node: true */
'use strict';

var bcrypt = require('bcrypt');
var mongoose = require('mongoose');
var utils = require('./userUtils');

var userSchema = new mongoose.Schema({
  signupDate: { type: Date, default: Date.now },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String }
});

userSchema.pre('save', utils.checkUsernameExists);
userSchema.pre('save', utils.checkEmailExists);
userSchema.pre('save', utils.checkPasswordLength);
userSchema.pre('save', utils.hashPassword);

userSchema.methods.checkPassword = function(password, cb) {
  bcrypt.compare(password, this.password, cb);
};

module.exports = mongoose.model('User', userSchema);
