/*jslint node: true, mocha: true */
'use strict';

var express = require('express');
var jwt = require('jsonwebtoken');
var should = require('chai').should();
var sinon = require('sinon');

var User = require('../../models/userModel');

describe('Authentication Routes', function() {
  var sandbox;
  var router;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    sandbox.stub(express, 'Router').returns({
      post: sandbox.spy()
    });

    router = require('../../routes/v1/auth');
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#post /login', function() {
    var req;

    beforeEach(function() {
      req = {
        body: {
          username: 'amy',
          password: 'abc123'
        },
        loginType: 'username'
      };
    });

    var stubNext = function(stubError, done) {
      return function(err) {
        err.should.eql(stubError);
        done();
      };
    };

    var callPost = function(res, next) {
      router.post.firstCall.args[2](req, res, next);
    };

    it('registers a URI for POST: /login', function() {
      router.post.calledWith('/login', sandbox.match.any).should.equal(true);
    });

    it('checks if a user exists given a username', function(done) {
      sandbox.stub(User, 'findOne', function(opts) {
        Object.keys(opts).length.should.equal(1);
        opts.username.should.equal(req.body.username);
        done();
      });

      callPost();
    });

    it('checks if a user exists given an email', function(done) {
      delete req.body.username;
      req.body.email = 'amy@journey.com';
      req.loginType = 'email';

      sandbox.stub(User, 'findOne', function(opts) {
        Object.keys(opts).length.should.equal(1);
        opts.email.should.equal(req.body.email);
        done();
      });

      callPost();
    });

    it('creates a JWT if password matches, and sends it in the response',
      function(done) {
      var stubUser = {
        _doc: {
          username: 'Stub User'
        },
        checkPassword: function(pw) {
          pw.should.equal(req.body.password);
          return true;
        }
      };
      var stubToken = 'stubtoken';
      var expectedResponse = {
        user: stubUser._doc,
        token: 'JWT ' + stubToken
      };

      var res = {
        json: function(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };

      sandbox.stub(jwt, 'sign', function(obj) {
        obj.should.equal(stubUser._doc);
        return stubToken;
      });

      sandbox.stub(User, 'findOne').yields(null, stubUser);
      callPost(res);
    });

    it('returns an error if User lookup fails', function(done) {
      var stubError = 'Stub error';
      var next = stubNext(stubError, done);

      sandbox.stub(User, 'findOne').yields(stubError);
      callPost(null, next);
    });

    it('returns an error if no user is found', function(done) {
      var stubError = new Error('Invalid username or email');
      var next = stubNext(stubError, done);

      sandbox.stub(User, 'findOne').yields();
      callPost(null, next);
    });

    it('returns an error if the password is incorrect', function(done) {
      var stubUser = {
        checkPassword: function() { return false; }
      };
      var stubError = new Error('Invalid password');
      var next = stubNext(stubError, done);

      sandbox.stub(User, 'findOne').yields(null, stubUser);
      callPost(null, next);
    });

    it('returns an error if JWT creation fails', function(done) {
      var stubUser = {
        checkPassword: function() { return true; }
      };
      var stubError = new Error('Error generating authentication token');
      var next = stubNext(stubError, done);

      sandbox.stub(jwt, 'sign').returns(null);
      sandbox.stub(User, 'findOne').yields(null, stubUser);
      callPost(null, next);
    });
  });
});
