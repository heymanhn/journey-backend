var mongoose = require('mongoose');
var db = 'mongodb://localhost:27017/journey-test';
var clearDB = require('mocha-mongoose')(db);
var should = require('chai').should();
var Entry = require('../models/entryModel');

// Workaround to ensure that `mocha --watch` works on subsequent file saves
mongoose.models = {};
mongoose.modelSchemas = {};

describe('Entry Model', function() {
  before(function(done) {
    if (mongoose.connection.db) {
      return done();
    }

    mongoose.connect(db, done);
  });

  describe('#create:', function() {
    it('should create a new Entry with the right fields', function(done) {
      var testEntry = new Entry({
        type: 'text',
        contents: 'This is a test entry'
      });

      testEntry.save(function(err, entry) {
        should.not.exist(err);
        (typeof entry).should.equal('object');
        entry.type.should.equal(testEntry.type);
        entry.contents.should.equal(testEntry.contents);

        done();
      });
    });

    context('If missing required fields:', function() {
      it('should fail if "type" is not provided', function(done) {
        var testEntry = new Entry({
          contents: 'This is a test entry'
        });

        testEntry.save(function(err) {
          should.exist(err);
          done();
        });
      });

      it('should fail if "contents" is not provided', function(done) {
        var testEntry = new Entry({
          type: 'text'
        });

        testEntry.save(function(err) {
          should.exist(err);
          done();
        });
      });
    });
  });
});
