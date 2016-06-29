var bcrypt = require('bcrypt');
var mongoose = require('mongoose');
const saltRounds = 10;

var userSchema = new mongoose.Schema({
  signupDate: { type: Date, default: Date.now },
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  name: { type: String }
});

userSchema.pre('save', function(next) {
  bcrypt.hash(this.password, saltRounds, function(err, hash) {
    if (err) {
      console.log(err);
      return next(err);
    }

    this.password = hash;
    next();
  }.bind(this));
});

userSchema.statics.checkPassword = function(password, hashedPassword, cb) {
  bcrypt.compare(password, hashedPassword, cb);
};

module.exports = mongoose.model('User', userSchema);
