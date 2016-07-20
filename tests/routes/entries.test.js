/*jslint node: true, mocha: true */
'use strict';

var express = require('express');
var should = require('chai').should();
var rewire = require('rewire');
var sinon = require('sinon');

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

    var stubResponse = function(expectedResponse, done) {
      return {
        json: function(data) {
          data.should.eql(expectedResponse);
          done();
        }
      };
    };

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
    });

    it('registers a URI for DELETE: /:entryId', function() {
      router
        .delete
        .calledWith('/:entryId', sandbox.match.any).should.equal(true);
    });

    it('deletes the entry\'s S3 contents if it exists', function(done) {
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
        done();
      });

      sandbox.stub(Entry, 'findOne').yields(null, stubEntry);
      callDelete();
    });

    it('calls entry.remove() if the entry exists', function(done) {
      var stubEntry = {
        remove: function(cb) {
          should.exist(cb);
          done();
        }
      };

      sandbox.stub(Entry, 'findOne').yields(null, stubEntry);
      callDelete();
    });

    it('fails if S3 deletion returns an error', function(done) {
      var stubError = 'S3 deletion error';
      var stubKey = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
      var stubEntry = {
        contents: 'http://www.fakecontent.com/'
                    + s3config.mediaBucket
                    + '/'
                    + stubKey
      };
      var next = stubNext(stubError, done);

      sandbox.stub(s3, 'deleteObject').yields(stubError);
      sandbox.stub(Entry, 'findOne').yields(null, stubEntry);
      callDelete(null, next);
    });

    it('fails if Entry.findOne() returns an error', function(done) {
      var stubError = 'Error finding entry';
      var next = stubNext(stubError, done);

      sandbox.stub(Entry, 'findOne').yields(stubError);
      callDelete(null, next);
    });

    it('returns an error if no entry is found', function(done) {
      var stubError = new Error('Entry not found');
      stubError.status = 404;
      var next = stubNext(stubError, done);

      sandbox.stub(Entry, 'findOne').yields();
      var res = stubResponse(stubError, done);
      callDelete(null, next);
    });

    it('fails if the entry remove method returns an error', function(done) {
      var stubError = 'Error removing entry';
      var next = stubNext(stubError, done);
      var stubEntry = {
        remove: function(cb) {
          cb(stubError);
        }
      };

      sandbox.stub(Entry, 'findOne').yields(null, stubEntry);
      callDelete(null, next);
    });

    it('sends a JSON response if entry is removed', function(done) {
      var stubResponseJSON = {
        message: 'Entry deleted.'
      };

      var stubEntry = {
        remove: function(cb) { cb(); }
      };

      sandbox.stub(Entry, 'findOne').yields(null, stubEntry);
      callDelete(stubResponse(stubResponseJSON, done));
    });
  });
});
