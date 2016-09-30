/*jslint node: true */
'use strict';

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const utils = require('./userUtils');

const userSchema = new mongoose.Schema({
  signupDate: { type: Date, default: Date.now },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  username: { type: String }
});

userSchema.pre('save', utils.checkUsernameExists);
userSchema.pre('save', utils.checkEmailExists);
userSchema.pre('save', utils.checkEmailValid);
userSchema.pre('save', utils.checkPasswordLength);
userSchema.pre('save', utils.hashPassword);

// Compares a plain-text password to the user's hashed password
userSchema.methods.checkPassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
