/*jslint node: true, mocha: true */
'use strict';

var mongoose = require('mongoose');
var should = require('chai').should();

var Entry = require('../../models/entryModel');
var utils = require('./utils');

describe('Entry Model', function() {
  before(utils.connect);

  describe('#create:', function() {
    it('should create a new Entry with the right fields', function(done) {
      var testEntry = new Entry({
        creator: mongoose.Types.ObjectId('577371f00000000000000000'),
        type: 'text',
        contents: 'This is a test entry'
      });

      testEntry.save(function(err, entry) {
        should.not.exist(err);
        (typeof entry).should.equal('object');
        entry.type.should.equal(testEntry.type);
        entry.contents.should.equal(testEntry.contents);
        entry.creator.should.equal(testEntry.creator);

        done();
      });
    });

    context('If missing required fields:', function() {
      it('should fail if "type" is not provided', function(done) {
        var testEntry = new Entry({
          contents: 'This is a test entry'
        });

        testEntry.validate(function(err) {
          should.exist(err);
          err.name.should.equal('ValidationError');
          done();
        });
      });

      it('should fail if "contents" is not provided', function(done) {
        var testEntry = new Entry({
          type: 'text'
        });

        testEntry.validate(function(err) {
          should.exist(err);
          err.name.should.equal('ValidationError');
          done();
        });
      });
    });
  });
});
