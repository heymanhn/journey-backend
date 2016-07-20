/*jslint node: true, mocha: true */
'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var express = require('express');
var rewire = require('rewire');
var should = chai.should();
var sinon = require('sinon');
require('sinon-as-promised');
chai.use(chaiAsPromised);

var Entry = require('../../models/entryModel');
var s3config = require('../../config/secrets').s3;

describe('Entry Routes', function() {
  var sandbox;
  var router;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    sandbox.stub(express, 'Router').returns({
      post: sandbox.spy(),
      delete: sandbox.spy()
    });

    router = rewire('../../routes/v1/entries');
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#post /', function() {
    var stubRedirect = function(expectedResponse, done) {
      return {
        redirect: function(data) {
          data.should.equal(expectedResponse);
          done();
        }
      };
    };

    var req = {
      user: {
        _id: '577371f00000000000000000'
      },
      body: {
        type: 'text',
        message: 'Test entry 1'
      }
    };

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
      delete req.body.message;

      sandbox.stub(Entry.prototype, 'save', function(cb) {
        this._doc.contents.should.equal(req.body.contents);
        cb();
      });

      var res = stubRedirect('/v1/users/' + req.user._id + '/entries', done);
      callPost(res);
    });

    it('saves the location data if provided', function(done) {
      req.body.loc = {
        type: 'Point',
        coordinates: [-122.416534, 37.612311]
      };

      sandbox.stub(Entry.prototype, 'save', function(cb) {
        var loc = this._doc.loc;
        (typeof loc).should.equal('object');
        loc.type.should.eql(req.body.loc.type);
        loc.coordinates[0].should.equal(req.body.loc.coordinates[0]);
        loc.coordinates[1].should.equal(req.body.loc.coordinates[1]);
        cb();
      });

      var res = stubRedirect('/v1/users/' + req.user._id + '/entries', done);
      callPost(res);
    });

    it('fails if Entry.save() returns an error', function(done) {
      var stubError = 'Error saving entry';
      sandbox.stub(Entry.prototype, 'save').yields(stubError);

      var next = function(err) {
        err.should.equal(stubError);
        done();
      };

      callPost(null, next);
    });
  });

  describe('#delete /', function() {
    var req;
    var s3;
    var deleteS3Contents;
    var removeEntry;

    var stubNext = function(expectedError, done) {
      return function(err) {
        err.should.eql(expectedError);
        done();
      };
    };

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

      s3 = router.__get__('s3');
      deleteS3Contents = router.__get__('deleteS3Contents');
      removeEntry = router.__get__('removeEntry');
    });

    it('registers a URI for DELETE: /:entryId', function() {
      router
        .delete
        .calledWith('/:entryId', sandbox.match.any).should.equal(true);
    });

    it('looks for the entry using the entry ID', function(done) {
      router.__set__('deleteS3Contents', function() {
        done();
      });

      sandbox.stub(Entry, 'findOne', function(params) {
        params._id.should.equal(req.params.entryId);
        return {
          exec: function() {
            return Promise.resolve();
          }
        };
      });

      callDelete();
    });

    it('fails if Entry.findOne() returns an error', function(done) {
      var stubError = 'Error finding entry';
      var next = stubNext(stubError, done);

      sandbox.stub(Entry, 'findOne', function() {
        return {
          exec: function() {
            return Promise.reject(stubError);
          }
        };
      });

      callDelete(null, next);
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

      router.__set__('deleteS3Contents', function(entry) {
        return entry;
      });
      router.__set__('removeEntry', function(entry) {
        return entry;
      });

      sandbox.stub(Entry, 'findOne', function() {
        return {
          exec: function() {
            return Promise.resolve(stubEntry);
          }
        };
      });

      callDelete(res);
    });

    context('#deleteS3Contents:', function() {
      it('deletes the entry\'s S3 contents if it exists', function() {
        var stubKey = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
        var stubEntry = {
          contents: 'http://www.fakecontent.com/'
                      + s3config.mediaBucket
                      + '/'
                      + stubKey
        };

        sandbox.stub(s3, 'deleteObject', function(params) {
          params.Bucket.should.equal(s3config.mediaBucket);
          params.Key.should.equal(stubKey);

          return {
            promise: function() { return Promise.resolve(); }
          };
        });

        return deleteS3Contents(stubEntry).should.eventually.equal(stubEntry);
      });

      it('continues if the entry has no contents to delete', function() {
        var stubEntry = { type: 'text' };

        return deleteS3Contents(stubEntry).should.eventually.equal(stubEntry);
      });

      it('returns an error if no entry is found', function() {
        var stubError = new Error('Entry not found');
        stubError.status = 404;

        return deleteS3Contents().should.be.rejected
          .and.eventually.eql(stubError);
      });

      it('returns an error if S3 deletion returns an error', function() {
        var stubError = 'S3 deletion error';
        var stubKey = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
        var stubEntry = {
          contents: 'http://www.fakecontent.com/'
                      + s3config.mediaBucket
                      + '/'
                      + stubKey
        };

        sandbox.stub(s3, 'deleteObject').returns({
          promise: function() { return Promise.reject(stubError); }
        });

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
});
