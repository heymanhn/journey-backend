/*jslint node: true, mocha: true */
'use strict';

var mongoose = require('mongoose');
var should = require('chai').should();

var Entry = require('../../models/entryModel');
var testUtils = require('./utils');
var utils = require('../../models/entryUtils');

describe('Entry Model', function() {
  before(testUtils.connect);

  beforeEach(function(done) {
    var entry1 = new Entry({
      creator: mongoose.Types.ObjectId('577371f00000000000000000'),
      type: 'text',
      message: 'Entry 1'
    });

    var entry2 = new Entry({
      creator: mongoose.Types.ObjectId('577371f00000000000000000'),
      type: 'text',
      message: 'Entry 2'
    });

    var entry3 = new Entry({
      creator: mongoose.Types.ObjectId('577371f00000000000000000'),
      type: 'text',
      message: 'Entry 3'
    });

    var saveOps = [entry1.save(), entry2.save(), entry3.save()];
    Promise
      .all(saveOps)
      .then(function() { done(); });
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
        message: 'This is a test entry'
      };
    });

    it('creates a new Entry with the right fields', function(done) {
      var testEntry = new Entry(entryParams);
      testEntry.save(function(err, entry) {
        should.not.exist(err);
        (typeof entry).should.equal('object');
        entry.type.should.equal(testEntry.type);
        entry.message.should.equal(testEntry.message);
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

    it('saves the contents for a video entry', function(done) {
      entryParams.type = 'video';
      entryParams.contents = 'http://stubvideolink.com';

      var testEntry = new Entry(entryParams);
      testEntry.save(function(err, entry) {
        should.not.exist(err);
        entry.type.should.equal(testEntry.type);
        entry.contents.should.equal(testEntry.contents);
        done();
      });
    });

    it('saves the contents for a photo entry', function(done) {
      entryParams.type = 'photo';
      entryParams.contents = 'http://stubvideolink.com';

      var testEntry = new Entry(entryParams);
      testEntry.save(function(err, entry) {
        should.not.exist(err);
        entry.type.should.equal(testEntry.type);
        entry.contents.should.equal(testEntry.contents);
        done();
      });
    });

    it('saves the contents for a photo entry with multiple photos',
      function(done) {
      entryParams.type = 'photo';
      entryParams.contents = [
        'http://stubvideolink1.com',
        'http://stubvideolink2.com',
        'http://stubvideolink3.com'
      ];

      var testEntry = new Entry(entryParams);
      testEntry.save(function(err, entry) {
        should.not.exist(err);
        entry.type.should.equal(entryParams.type);
        entry.contents.should.eql(entryParams.contents);
        done();
      });
    });

    it('saves the contents for an audio entry', function(done) {
      entryParams.type = 'video';
      entryParams.contents = 'http://stubvideolink.com';

      var testEntry = new Entry(entryParams);
      testEntry.save(function(err, entry) {
        should.not.exist(err);
        entry.type.should.equal(testEntry.type);
        entry.contents.should.equal(testEntry.contents);
        done();
      });
    });

    context('#validation:', function() {
      it('fails if type is not provided', function(done) {
        delete entryParams.type;
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

  describe('#pre-save checks:', function() {
    var stubModel;
    var stubNext = function(expectedError, done) {
      return function(err) {
        err.should.eql(expectedError);
        done();
      };
    };

    beforeEach(function() {
      stubModel = {
        creator: 'a1b2c3d4',
        type: 'text',
        message: 'This is a message'
      };
    });

    it('fails if a text entry does not have a message', function(done) {
      delete stubModel.message;

      var stubError = new Error('Text entry is missing a message');
      var next = stubNext(stubError, done);

      utils.validateFields.bind(stubModel)(next);
    });

    it('fails if a text entry contains contents', function(done) {
      stubModel.contents = 'http://www.fakecontents.com';

      var stubError = new Error('Text entry has invalid contents');
      var next = stubNext(stubError, done);

      utils.validateFields.bind(stubModel)(next);
    });

    it('fails if a photo entry does not have contents', function(done) {
      stubModel.type = 'photo';

      var stubError = new Error('Entry is missing contents');
      var next = stubNext(stubError, done);

      utils.validateFields.bind(stubModel)(next);
    });

    it('fails if a video entry does not have contents', function(done) {
      stubModel.type = 'video';

      var stubError = new Error('Entry is missing contents');
      var next = stubNext(stubError, done);

      utils.validateFields.bind(stubModel)(next);
    });

    it('fails if an audio entry does not have contents', function(done) {
      stubModel.type = 'audio';

      var stubError = new Error('Entry is missing contents');
      var next = stubNext(stubError, done);

      utils.validateFields.bind(stubModel)(next);
    });

    it('fails if the type provided is not supported', function(done) {
      stubModel.type = 'foo';

      var stubError = new Error('Invalid entry type');
      var next = stubNext(stubError, done);

      utils.validateFields.bind(stubModel)(next);
    });
  });

  describe('#findEntries:', function() {
    it('returns the right number of entries', function(done) {
      var page = 1;
      var count = 2;
      var params = {
        creator: '577371f00000000000000000'
      };

      Entry.findEntries(params, count, page).then(function(entries) {
        entries.length.should.equal(count);
        entries[0].creator.toString().should.equal(params.creator);
        done();
      });
    });

    it('returns an error if any of the arguments are missing', function() {
      var page = 1;
      var count = 2;
      var stubError = new Error('Invalid arguments');

      Entry.findEntries(null, count, page).should.be.rejectedWith(stubError);
    });

    it('returns an error if something in the chain fails', function() {
      var params = '577371f00000000000000000';

      Entry.findEntries(params, 1, 2).should.be.rejected; // jshint ignore:line
    });
  });
});
