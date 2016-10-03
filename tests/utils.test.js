'use strict';

const passport = require('passport');
const should = require('chai').should();
const sinon = require('sinon');

const { checkLoginParams, ensureAuth } = require('app/utils/auth');
const { isCurrentUser, validateSignupFields } = require('app/utils/users');
const User = require('app/models/userModel');

describe('Routes Middleware', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#auth middleware', () => {
    context('#ensureAuth:', () => {
      let req = {};

      it('sets req.user if the current session is authenticated',
        (done) => {
        const stubUser = {
          name: 'Stub User'
        };

        const next = () => {
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

      it('returns an error if passport auth fails', (done) => {
        const stubError = 'Passport authentication error';
        const next = function(err) {
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

      it('returns an error if the user is not authorized', (done) => {
        const stubError = new Error('Not Authorized');
        stubError.status = 401;

        const next = function(err) {
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

    context('#checkLoginParams:', () => {
      let req;

      beforeEach(() => {
        req = {
          body: {
            username: 'amy',
            email: 'amy@journey.com',
            password: 'abc123'
          }
        };
      });

      it('proceeds if request has a username and password', (done) => {
        delete req.body.email;

        const next = () => {
          should.exist(req.body.username);
          should.exist(req.body.password);
          done();
        };

        checkLoginParams(req, null, next);
      });

      it('proceeds if the request has an email and password', (done) => {
        delete req.body.username;

        const next = () => {
          should.exist(req.body.email);
          should.exist(req.body.password);
          done();
        };

        checkLoginParams(req, null, next);
      });

      it('sets login type in the request before proceeding', (done) => {
        delete req.body.email;

        const next = () => {
          req.loginType.should.equal('username');
          done();
        };

        checkLoginParams(req, null, next);
      });

      it('returns an error if the password is not provided', (done) => {
        delete req.body.email;
        delete req.body.password;

        const stubError = new Error('Password not provided');
        const next = function(err) {
          err.should.eql(stubError);
          done();
        };

        checkLoginParams(req, null, next);
      });

      it('returns an error if username/email is not provided', (done) => {
        delete req.body.username;
        delete req.body.email;

        const stubError = new Error('Username or email not provided');
        const next = function(err) {
          err.should.eql(stubError);
          done();
        };

        checkLoginParams(req, null, next);
      });
    });
  });

  describe('users middleware', () => {
    context('#isCurrentUser:', () => {
      const req = {
        params: {
          userId: 'a1b2c3d4'
        },
        user: {
          id: 'a1b2c3d4'
        }
      };

      it('moves on if the desired user matches the current user', () => {
        const next = sandbox.spy();
        isCurrentUser(req, null, next);
        next.calledOnce.should.equal(true);
      });

      it('returns an error if the desired user doesn\'t match', () => {
        req.params.userId = 'a1b2c3d4e5';
        const next = sandbox.spy();
        const stubError = new Error('Cannot perform this action on another user');
        stubError.status = 403;

        isCurrentUser(req, null, next);
        next.calledWith(stubError).should.equal(true);
      });

      it('returns an error if the userId param doesn\'t exist', () => {
        req.params = {};
        const next = sandbox.spy();
        const stubError = new Error('No user ID provided');
        stubError.status = 400;

        isCurrentUser(req, null, next);
        next.calledWith(stubError).should.equal(true);
      });
    });

    context('#validateSignupFields:', () => {
      const req = {
        body: {
          email: 'amy@abc.com',
          password: 'abc123'
        }
      };

      it('moves on if all the required fields are present', () => {
        const next = sandbox.spy();

        validateSignupFields(req, null, next);
        next.calledOnce.should.equal(true);
      })

      it('returns an error if any required fields are missing', () => {
        delete req.body.email;

        const next = sandbox.spy();
        const stubError = new Error('Params missing: email');

        validateSignupFields(req, null, next);
        next.calledWith(stubError).should.equal(true);
      });
    });
  });
});
