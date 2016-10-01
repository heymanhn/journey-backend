'use strict';

const mongoose = require('mongoose');
const db = require('../../config/database');
require('mocha-mongoose')(db.test.url);

// Workaround to ensure that `mocha --watch` works on subsequent file saves
mongoose.models = {};
mongoose.modelSchemas = {};

module.exports = {
  connect(done) {
    if (mongoose.connection.db) {
      return done();
    }

    mongoose.connect(db.test.url, done);
  }
};
