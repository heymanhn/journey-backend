/*jslint node: true, mocha: true */
'use strict';

var mongoose = require('mongoose');
var should = require('chai').should();

var Entry = require('../../models/entryModel');
var utils = require('./utils');

describe('Entry Model', function() {
  before(utils.connect);

  beforeEach(function(done) {
    var entry1 = new Entry({
      creator: mongoose.Types.ObjectId('577371f00000000000000000'),
      type: 'text',
      contents: 'Entry 1'
    });

    var entry2 = new Entry({
      creator: mongoose.Types.ObjectId('577371f00000000000000000'),
      type: 'text',
      contents: 'Entry 2'
    });

    entry1.save(function(err1, entry1) {
      entry2.save(function(err2, entry2) {
        done();
      });
    });
  });

  afterEach(function(done) {
    Entry.remove({}, done);
  });

  describe('#create entry:', function() {
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

    context('Validation:', function() {
      it('should fail if "type" is not provided', function(done) {
        var testEntry = new Entry({
          contents: 'This is a test entry',
          creator: mongoose.Types.ObjectId('577371f00000000000000000')
        });

        testEntry.validate(function(err) {
          should.exist(err);
          err.name.should.equal('ValidationError');
          done();
        });
      });

      it('should fail if "contents" is not provided', function(done) {
        var testEntry = new Entry({
          type: 'text',
          creator: mongoose.Types.ObjectId('577371f00000000000000000')
        });

        testEntry.validate(function(err) {
          should.exist(err);
          err.name.should.equal('ValidationError');
          done();
        });
      });

      it('should fail if "creator" is not provided', function(done) {
        var testEntry = new Entry({
          type: 'text',
          contents: 'This is a test entry'
        });

        testEntry.validate(function(err) {
          should.exist(err);
          err.name.should.equal('ValidationError');
          done();
        });
      });

      it('should fail if "creator" is provided as a number', function(done) {
        var testEntry = new Entry({
          creator: 5773710000000000000000,
          type: 'text',
          contents: 'This is a test entry'
        });

        testEntry.validate(function(err) {
          should.exist(err);
          err.name.should.equal('ValidationError');
          done();
        });
      });
    });
  });

  describe('#get entries by userId:', function() {
    it('should return 2 entries', function(done) {
      var userId = '577371f00000000000000000';

      Entry.find({ creator: userId }, function(err, entries) {
        should.not.exist(err);
        entries.length.should.equal(2);
        done();
      });
    });

    it('should return 0 results if no userId exists', function(done) {
      var userId = '577371f00000000000000001';

      Entry.find({ creator: userId }, function(err, entries) {
        should.not.exist(err);
        entries.length.should.equal(0);
        done();
      });
    });
  });
});
