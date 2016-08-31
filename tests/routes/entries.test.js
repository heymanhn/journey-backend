/*jslint node: true, mocha: true */
'use strict';

var AWS = require('aws-sdk'); // jshint ignore:line
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var express = require('express');
var rewire = require('rewire');
var should = chai.should(); // jshint ignore:line
var sinon = require('sinon');

require('sinon-as-promised');
require('mongoose').Promise = Promise;
chai.use(chaiAsPromised);

var Entry = require('../../models/entryModel');

describe('Entry Routes', function() {
  var sandbox, router, findEntry, deleteS3Contents, removeEntry, s3;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    sandbox.stub(express, 'Router').returns({
      get: sandbox.spy(),
      post: sandbox.spy(),
      delete: sandbox.spy()
    });

    router = rewire('../../routes/v1/entries');
    findEntry = router.__get__('findEntry');
    deleteS3Contents = router.__get__('deleteS3Contents');
    removeEntry = router.__get__('removeEntry');
    s3 = router.__get__('s3');
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#post /', function() {
    var req;
    var stubRedirect = function(expectedResponse, done) {
      return {
        redirect: function(data) {
          console.log("res stub hit");
          debugger;
          data.should.equal(expectedResponse);
          done();
        }
      };
    };

    beforeEach(function() {
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

    var callPost = function(res, next) {
      router.post.firstCall.args[2](req, res, next);
    };

    it('registers a URI for POST: /', function() {
      router.post.calledWith('/', sandbox.match.any).should.equal(true);
    });

    it('creates the entry successfully if fields are valid', function(done) {
      sandbox.stub(Entry.prototype, 'save').yields();

      var res = stubRedirect('/v1/users/' + req.user._id + '/entries', done);
      callPost(res);
    });

    it('saves the contents if provided', function(done) {
      req.body.contents = 'http://www.fakecontent.com';
      req.body.type = 'video';

      sandbox.stub(Entry.prototype, 'save', function() {
        this._doc.contents.should.equal(req.body.contents);
        done();
      });

      callPost();
    });

    it('saves the location data if provided', function(done) {
      req.body.loc = {
        type: 'Point',
        coordinates: [-122.416534, 37.612311]
      };

      sandbox.stub(Entry.prototype, 'save', function() {
        var loc = this._doc.loc;
        (typeof loc).should.equal('object');
        loc.type.should.eql(req.body.loc.type);
        loc.coordinates[0].should.equal(req.body.loc.coordinates[0]);
        loc.coordinates[1].should.equal(req.body.loc.coordinates[1]);

        done();
      });

      callPost();
    });

    it('fails if Entry.save() returns an error', function(done) {
      var stubError = new Error('Error saving entry');
      sandbox.stub(Entry.prototype, 'save').yields(stubError);

      var next = function(err) {
        err.should.eql(stubError);
        done();
      };

      callPost(null, next);
    });
  });

  describe('#get /:entryId', function() {
    var stubRes = function(expectedResponse, done) {
      return {
        json: function(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };
    };

    var req = {
      user: {
        _id: '577371f00000000000000000'
      },
      params: {
        entryId: '577371f00000000000000000'
      }
    };

    var callGet = function(res, next) {
      router.get.firstCall.args[2](req, res, next);
    };

    it('registers a URI for GET: /:entryId', function() {
      router.get.calledWith('/:entryId', sandbox.match.any).should.equal(true);
    });

    it('returns an entry, if found, in the response', function(done) {
      var stubEntry = {
        _id: req.params.entryId,
        creator: req.user._id
      };
      var stubResponseJSON = {
        entry: stubEntry
      };

      router.__set__('findEntry', function() {
        return Promise.resolve(stubEntry);
      });

      callGet(stubRes(stubResponseJSON, done));
    });

    it('returns an error if something in the chain fails', function(done) {
      var stubError = '/GET error';
      var next = function(err) {
        err.should.eql(stubError);
        done();
      };

      router.__set__('findEntry', function() {
        return Promise.reject(stubError);
      });

      callGet(null, next);
    });
  });

  describe('#delete /:entryId', function() {
    var req;

    var callDelete = function(res, next) {
      router.delete.firstCall.args[2](req, res, next);
    };

    beforeEach(function() {
      req = {
        user: {
          _id: '577371f00000000000000000'
        },
        params: {
          entryId: '577371f00000000000000000'
        }
      };

    });

    it('registers a URI for DELETE: /:entryId', function() {
      router
        .delete
        .calledWith('/:entryId', sandbox.match.any).should.equal(true);
    });

    it('sends a JSON response if entry is removed', function(done) {
      var stubResponseJSON = {
        message: 'Entry deleted.'
      };

      var res = {
        json: function(data) {
          data.should.eql(stubResponseJSON);
          done();
        }
      };

      var stubEntry = {
        type: 'Stub Entry'
      };

      router.__set__('findEntry', function() {
        return Promise.resolve(stubEntry);
      });
      router.__set__('deleteS3Contents', function(entry) {
        return entry;
      });
      router.__set__('removeEntry', function(entry) {
        return entry;
      });

      callDelete(res);
    });

    it('returns an error if something along the chain fails', function(done) {
      var stubError = '/DELETE error';
      var next = function(err) {
        err.should.eql(stubError);
        done();
      };

      router.__set__('findEntry', function() {
        return Promise.reject(stubError);
      });

      callDelete(null, next);
    });
  });

  context('#findEntry:', function() {
    it('looks for an entry with the right params', function() {
      var stubEntry = {
        _id: '577371f00000000000000000',
        creator: '577371f00000000000000001'
      };

      sandbox.stub(Entry, 'findOne', function(params) {
        params._id.should.equal(stubEntry._id);
        params.creator.should.equal(stubEntry.creator);
        return {
          exec: function() {
            return Promise.resolve(stubEntry);
          }
        };
      });

      return findEntry(stubEntry._id, stubEntry.creator)
        .should.eventually.eql(stubEntry);
    });

    it('returns an error if Entry.findOne() fails', function() {
      var stubError = 'Error finding entry';

      sandbox.stub(Entry, 'findOne').returns({
        exec: function() { return Promise.reject(stubError); }
      });

      return findEntry().should.be.rejected
        .and.eventually.eql(stubError);
    });

    it('returns an error if no entry is found', function() {
      var stubError = new Error('Entry not found');
      stubError.status = 404;

      sandbox.stub(Entry, 'findOne').returns({
        exec: function() { return Promise.resolve(); }
      });

      return findEntry().should.be.rejected
        .and.eventually.eql(stubError);
    });
  });

  context('#deleteS3Contents:', function() {
    it('deletes the entry\'s S3 contents if it exists', function() {
      var stubKey = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
      var stubEntry = {
        contents: 'http://www.fakecontent.com/' + stubKey
      };

      sandbox.stub(s3, 'deleteObject', function(params) {
        params.Key.should.equal(stubKey);

        return {
          promise: function() { return Promise.resolve(); }
        };
      });

      return deleteS3Contents(stubEntry).should.eventually.equal(stubEntry);
    });

    it('deletes multiple entries if an array is provided', function(done) {
      var stubEntry = {
        contents: [
          'http://www.foo.com/a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
          'http://www.foo.com/a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a2',
          'http://www.foo.com/a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a3'
        ]
      };
      var deleteSpy = sandbox.stub(s3, 'deleteObject').returns({
        promise: function() { return Promise.resolve(); }
      });

      deleteS3Contents(stubEntry).then(function() {
        deleteSpy.callCount.should.equal(stubEntry.contents.length);
        done();
      });
    });

    it('continues if the entry has no contents to delete', function() {
      var stubEntry = { type: 'text' };

      return deleteS3Contents(Promise.resolve(stubEntry))
        .should.eventually.equal(stubEntry);
    });

    it('returns an error if S3 deletion returns an error', function() {
      var stubError = 'S3 deletion error';
      var stubKey = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
      var stubEntry = { contents: 'http://www.fakecontent.com/' + stubKey };

      sandbox.stub(s3, 'deleteObject').returns({
        promise: function() { return Promise.reject(stubError); }
      });

      return deleteS3Contents(stubEntry).should.be.rejected
        .and.eventually.eql(stubError);
    });

    it('returns an error if the contents have invalid type', function() {
      var stubEntry = {
        contents: 123
      };
      var stubError = new Error('Entry has invalid contents');

      return deleteS3Contents(stubEntry).should.be.rejected
        .and.eventually.eql(stubError);
    });
  });

  context('#removeEntry:', function() {
    it('calls entry.remove() if the entry exists', function() {
      var stubEntry = {
        remove: function() {
          return Promise.resolve();
        }
      };

      return removeEntry(stubEntry).should.eventually.be.fulfilled;
    });
  });
});
