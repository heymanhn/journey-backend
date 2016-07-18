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

    entry1.save(function() {
      entry2.save(function() {
        done();
      });
    });
  });

  afterEach(function(done) {
    Entry.remove({}, done);
  });

  describe('#create entry:', function() {
    var entryParams;
    var validationChecker = function(done) {
      return function(err) {
        should.exist(err);
        err.name.should.equal('ValidationError');
        done();
      };
    };

    beforeEach(function() {
      entryParams = {
        creator: mongoose.Types.ObjectId('577371f00000000000000000'),
        type: 'text',
        contents: 'This is a test entry'
      };
    });

    it('creates a new Entry with the right fields', function(done) {
      var testEntry = new Entry(entryParams);
      testEntry.save(function(err, entry) {
        should.not.exist(err);
        (typeof entry).should.equal('object');
        entry.type.should.equal(testEntry.type);
        entry.contents.should.equal(testEntry.contents);
        entry.creator.should.equal(testEntry.creator);

        done();
      });
    });

    it('saves the location coordinates if provided', function(done) {
      entryParams.loc = {
        type: 'Point',
        coordinates: [-122.416534, 37.612311]
      };
      var testEntry = new Entry(entryParams);

      testEntry.save(function(err, entry) {
        should.not.exist(err);
        entry.loc.should.equal(testEntry.loc);
        done();
      });
    });

    context('#validation:', function() {
      it('fails if type is not provided', function(done) {
        delete entryParams.type;
        var testEntry = new Entry(entryParams);
        testEntry.validate(validationChecker(done));
      });

      it('fails if contents is not provided', function(done) {
        delete entryParams.contents;
        var testEntry = new Entry(entryParams);
        testEntry.validate(validationChecker(done));
      });

      it('fails if creator is not provided', function(done) {
        delete entryParams.creator;
        var testEntry = new Entry(entryParams);
        testEntry.validate(validationChecker(done));
      });

      it('fails if creator is provided as a number', function(done) {
        entryParams.creator = 5773710000000000000000;
        var testEntry = new Entry(entryParams);
        testEntry.validate(validationChecker(done));
      });

      it('fails if location coordinates have wrong format', function(done) {
        entryParams.loc = {
          type: 'Point',
          coordinates: ['lng', 'lat']
        };
        var testEntry = new Entry(entryParams);

        testEntry.validate(validationChecker(done));
      });
    });
  });

  describe('#get entries by userId:', function() {
    it('returns the right number of entries', function(done) {
      var userId = '577371f00000000000000000';

      Entry.find({ creator: userId }, function(err, entries) {
        should.not.exist(err);
        entries.length.should.equal(2);
        done();
      });
    });
  });
});
