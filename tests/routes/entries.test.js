'use strict';

const AWS = require('aws-sdk'); // jshint ignore:line
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const express = require('express');
const rewire = require('rewire');
const should = chai.should(); // jshint ignore:line
const sinon = require('sinon');

require('sinon-as-promised');
require('mongoose').Promise = Promise;
chai.use(chaiAsPromised);

const Entry = require('app/models/entryModel');

describe('Entry Routes', () => {
  let sandbox, router, findEntry, deleteS3Contents, removeEntry, s3;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    sandbox.stub(express, 'Router').returns({
      get: sandbox.spy(),
      post: sandbox.spy(),
      delete: sandbox.spy()
    });

    router = rewire('app/routes/v1/entries');
    findEntry = router.__get__('findEntry');
    deleteS3Contents = router.__get__('deleteS3Contents');
    removeEntry = router.__get__('removeEntry');
    s3 = router.__get__('s3');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#post /', () => {
    let req;
    function stubRedirect(expectedResponse, done) {
      return {
        redirect(data) {
          data.should.equal(expectedResponse);
          done();
        }
      };
    }

    beforeEach(() => {
      req = {
        user: {
          _id: '577371f00000000000000000'
        },
        body: {
          type: 'text',
          message: 'Test entry 1'
        }
      };
    });

    function callPost(res, next) {
      router.post.firstCall.args[2](req, res, next);
    }

    it('registers a URI for POST: /', () => {
      router.post.calledWith('/', sandbox.match.any).should.equal(true);
    });

    it('creates the entry successfully if fields are valid', (done) => {
      sandbox.stub(Entry.prototype, 'save').yields();

      const res = stubRedirect('/v1/users/' + req.user._id + '/entries', done);
      callPost(res);
    });

    it('saves the contents if provided', (done) => {
      req.body.contents = 'http://www.fakecontent.com';
      req.body.type = 'video';

      sandbox.stub(Entry.prototype, 'save', function() {
        this._doc.contents.should.equal(req.body.contents);
        done();
      });

      callPost();
    });

    it('saves the location data if provided', (done) => {
      req.body.loc = {
        type: 'Point',
        coordinates: [-122.416534, 37.612311]
      };

      sandbox.stub(Entry.prototype, 'save', function() {
        const loc = this._doc.loc;
        (typeof loc).should.equal('object');
        loc.type.should.eql(req.body.loc.type);
        loc.coordinates[0].should.equal(req.body.loc.coordinates[0]);
        loc.coordinates[1].should.equal(req.body.loc.coordinates[1]);

        done();
      });

      callPost();
    });

    it('fails if Entry.save() returns an error', (done) => {
      const stubError = new Error('Error saving entry');
      sandbox.stub(Entry.prototype, 'save').yields(stubError);

      function next(err) {
        err.should.eql(stubError);
        done();
      }

      callPost(null, next);
    });
  });

  describe('#get /:entryId', () => {
    function stubRes(expectedResponse, done) {
      return {
        json(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };
    }

    const req = {
      user: {
        _id: '577371f00000000000000000'
      },
      params: {
        entryId: '577371f00000000000000000'
      }
    };

    function callGet(res, next) {
      router.get.firstCall.args[2](req, res, next);
    }

    it('registers a URI for GET: /:entryId', () => {
      router.get.calledWith('/:entryId', sandbox.match.any).should.equal(true);
    });

    it('returns an entry, if found, in the response', (done) => {
      const stubEntry = {
        _id: req.params.entryId,
        creator: req.user._id
      };
      const stubResponseJSON = {
        entry: stubEntry
      };

      router.__set__('findEntry', () => {
        return Promise.resolve(stubEntry);
      });

      callGet(stubRes(stubResponseJSON, done));
    });

    it('returns an error if something in the chain fails', (done) => {
      const stubError = '/GET error';
      function next(err) {
        err.should.eql(stubError);
        done();
      }

      router.__set__('findEntry', () => {
        return Promise.reject(stubError);
      });

      callGet(null, next);
    });
  });

  describe('#delete /:entryId', () => {
    let req;

    function callDelete(res, next) {
      router.delete.firstCall.args[2](req, res, next);
    }

    beforeEach(() => {
      req = {
        user: {
          _id: '577371f00000000000000000'
        },
        params: {
          entryId: '577371f00000000000000000'
        }
      };

    });

    it('registers a URI for DELETE: /:entryId', () => {
      router
        .delete
        .calledWith('/:entryId', sandbox.match.any).should.equal(true);
    });

    it('sends a JSON response if entry is removed', (done) => {
      const stubResponseJSON = {
        message: 'Entry deleted.'
      };

      const res = {
        json(data) {
          data.should.eql(stubResponseJSON);
          done();
        }
      };

      const stubEntry = {
        type: 'Stub Entry'
      };

      router.__set__('findEntry', () => Promise.resolve(stubEntry));
      router.__set__('deleteS3Contents', (entry) => entry);
      router.__set__('removeEntry', (entry) => entry);

      callDelete(res);
    });

    it('returns an error if something along the chain fails', (done) => {
      const stubError = '/DELETE error';
      function next(err) {
        err.should.eql(stubError);
        done();
      }

      router.__set__('findEntry', () => Promise.reject(stubError));
      callDelete(null, next);
    });
  });

  context('#findEntry:', () => {
    it('looks for an entry with the right params', () => {
      const stubEntry = {
        _id: '577371f00000000000000000',
        creator: '577371f00000000000000001'
      };

      sandbox.stub(Entry, 'findOne', (params) => {
        params._id.should.equal(stubEntry._id);
        params.creator.should.equal(stubEntry.creator);
        return { exec: () => Promise.resolve(stubEntry) };
      });

      return findEntry(stubEntry._id, stubEntry.creator)
        .should.eventually.eql(stubEntry);
    });

    it('returns an error if Entry.findOne() fails', () => {
      const stubError = 'Error finding entry';

      sandbox.stub(Entry, 'findOne').returns({
        exec: () => { return Promise.reject(stubError); }
      });

      return findEntry().should.be.rejected
        .and.eventually.eql(stubError);
    });

    it('returns an error if no entry is found', () => {
      const stubError = new Error('Entry not found');
      stubError.status = 404;

      sandbox.stub(Entry, 'findOne').returns({
        exec: () => { return Promise.resolve(); }
      });

      return findEntry().should.be.rejected
        .and.eventually.eql(stubError);
    });
  });

  context('#deleteS3Contents:', () => {
    it('deletes the entry\'s S3 contents if it exists', () => {
      const stubKey = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
      const stubEntry = {
        contents: 'http://www.fakecontent.com/' + stubKey
      };

      sandbox.stub(s3, 'deleteObject', (params) => {
        params.Key.should.equal(stubKey);
        return { promise: () => Promise.resolve() };
      });

      return deleteS3Contents(stubEntry).should.eventually.equal(stubEntry);
    });

    it('deletes multiple entries if an array is provided', (done) => {
      const stubEntry = {
        contents: [
          'http://www.foo.com/a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
          'http://www.foo.com/a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a2',
          'http://www.foo.com/a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a3'
        ]
      };
      const deleteSpy = sandbox.stub(s3, 'deleteObject').returns({
        promise: () => { return Promise.resolve(); }
      });

      deleteS3Contents(stubEntry).then(() => {
        deleteSpy.callCount.should.equal(stubEntry.contents.length);
        done();
      });
    });

    it('continues if the entry has no contents to delete', () => {
      const stubEntry = { type: 'text' };

      return deleteS3Contents(Promise.resolve(stubEntry))
        .should.eventually.equal(stubEntry);
    });

    it('returns an error if S3 deletion returns an error', () => {
      const stubError = 'S3 deletion error';
      const stubKey = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
      const stubEntry = { contents: 'http://www.fakecontent.com/' + stubKey };

      sandbox.stub(s3, 'deleteObject').returns({
        promise: () => { return Promise.reject(stubError); }
      });

      return deleteS3Contents(stubEntry).should.be.rejected
        .and.eventually.eql(stubError);
    });

    it('returns an error if the contents have invalid type', () => {
      const stubEntry = {
        contents: 123
      };
      const stubError = new Error('Entry has invalid contents');

      return deleteS3Contents(stubEntry).should.be.rejected
        .and.eventually.eql(stubError);
    });
  });

  context('#removeEntry:', () => {
    it('calls entry.remove() if the entry exists', () => {
      const stubEntry = {
        remove: () => {
          return Promise.resolve();
        }
      };

      return removeEntry(stubEntry).should.eventually.be.fulfilled;
    });
  });
});
