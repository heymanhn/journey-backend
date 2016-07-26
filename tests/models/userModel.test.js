/*jslint node: true, mocha: true */
'use strict';

var bcrypt = require('bcrypt');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var should = chai.should();
var sinon = require('sinon');

require('sinon-as-promised');
chai.use(chaiAsPromised);
require('mongoose').Promise = Promise;

var testUtils = require('./utils');
var User = require('../../models/userModel');
var utils = require('../../models/userUtils');

describe('User Model', function() {
  var sandbox;
  var next;

  before(testUtils.connect);

  beforeEach(function(done) {
    sandbox = sinon.sandbox.create();
    next = sandbox.spy();

    var user1 = new User({
      username: 'amy',
      email: 'amy@journey.com',
      password: 'abc123'
    });

    var user2 = new User({
      username: 'alex',
      email: 'alex@journey.com',
      password: 'abc123'
    });

    user1.save(function() {
      user2.save(function() {
        done();
      });
    });
  });

  afterEach(function(done) {
    sandbox.restore();
    User.remove({}, done);
  });

  describe('#create:', function() {
    it('creates a new User given the right fields', function(done) {
      var testUser = new User({
        username: 'herman',
        password: 'abc123',
        email: 'herman@journey.com',
        name: 'Herman Ng'
      });

      testUser.save(function(err, user) {
        should.not.exist(err);
        (typeof user).should.equal('object');
        user.username.should.equal(testUser.username);
        user.email.should.equal(testUser.email);
        user.name.should.equal(testUser.name);
        should.exist(user.signupDate);

        done();
      });
    });
  });

  describe('#pre-save checks:', function() {
    context('#duplicate field checking:', function() {
      var field = 'foo';
      var value = 'bar';
      var stubModel;

      beforeEach(function() {
        stubModel = { isModified: function() { return true; } };
      });

      it('calls Model.count() to check if the field exists', function(done) {
        stubModel.model = function() {
          return {
            count: function(opts) {
              opts[field].should.equal(value);
              Object.keys(opts).length.should.equal(1);
              return { exec: function() { return Promise.resolve(0); } };
            }
          };
        };

        utils.fieldExistsCheck.bind(stubModel)(field, value, done);
      });

      it('fails if Model.count() returns an error', function(done) {
        var stubError = 'count() error';
        var stubNext = function(err) {
          err.should.eql(stubError);
          done();
        };

        stubModel.model = function() {
          return {
            count: function() {
              return {
                exec: function() {
                  return Promise.reject(stubError);
                }
              };
            }
          };
        };

        utils.fieldExistsCheck.bind(stubModel)(field, value, stubNext);
      });

      it('moves on if the field has not changed', function() {
        stubModel.isModified = function() { return false; };
        utils.fieldExistsCheck.bind(stubModel)(field, null, next);
        next.calledOnce.should.equal(true);
      });

      it('returns an error if the field exists', function(done) {
        var stubError = new Error(field + ' already exists');
        var stubNext = function(err) {
          err.should.eql(stubError);
          done();
        };

        stubModel.model = function() {
          return {
            count: function() {
              return {
                exec: function() {
                  return Promise.resolve(1);
                }
              };
            }
          };
        };

        utils.fieldExistsCheck.bind(stubModel)(field, value, stubNext);
      });
    });

    context('#password length check:', function() {
      it('moves on if the password is >= 6 characters', function() {
        var stubModel = { password: 'abc123' };

        utils.checkPasswordLength.bind(stubModel)(next);
        next.calledOnce.should.equal(true);
      });

      it('returns an error if password is < 6 characters', function() {
        var error = new Error('Password needs to be at least 6 characters');
        var stubModel = { password: 'a1b2' };

        utils.checkPasswordLength.bind(stubModel)(next);
        next.calledOnce.should.equal(true);
        next.calledWith(error).should.equal(true);
      });
    });

    context('#password hashing:', function() {
      var stubModel;

      beforeEach(function() {
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

        utils.hashPassword.bind(stubModel)();
      });

      it('only pre-processes if the password has changed', function() {
        stubModel.isModified = function() { return false; };

        utils.hashPassword.bind(stubModel)(next);
        next.calledOnce.should.equal(true);
      });

      it('fails if the hash function returns an error', function(done) {
        var stubError = 'bcrypt.hash() error';
        sandbox.stub(bcrypt, 'hash', function(pw, saltCount, cb) {
          cb(stubError);
          next.calledWith(stubError).should.equal(true);
          done();
        });

        utils.hashPassword.bind(stubModel)(next);
      });

      it('sets the password if hash function succeeds', function(done) {
        var stubHash = 'ABC!@#';

        sandbox.stub(bcrypt, 'hash', function(pw, saltCount, cb) {
          cb(null, stubHash);

          next.calledOnce.should.equal(true);
          stubModel.password.should.equal(stubHash);
          done();
        });

        utils.hashPassword.bind(stubModel)(next);
      });
    });
  });

  describe('#validation:', function() {
    it('fails if username is not provided', function(done) {
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

    it('fails if password is not provided', function(done) {
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

    it('fails if email is not provided', function(done) {
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

  describe('#instance methods:', function() {
    context('#checkPassword:', function() {
      it('calls bcrypt.compareSync() with the right arguments', function() {
        var newPassword = '123abc';
        var oldPassword = 'abc123';
        var bcryptMock = sandbox.mock(bcrypt)
                                .expects('compareSync')
                                .withArgs(newPassword, oldPassword);

        var testUser = new User({
          username: 'herman',
          password: oldPassword
        });

        testUser.checkPassword(newPassword);
        bcryptMock.verify();
      });
    });
  });
});
