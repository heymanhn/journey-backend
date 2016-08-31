/*jslint node: true, mocha: true */
'use strict';

var express = require('express');
var jwt = require('jsonwebtoken');
var should = require('chai').should(); // jshint ignore:line
var sinon = require('sinon');

var database = require('../../config/database');
var Entry = require('../../models/entryModel');
var User = require('../../models/userModel');

describe('User Routes', function() {
  var sandbox;
  var router;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    sandbox.stub(express, 'Router').returns({
      get: sandbox.spy(),
      post: sandbox.spy(),
      put: sandbox.spy(),
      delete: sandbox.spy()
    });

    router = require('../../routes/v1/users');
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#post /', function() {
    var req;
    var stubUser;

    var callPost = function(res, next) {
      router.post.firstCall.args[1](req, res, next);
    };

    beforeEach(function() {
      req = {
        body: {
          username: 'amy',
          password: 'abc123',
          email: 'amy@journey.com',
          name: 'Amy Doe'
        }
      };

      stubUser = { _doc: { username: 'foo' } };
    });

    it('registers a URI for POST: /', function() {
      router.post.calledWith('/', sandbox.match.any).should.equal(true);
    });

    it('creates the user if all required fields are provided', function(done) {
      sandbox.stub(User.prototype, 'save', function() {
        done();
      });

      callPost();
    });

    it('generates a JSON web token once user is created', function(done) {
      var res = { json: function() { done(); } };

      sandbox.stub(jwt, 'sign', function(payload, secret, expiry) {
        payload.should.eql(stubUser._doc);
      });
      sandbox.stub(User.prototype, 'save').yields(null, stubUser);

      callPost(res);
    });

    it('returns the user object and JWT upon success', function(done) {
      var stubToken = 'abcdefg';
      var expectedResponse = {
        message: 'User created successfully.',
        user: stubUser._doc,
        token: 'JWT ' + stubToken
      };
      var res = {
        json: function(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };

      sandbox.stub(jwt, 'sign').returns(stubToken);
      sandbox.stub(User.prototype, 'save').yields(null, stubUser);

      callPost(res);
    });

    it('returns an error if any required fields are missing', function(done) {
      req.body.email = undefined;
      req.body.password = undefined;

      var stubError = new Error('Params missing: password,email');
      var next = function(err) {
        err.should.eql(stubError);
        done();
      };

      callPost(null, next);
    });

    it('returns an error if User.save() fails', function(done) {
      var stubError = 'Save error';
      var next = function(err) {
        err.should.eql(stubError);
        done();
      };

      sandbox.stub(User.prototype, 'save').yields(stubError);
      callPost(null, next);
    });

  });

  describe('#get /:userId', function() {
    var req;

    var callGet = function(res, next) {
      router.get.firstCall.args[3](req, res, next);
    };

    beforeEach(function() {
      req = {
        userDoc: {
          _doc: {
            username: 'herman',
            email: 'herman@journey.com'
          }
        }
      };
    });

    it('registers a URI for GET: /:userId', function() {
      router.get.firstCall.calledWith('/:userId', sandbox.match.any)
            .should.equal(true);
    });

    it('returns the current authenticated user object', function(done) {
      var expectedResponse = { user: req.userDoc._doc };
      var res = {
        json: function(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };
      callGet(res);
    });
  });

  describe('#put /:userId', function() {
    var req;

    var callPut = function(res, next) {
      router.put.firstCall.args[3](req, res, next);
    };

    beforeEach(function() {
      req = {
        body: {
          email: 'amy.doe@journey.com',
          name: 'Amy Doe'
        },
        userDoc: {
          username: 'amy',
          password: 'hashedabc123',
          email: 'amy@journey.com',
          name: 'Amy Doe'
        }
      };
    });

    it('registers a URI for PUT: /:userId', function() {
      router.put.firstCall.calledWith('/:userId', sandbox.match.any)
            .should.equal(true);
    });

    it('does not change the password if it matches existing hashed password',
      function(done) {
      req.body.password = 'abc123';

      req.userDoc.checkPassword = function(pw) {
        pw.should.equal(req.body.password);
        return true;
      };
      req.userDoc.save = function() {
        this.password.should.not.equal(req.body.password);
        done();
      };

      callPut();
    });

    it('only updates fields that have changed', function(done) {
      var oldEmail = req.userDoc.email;
      req.userDoc.save = function() {
        this.email.should.not.equal(oldEmail);
        done();
      };

      callPut();
    });

    it('updates the user and sends object in response', function(done) {
      var stubUser = {
        _doc: {
          username: 'amy',
          email: 'amy@journey.com',
          name: 'Amy Doe'
        }
      };
      var expectedResponse = {
        message: 'User updated successfully.',
        user: stubUser._doc
      };
      var res = {
        json: function(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };

      req.userDoc.save = function(cb) {
        cb(null, stubUser);
      };

      callPut(res);
    });

    it('returns an error if the update operation fails', function(done) {
      var stubError = 'Update error';
      var next = function(err) {
        err.should.equal(stubError);
        done();
      };
      req.userDoc.save = function(cb) {
        cb(stubError);
      };

      callPut(null, next);
    });
  });

  describe('#delete /', function() {
    var req = {};
    var callDelete = function(res, next) {
      router.delete.firstCall.args[3](req, res, next);
    };

    it('registers a URI for DELETE: /:userId', function() {
      router.delete.firstCall.calledWith('/:userId', sandbox.match.any)
            .should.equal(true);
    });

    it('calls user.remove() and sends response to user', function(done) {
      var expectedResponse = { message: 'User deleted.' };
      var res = {
        json: function(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };
      req.userDoc = {
        remove: function(cb) { cb(); }
      };

      callDelete(res);
    });

    it('returns an error if the model\'s remove method fails', function(done) {
      var stubError = 'Remove error';
      var next = function(err) {
        err.should.equal(stubError);
        done();
      };

      req.userDoc = {
        remove: function(cb) { cb(stubError); }
      };

      callDelete(null, next);
    });
  });

  describe('#get /:userId/entries', function() {
    var req = {
      params: {
        userId: 'a1b2c3d4'
      },

      query: {}
    };
    var callGet = function(res, next) {
      router.get.thirdCall.args[3](req, res, next);
    };

    it('registers a URI for GET: /:userId/entries', function() {
      router.get
            .thirdCall
            .calledWith('/:userId/entries', sandbox.match.any)
            .should.equal(true);
    });

    it('looks for entries by the current user', function(done) {
      sandbox.stub(Entry, 'findEntries', function(params, count, page) {
        params.creator.should.equal(req.params.userId);
        count.should.equal(database.DEFAULT_ENTRY_COUNT);
        page.should.equal(1);

        return {
          then: function() { return { catch: function() { done(); } }; }
        };
      });

      callGet();
    });

    it('uses additional query parameters if provided', function(done) {
      req.query = {
        page: '1',
        count: '5',
        maxDate: '2016-07-22'
      };

      sandbox.stub(Entry, 'findEntries', function(params, count, page) {
        params.date.should.eql({ $lt: new Date(req.query.maxDate) });
        count.should.equal(Number(req.query.count));
        page.should.equal(Number(req.query.page));

        return {
          then: function() { return { catch: function() { done(); } }; }
        };
      });

      callGet();
    });

    it('returns a list of entries in the response', function(done) {
      var stubEntries = ['Entry 1', 'Entry 2', 'Entry 3'];
      var expectedResponse = {
        page: 1,
        results: 3,
        entries: stubEntries,
      };
      var res = {
        json: function(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };

      sandbox.stub(Entry, 'findEntries').returns(Promise.resolve(stubEntries));
      callGet(res);
    });

    it('returns an error if no entries are found', function(done) {
      var stubError = new Error('No entries found');
      stubError.status = 404;

      var next = function(err) {
        err.should.eql(stubError);
        done();
      };

      sandbox.stub(Entry, 'findEntries').returns(Promise.resolve([]));
      callGet(null, next);
    });

    it('returns an error if Entry.findEntries() fails', function(done) {
      var stubError = 'Find error';
      var next = function(err) {
        err.should.equal(stubError);
        done();
      };

      sandbox.stub(Entry, 'findEntries').returns(Promise.reject(stubError));
      callGet(null, next);
    });
  });
});
