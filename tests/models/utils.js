var mongoose = require('mongoose');
var db = require('../../config/database');
var clearDB = require('mocha-mongoose')(db.test.url);

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
