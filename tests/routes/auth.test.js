'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const express = require('express');
const jwt = require('jsonwebtoken');
const rewire = require('rewire');
const should = chai.should(); // jshint ignore:line
const sinon = require('sinon');

require('sinon-as-promised');
chai.use(chaiAsPromised);

const User = require('../../models/userModel');

describe('Authentication Routes', () => {
  let sandbox;
  let router;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(express, 'Router').returns({ post: sandbox.spy() });
    router = rewire('../../routes/v1/auth');
  });

  afterEach(() => sandbox.restore());

  describe('#post /login', () => {
    let req, checkValidCredentials, generateJWT;

    beforeEach(() => {
      req = {
        body: {
          username: 'amy',
          password: 'abc123'
        },
        loginType: 'username'
      };

      checkValidCredentials = router.__get__('checkValidCredentials');
      generateJWT = router.__get__('generateJWT');
    });

    const callPost = (res, next) => {
      router.post.firstCall.args[2](req, res, next);
    };

    it('registers a URI for POST: /login', () => {
      router.post.calledWith('/login', sandbox.match.any).should.equal(true);
    });

    it('looks for a user based on username', (done) => {
      sandbox.stub(User, 'findOne', (opts) => {
        opts.username.should.equal(req.body.username);
        done();
        return { exec: () => Promise.resolve() };
      });

      router.__set__('checkValidCredentials', () => Promise.resolve());
      router.__set__('generateJWT', () => Promise.resolve());

      callPost();
    });

    it('looks for a user based on email', (done) => {
      delete req.body.username;
      req.body.email = 'amy@journey.com';
      req.loginType = 'email';

      sandbox.stub(User, 'findOne', (opts) => {
        opts.email.should.equal(req.body.email);
        done();
        return { exec: () => Promise.resolve() };
      });

      router.__set__('checkValidCredentials', () => Promise.resolve());
      router.__set__('generateJWT', () => Promise.resolve());

      callPost();
    });

    it('returns an error if something in the promise chain fails', (done) => {
      const stubError = new Error('some error');
      sandbox.stub(User, 'findOne', () => {
        return { exec: () => Promise.reject(stubError) };
      });

      const next = (err) => {
        err.should.eql(stubError);
        done();
      };

      return callPost(null, next);
    });

    context('#checkValidCredentials:', () => {
      it('succeeds if a user exists and password is correct', () => {
        const stubUser = { checkPassword() { return true; } };
        return checkValidCredentials(null, stubUser).should.eql(stubUser);
      });

      it('returns an error if the user doesn\'t exist', () => {
        const stubError = new Error('Invalid username or email');
        return checkValidCredentials().should.be.rejected
          .and.eventually.eql(stubError);
      });

      it('returns an error if the password is incorrect', () => {
        const stubUser = { checkPassword() { return false; }};
        const stubError = new Error('Invalid password');
        return checkValidCredentials(null, stubUser)
          .should.be.rejected.and.eventually.eql(stubError);
      });
    });

    context('#generateJWT:', () => {
      const stubUser = { _doc: { username: 'StubUser' }};

      it('creates a JWT and sends it back in response', (done) => {
        const stubToken = 'stubtoken';
        var expectedResponse = {
          user: stubUser._doc,
          token: 'JWT ' + stubToken
        };

        sandbox.stub(jwt, 'sign', (obj) => {
          obj.should.equal(stubUser._doc);
          return stubToken;
        });

        const stubRes = {
          json: (obj) => {
            obj.should.eql(expectedResponse);
            done();
          }
        };

        generateJWT(stubRes, stubUser);
      });

      it('returns an error if JWT creation fails', () => {
        const stubError = new Error('Error generating authentication token');
        sandbox.stub(jwt, 'sign').returns(null);

        generateJWT(null, stubUser).should.be.rejected
          .and.eventually.eql(stubError);
      });
    });
  });
});
