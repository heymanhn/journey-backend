/*jslint node: true, mocha: true */
'use strict';

var passport = require('passport');
var should = require('chai').should();
var sinon = require('sinon');

var checkLoginParams = require('../utils/auth').checkLoginParams;
var ensureAuth = require('../utils/auth').ensureAuth;
var isCurrentUser = require('../utils/users').isCurrentUser;
var userIDExists = require('../utils/users').userIDExists;
var User = require('../models/userModel');

describe('Routes Middleware', function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#auth middleware', function() {
    context('#ensureAuth:', function() {
      var req = {};

      it('sets req.user if the current session is authenticated',
        function(done) {
        var stubUser = {
          name: 'Stub User'
        };

        var next = function() {
          req.user.should.eql(stubUser);
          done();
        };

        sandbox.stub(passport, 'authenticate', function(strategy, cb) {
          strategy.should.equal('jwt');
          return function(req, res, next) {
            cb(null, stubUser);
          };
        });

        ensureAuth(req, null, next);
      });

      it('returns an error if passport auth fails', function(done) {
        var stubError = 'Passport authentication error';
        var next = function(err) {
          err.should.equal(stubError);
          done();
        };

        sandbox.stub(passport, 'authenticate', function(strategy, cb) {
          return function(req, res, next) {
            cb(stubError);
          };
        });

        ensureAuth(req, null, next);
      });

      it('returns an error if the user is not authorized', function(done) {
        var stubError = new Error('Not Authorized');
        stubError.status = 401;

        var next = function(err) {
          err.should.eql(stubError);
          done();
        };

        sandbox.stub(passport, 'authenticate', function(strategy, cb) {
          return function(req, res, next) {
            cb();
          };
        });

        ensureAuth(req, null, next);
      });
    });

    context('#checkLoginParams:', function() {
      var req;

      beforeEach(function() {
        req = {
          body: {
            username: 'amy',
            email: 'amy@journey.com',
            password: 'abc123'
          }
        };
      });

      it('proceeds if request has a username and password', function(done) {
        delete req.body.email;

        var next = function() {
          should.exist(req.body.username);
          should.exist(req.body.password);
          done();
        };

        checkLoginParams(req, null, next);
      });

      it('proceeds if the request has an email and password', function(done) {
        delete req.body.username;

        var next = function() {
          should.exist(req.body.email);
          should.exist(req.body.password);
          done();
        };

        checkLoginParams(req, null, next);
      });

      it('sets login type in the request before proceeding', function(done) {
        delete req.body.email;

        var next = function() {
          req.loginType.should.equal('username');
          done();
        };

        checkLoginParams(req, null, next);
      });

      it('returns an error if the password is not provided', function(done) {
        delete req.body.email;
        delete req.body.password;

        var stubError = new Error('Password not provided');
        var next = function(err) {
          err.should.eql(stubError);
          done();
        };

        checkLoginParams(req, null, next);
      });

      it('returns an error if username/email is not provided', function(done) {
        delete req.body.username;
        delete req.body.email;

        var stubError = new Error('Username or email not provided');
        var next = function(err) {
          err.should.eql(stubError);
          done();
        };

        checkLoginParams(req, null, next);
      });
    });
  });

  describe('users middleware', function() {
    context('#isCurrentUser:', function() {
      var req = {
        params: {
          userId: 'a1b2c3d4'
        },
        user: {
          id: 'a1b2c3d4'
        }
      };

      it('moves on if the desired user matches the current user', function() {
        var next = sandbox.spy();
        isCurrentUser(req, null, next);
        next.calledOnce.should.equal(true);
      });

      it('returns an error if the desired user doesn\'t match', function() {
        req.params.userId = 'a1b2c3d4e5';
        var next = sandbox.spy();
        var stubError = new Error('Cannot perform this action on another user');
        stubError.status = 403;

        isCurrentUser(req, null, next);
        next.calledWith(stubError).should.equal(true);
      });

      it('returns an error if the userId param doesn\'t exist', function() {
        req.params = {};
        var next = sandbox.spy();
        var stubError = new Error('No user ID provided');
        stubError.status = 400;

        isCurrentUser(req, null, next);
        next.calledWith(stubError).should.equal(true);
      });
    });
  });
});
