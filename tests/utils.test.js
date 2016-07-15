/*jslint node: true, mocha: true */
'use strict';

var passport = require('passport');
var should = require('chai').should();
var sinon = require('sinon');

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
  })

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

    context('#userIDExists:', function() {
      var req = {
        params: {
          userId: 'a1b2c3d4'
        }
      };

      it('looks for a user that matches the provided userId', function(done) {
        var stubOpts = { '_id': req.params.userId };

        sandbox.stub(User, 'findOne', function(opts, cb) {
          opts.should.eql(stubOpts);
          done();
        });

        userIDExists(req);
      });

      it('adds the user object to req if found', function(done) {
        var stubUser = { username: 'stubuser' };
        var next = function() {
          req.userDoc.should.eql(stubUser);
          done();
        };

        sandbox.stub(User, 'findOne', function(opts, cb) {
          cb(null, stubUser);
        });

        userIDExists(req, null, next);
      });

      it('returns an error if the findOne() function fails', function(done) {
        var stubError = 'findOne error';
        var next = function(err) {
          err.should.equal(stubError);
          done();
        };

        sandbox.stub(User, 'findOne', function(opts, cb) {
          cb(stubError);
        });

        userIDExists(req, null, next);
      });

      it('returns an error if the userId isn\'t found', function(done) {
        var stubError = new Error('User not found');
        stubError.status = 404;
        var next = function(err) {
          err.should.eql(stubError);
          done();
        };

        sandbox.stub(User, 'findOne', function(opts, cb) {
          cb();
        });

        userIDExists(req, null, next);
      });

      it('returns an error if the userId param doesn\'t exist', function() {
        req.params = {};
        var next = sandbox.spy();
        var stubError = new Error('No user ID provided');
        stubError.status = 400;

        userIDExists(req, null, next);
        next.calledWith(stubError).should.equal(true);
      });
    });
  });
});
