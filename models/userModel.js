var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  signupDate: { type: Date, default: Date.now },
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  name: { type: String }
});

module.exports = mongoose.model('User', userSchema);
