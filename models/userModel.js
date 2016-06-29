var bcrypt = require('bcrypt');
var mongoose = require('mongoose');
const saltRounds = 10;

var userSchema = new mongoose.Schema({
  signupDate: { type: Date, default: Date.now },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String }
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  bcrypt.hash(this.password, saltRounds, function(err, hash) {
    if (err) {
      console.log(err);
      return next(err);
    }

    this.password = hash;
    next();
  }.bind(this));
});

userSchema.methods.checkPassword = function(password, cb) {
  bcrypt.compare(password, this.password, function(err, result) {
    if (err) {
      console.log(err);
      return next(err);
    }

    cb(result);
  });
};

module.exports = mongoose.model('User', userSchema);
