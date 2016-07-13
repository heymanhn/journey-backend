/*jslint node: true, mocha: true */
'use strict';

var express = require('express');
var should = require('chai').should();
var sinon = require('sinon');
var Entry = require('../../models/entryModel');
var mongoose = require('mongoose');

describe('Entry Routes', function() {
  var sandbox;
  var router;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    sandbox.stub(express, 'Router').returns({
      post: sandbox.spy(),
      delete: sandbox.spy()
    });

    router = require('../../routes/v1/entries');
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
        contents: 'Test entry 1'
      }
    };

    var callPost = function(res, next) {
      router.post.firstCall.args[2](req, res, next);
    };

    it('registers a URI for POST: /', function() {
      router.post.calledWith('/', sandbox.match.any).should.equal(true);
    });

    it('creates the entry successfully if fields are valid', function(done) {
      sandbox.stub(Entry.prototype, 'save', function(callback) {
        callback(null);
      });

      var res = stubRedirect('/v1/users/' + req.user._id + '/entries', done);
      callPost(res);
    });

    it('fails if Entry.save() returns an error', function(done) {
      var fakeError = 'Error saving entry';
      sandbox.stub(Entry.prototype, 'save', function(callback) {
        callback(fakeError);
      });

      var next = function(err) {
        err.should.equal(fakeError);
        done();
      };

      callPost(null, next);
    });
  });

  describe('#delete /', function() {
    var req = {
      user: {
        _id: '577371f00000000000000000'
      },
      params: {
        entryId: '577371f00000000000000000'
      }
    };

    var stubResponse = function(expectedResponse, expectedCode, done) {
      var res = {
        json: function(data) {
          data.should.eql(expectedResponse);
          done();
        },
        status: function(code) {
          code.should.equal(expectedCode);
          return res;
        }
      };

      return res;
    };

    var stubNext = function(expectedError, done) {
      return function(err) {
        err.should.equal(expectedError);
        done();
      };
    };

    var stubFindOneEntry = function(err, entry) {
      sandbox.stub(Entry, 'findOne', function(opts, cb) {
        cb(err, entry);
      });
    };

    var callDelete = function(res, next) {
      router.delete.firstCall.args[2](req, res, next);
    };

    it('registers a URI for DELETE: /:entryId', function() {
      router
        .delete
        .calledWith('/:entryId', sandbox.match.any).should.equal(true);
    });

    it('calls entry.remove() if the entry exists', function(done) {
      var entry = {
        remove: function(cb) {
          should.exist(cb);
          done();
        }
      };

      stubFindOneEntry(null, entry);
      callDelete();
    });

    it('fails if Entry.findOne() returns an error', function(done) {
      var stubError = 'Error finding entry';
      var next = stubNext(stubError, done);

      stubFindOneEntry(stubError, null);
      callDelete(null, next);
    });

    it('returns a 404 response if no entry is found', function(done) {
      var stubResponseJSON = {
        success: false,
        message: 'Entry not found.'
      };

      stubFindOneEntry();
      var res = stubResponse(stubResponseJSON, 404, done);
      callDelete(res);
    });

    it('fails if the entry remove method returns an error', function(done) {
      var stubError = 'Error removing entry';
      var next = stubNext(stubError, done);
      var entry = {
        remove: function(cb) {
          cb(stubError);
        }
      };

      stubFindOneEntry(null, entry);
      callDelete(null, next);
    });

    it('sends a JSON response if entry is removed', function(done) {
      var stubResponseJSON = {
        success: true,
        message: 'Entry deleted.'
      };

      var entry = {
        remove: function(cb) { cb(); }
      };

      stubFindOneEntry(null, entry);
      callDelete(stubResponse(stubResponseJSON, null, done));
    });
  });
});
