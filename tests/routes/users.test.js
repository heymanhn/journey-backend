/*jslint node: true, mocha: true */
'use strict';

var config = require('../../config/config');
var express = require('express');
var jwt = require('jsonwebtoken');
var should = require('chai').should();
var sinon = require('sinon');
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
    var stubExpiry = { expiresIn: '90 days' };
    var stubUser = {
      _doc: 'foo'
    };

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
      var res = { json: function() {} };

      // Passes the right args into jwt.sign()
      var jwtMock = sandbox.mock(jwt)
                           .expects('sign')
                           .once()
                           .withArgs(
                              stubUser._doc,
                              config.secrets.jwt,
                              stubExpiry);

      sandbox.stub(User.prototype, 'save', function(cb) {
        cb(null, stubUser);
        jwtMock.verify();
        done();
      });

      callPost(res);
    });

    it('returns the user object and JWT upon success', function(done) {
      var stubToken = 'abcdefg';
      var expectedResponse = {
        success: true,
        message: 'User created successfully.',
        user: stubUser,
        token: 'JWT ' + stubToken
      };
      var res = {
        json: function(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };

      sandbox.stub(jwt, 'sign').returns(stubToken);
      sandbox.stub(User.prototype, 'save', function(cb) {
        cb(null, stubUser);
      });

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

      sandbox.stub(User.prototype, 'save', function(cb) {
        cb(stubError, null);
      });

      callPost(null, next);
    });

  });

  describe('#get /:userId', function() {
    var req = {
      userDoc: {
        username: 'herman',
        email: 'herman@journey.com'
      }
    };

    var callGet = function(res, next) {
      router.get.firstCall.args[4](req, res, next);
    };

    it('registers a URI for GET: /:userId', function() {
      router.get.firstCall.calledWith('/:userId', sandbox.match.any)
            .should.equal(true);
    });

    it('returns the current authenticated user object', function(done) {
      var expectedResponse = {
        success: true,
        user: req.userDoc
      };
      var res = {
        json: function(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };
      callGet(res);
    });

    it('returns an error if no authenticated user object is available',
    function() {
      true.should.equal(false);
    });

    it('returns a 404 response if no user is found', function() {
      true.should.equal(false);
    });
  });

  describe('#put /:userId', function() {
    it('registers a URI for PUT: /:userId', function() {
      router.put.firstCall.calledWith('/:userId', sandbox.match.any)
            .should.equal(true);
    });
  });

  describe('#delete /', function() {
    it('registers a URI for DELETE: /:userId', function() {
      router.delete.firstCall.calledWith('/:userId', sandbox.match.any)
            .should.equal(true);
    });
  });

  describe('#get /:userId/entries', function() {
    it('registers a URI for GET: /:userId/entries', function() {
      router.get
            .secondCall
            .calledWith('/:userId/entries', sandbox.match.any)
            .should.equal(true);
    });
  });
});
