/*jslint node: true, mocha: true */
'use strict';

var bcrypt = require('bcrypt');
var should = require('chai').should();
var sinon = require('sinon');

var utils = require('./utils');
var User = require('../../models/userModel');
var preSaveHook = require('../../models/userUtils').preSaveHook;

describe('User Model', function() {
  var sandbox;

  before(utils.connect);

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#create:', function() {
    it('creates a new User given the right fields', function(done) {
      var testUser = new User({
        username: 'herman',
        password: 'abc123',
        email: 'herman@journey.com'
      });

      testUser.save(function(err, user) {
        should.not.exist(err);
        (typeof user).should.equal('object');
        user.username.should.equal(testUser.username);
        user.email.should.equal(testUser.email);

        done();
      });
    });

    context('#save pre-processing:', function() {
      var stubModel;
      var next;

      beforeEach(function() {
        next = sandbox.spy();
        stubModel = {
          password: 'abc123',
          isModified: function() { return true; }
        };
      });

      it('hashes the user password before storing to db', function(done) {
        sandbox.stub(bcrypt, 'hash', function(password) {
          password.should.equal(stubModel.password);
          done();
        });

        preSaveHook.bind(stubModel)();
      });

      it('only pre-processes if the password has changed', function() {
        stubModel.isModified = function() { return false; };

        preSaveHook.bind(stubModel)(next);
        next.calledOnce.should.equal(true);
      });

      it('fails if the hash function returns an error', function(done) {
        var stubError = 'bcrypt.hash() error';
        sandbox.stub(bcrypt, 'hash', function(pw, saltCount, cb) {
          cb(stubError);
          next.calledWith(stubError).should.equal(true);
          done();
        });

        preSaveHook.bind(stubModel)(next);
      });

      it('sets the password if hash function succeeds', function(done) {
        var stubHash = 'ABC!@#';

        sandbox.stub(bcrypt, 'hash', function(pw, saltCount, cb) {
          cb(null, stubHash);

          next.calledOnce.should.equal(true);
          stubModel.password.should.equal(stubHash);
          done();
        });

        preSaveHook.bind(stubModel)(next);
      });
    });

    context('#validation:', function() {
      it('fails if "username" is not provided', function(done) {
        var testUser = new User({
          password: 'abc123',
          email: 'herman@journey.com'
        });

        testUser.validate(function(err) {
          should.exist(err);
          err.name.should.equal('ValidationError');
          done();
        });
      });

      it('fails if "password" is not provided', function(done) {
        var testUser = new User({
          username: 'herman',
          email: 'herman@journey.com'
        });

        testUser.validate(function(err) {
          should.exist(err);
          err.name.should.equal('ValidationError');
          done();
        });
      });

      it('fails if "email" is not provided', function(done) {
        var testUser = new User({
          username: 'herman',
          password: 'abc123'
        });

        testUser.validate(function(err) {
          should.exist(err);
          err.name.should.equal('ValidationError');
          done();
        });
      });
    });
  });

  describe('#instance methods:', function() {
    context('#checkPassword:', function() {
      it('calls bcrypt.compare() with the right arguments', function() {
        var newPassword = '123abc';
        var oldPassword = 'abc123';
        var cb = function() {};
        var bcryptMock = sandbox.mock(bcrypt)
                                .expects('compare')
                                .withArgs(newPassword, oldPassword, cb);

        var testUser = new User({
          username: 'herman',
          password: oldPassword
        });

        testUser.checkPassword(newPassword, cb);
        bcryptMock.verify();
      });
    });
  });
});
