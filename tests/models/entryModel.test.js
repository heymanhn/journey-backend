'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const mongoose = require('mongoose');
const should = chai.should(); // jshint ignore:line

const Entry = require('../../models/entryModel');
const testUtils = require('./utils');
const utils = require('../../models/entryUtils');

mongoose.Promise = Promise;
chai.use(chaiAsPromised);

describe('Entry Model', () => {
  before(testUtils.connect);

  beforeEach((done) => {
    const entry1 = new Entry({
      creator: mongoose.Types.ObjectId('577371f00000000000000000'),
      type: 'text',
      message: 'Entry 1'
    });

    const entry2 = new Entry({
      creator: mongoose.Types.ObjectId('577371f00000000000000000'),
      type: 'text',
      message: 'Entry 2'
    });

    const entry3 = new Entry({
      creator: mongoose.Types.ObjectId('577371f00000000000000000'),
      type: 'text',
      message: 'Entry 3'
    });

    const saveOps = [entry1.save(), entry2.save(), entry3.save()];
    Promise
      .all(saveOps)
      .then(() => { done(); });
  });

  afterEach((done) => {
    Entry.remove({}, done);
  });

  describe('#create entry:', () => {
    let entryParams;

    beforeEach(() => {
      entryParams = {
        creator: mongoose.Types.ObjectId('577371f00000000000000000'),
        type: 'text',
        message: 'This is a test entry'
      };
    });

    it('creates a new Entry with the right fields', (done) => {
      const testEntry = new Entry(entryParams);
      testEntry.save(function(err, entry) {
        should.not.exist(err);
        (typeof entry).should.equal('object');
        entry.type.should.equal(testEntry.type);
        entry.message.should.equal(testEntry.message);
        entry.creator.should.equal(testEntry.creator);

        done();
      });
    });

    it('saves the location coordinates if provided', (done) => {
      entryParams.loc = {
        type: 'Point',
        coordinates: [-122.416534, 37.612311]
      };
      const testEntry = new Entry(entryParams);

      testEntry.save((err, entry) => {
        should.not.exist(err);
        entry.loc.should.equal(testEntry.loc);
        done();
      });
    });

    it('saves the contents for a video entry', (done) => {
      entryParams.type = 'video';
      entryParams.contents = 'http://stubvideolink.com';

      const testEntry = new Entry(entryParams);
      testEntry.save((err, entry) => {
        should.not.exist(err);
        entry.type.should.equal(testEntry.type);
        entry.contents.should.equal(testEntry.contents);
        done();
      });
    });

    it('saves the contents for a photo entry', (done) => {
      entryParams.type = 'photo';
      entryParams.contents = 'http://stubvideolink.com';

      const testEntry = new Entry(entryParams);
      testEntry.save((err, entry) => {
        should.not.exist(err);
        entry.type.should.equal(testEntry.type);
        entry.contents.should.equal(testEntry.contents);
        done();
      });
    });

    it('saves the contents for a photo entry with multiple photos', (done) => {
      entryParams.type = 'photo';
      entryParams.contents = [
        'http://stubvideolink1.com',
        'http://stubvideolink2.com',
        'http://stubvideolink3.com'
      ];

      const testEntry = new Entry(entryParams);
      testEntry.save((err, entry) => {
        should.not.exist(err);
        entry.type.should.equal(entryParams.type);
        entry.contents.should.eql(entryParams.contents);
        done();
      });
    });

    it('saves the contents for an audio entry', (done) => {
      entryParams.type = 'video';
      entryParams.contents = 'http://stubvideolink.com';

      const testEntry = new Entry(entryParams);
      testEntry.save((err, entry) => {
        should.not.exist(err);
        entry.type.should.equal(testEntry.type);
        entry.contents.should.equal(testEntry.contents);
        done();
      });
    });

    context('#validation:', () => {
      it('fails if type is not provided', () => {
        delete entryParams.type;
        const testEntry = new Entry(entryParams);
        testEntry.validate().should.eventually.be.rejected;
      });

      it('fails if creator is not provided', () => {
        delete entryParams.creator;
        const testEntry = new Entry(entryParams);
        testEntry.validate().should.eventually.be.rejected;
      });

      it('fails if creator is provided as a number', () => {
        entryParams.creator = 5773710000000000000000;
        const testEntry = new Entry(entryParams);
        testEntry.validate().should.eventually.be.rejected;
      });

      it('fails if location coordinates have wrong format', () => {
        entryParams.loc = {
          type: 'Point',
          coordinates: ['lng', 'lat']
        };
        const testEntry = new Entry(entryParams);
        testEntry.validate().should.eventually.be.rejected;
      });
    });
  });

  describe('#pre-save checks:', () => {
    let stubModel;
    const stubNext = (expectedError, done) => {
      return (err) => {
        err.should.eql(expectedError);
        done();
      };
    };

    beforeEach(() => {
      stubModel = {
        creator: 'a1b2c3d4',
        type: 'text',
        message: 'This is a message'
      };
    });

    it('fails if a text entry does not have a message', (done) => {
      delete stubModel.message;

      const stubError = new Error('Text entry is missing a message');
      const next = stubNext(stubError, done);

      utils.validateFields.bind(stubModel)(next);
    });

    it('fails if a text entry contains contents', (done) => {
      stubModel.contents = 'http://www.fakecontents.com';

      const stubError = new Error('Text entry has invalid contents');
      const next = stubNext(stubError, done);

      utils.validateFields.bind(stubModel)(next);
    });

    it('fails if a photo entry does not have contents', (done) => {
      stubModel.type = 'photo';

      const stubError = new Error('Entry is missing contents');
      const next = stubNext(stubError, done);

      utils.validateFields.bind(stubModel)(next);
    });

    it('fails if a video entry does not have contents', (done) => {
      stubModel.type = 'video';

      const stubError = new Error('Entry is missing contents');
      const next = stubNext(stubError, done);

      utils.validateFields.bind(stubModel)(next);
    });

    it('fails if an audio entry does not have contents', (done) => {
      stubModel.type = 'audio';

      const stubError = new Error('Entry is missing contents');
      const next = stubNext(stubError, done);

      utils.validateFields.bind(stubModel)(next);
    });

    it('fails if the type provided is not supported', (done) => {
      stubModel.type = 'foo';

      const stubError = new Error('Invalid entry type');
      const next = stubNext(stubError, done);

      utils.validateFields.bind(stubModel)(next);
    });
  });

  describe('#findEntries:', () => {
    it('returns the right number of entries', (done) => {
      const page = 1;
      const count = 2;
      const params = {
        creator: '577371f00000000000000000'
      };

      Entry.findEntries(params, count, page).then((entries) => {
        entries.length.should.equal(count);
        entries[0].creator.toString().should.equal(params.creator);
        done();
      });
    });

    it('returns an error if any of the arguments are missing', () => {
      const page = 1;
      const count = 2;
      const stubError = new Error('Invalid arguments');

      Entry.findEntries(null, count, page).should.be.rejected
        .and.eventually.eql(stubError);
    });
  });
});
