/*jslint node: true */
'use strict';

var bcrypt = require('bcrypt');
var mongoose = require('mongoose');
var preSaveHook = require('./userUtils').preSaveHook;
const saltRounds = 8;

var userSchema = new mongoose.Schema({
  signupDate: { type: Date, default: Date.now },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String }
});

userSchema.pre('save', preSaveHook);
userSchema.methods.checkPassword = function(password, cb) {
  bcrypt.compare(password, this.password, cb);
};

module.exports = mongoose.model('User', userSchema);
