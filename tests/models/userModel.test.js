/*jslint node: true, mocha: true */
'use strict';

var should = require('chai').should();
var User = require('../../models/userModel');
var utils = require('./utils');

describe('User Model', function() {
  before(utils.connect);

  describe('#create:', function() {
    it('should create a new User with the right fields', function(done) {
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

    context('If missing required fields:', function() {
      it('should fail if "username" is not provided', function(done) {
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

      it('should fail if "password" is not provided', function(done) {
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

      it('should fail if "email" is not provided', function(done) {
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
});
