var mongoose = require('mongoose');
var db = 'mongodb://localhost:27017/journey-test';
var clearDB = require('mocha-mongoose')(db);

// Workaround to ensure that `mocha --watch` works on subsequent file saves
mongoose.models = {};
mongoose.modelSchemas = {};

module.exports = {
  connect: function(done) {
    if (mongoose.connection.db) {
      return done();
    }

    mongoose.connect(db, done);
  }
};
