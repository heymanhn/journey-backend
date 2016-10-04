'use strict';

const passport = require('passport');
const should = require('chai').should();
const sinon = require('sinon');

const {
  checkAuthStatus,
  checkGuestStatus,
  checkLoginParams
} = require('app/utils/auth');
const {
  isCurrentUser,
  isValidUser,
  validateSignupFields
} = require('app/utils/users');
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
    context('#checkAuthStatus:', () => {
      let req;

      beforeEach(() => {
        req = { get() { return true; } };
      });

      it('sets req.user if the current session is authenticated', (done) => {
        const stubUser = {
          name: 'Stub User'
        };

        const next = () => {
          req.user.should.eql(stubUser);
          done();
        };

        sandbox.stub(passport, 'authenticate', (strategy, cb) => {
          strategy.should.equal('jwt');
          return (req, res, next) => {
            cb(null, stubUser);
          };
        });

        checkAuthStatus(req, null, next);
      });

      it('continues if no Authorization header is present', (done) => {
        req.get = () => false;
        const next = () => {
          should.not.exist(req.user);
          done();
        }

        checkAuthStatus(req, null, next);
      });

      it('returns an error if passport auth fails', (done) => {
        const stubError = 'Passport authentication error';
        const next = (err) => {
          err.should.equal(stubError);
          done();
        };

        sandbox.stub(passport, 'authenticate', function(strategy, cb) {
          return function(req, res, next) {
            cb(stubError);
          };
        });

        checkAuthStatus(req, null, next);
      });

      it('returns an error if the user is not authorized', (done) => {
        const stubError = new Error('Not Authorized');
        stubError.status = 401;

        const next = (err) => {
          err.should.eql(stubError);
          done();
        };

        sandbox.stub(passport, 'authenticate', (strategy, cb) => {
          return (req, res, next) => { cb(); };
        });

        checkAuthStatus(req, null, next);
      });
    });

    context('#checkGuestStatus:', () => {
      let req;
      const validGuid = '1aceb939-3622-4281-8a87-8f369fdda654';

      beforeEach(() => {
        req = { get: () => validGuid };
      });

      it('continues if req.user is already set', (done) => {
        const stubUser = "Hello";
        req.user = stubUser;
        const next = () => {
          req.user.should.eql(stubUser);
          done();
        };

        checkGuestStatus(req, null, next);
      });

      it('continues and sets anonymousID if valid', (done) => {
        const next = () => {
          req.anonymousId.should.equal(validGuid);
          done();
        }
        checkGuestStatus(req, null, next);
      });

      it('allows capitalized letters in GUID', (done) => {
        const capsGUID = '1ACEB939-3622-4281-8A87-8f369fdda654';
        req.get = () => capsGUID;
        const next = () => {
          req.anonymousId.should.equal(capsGUID);
          done();
        }
        checkGuestStatus(req, null, next);
      });

      it('returns error if neither req.user nor anonymousId is set', (done) => {
        const stubError = new Error('Missing AnonymousId in headers');
        req.get = () => false;

        const next = (err) => {
          err.should.eql(stubError);
          done();
        };

        checkGuestStatus(req, null, next);
      });

      it('returns error if anonymousId has wrong format', (done) => {
        const invalidGuid = '1aeb939-3622-4281-8a87-8f369fdda64';
        const stubError = new Error('AnonymousId has invalid format');
        req.get = () => invalidGuid;

        const next = (err) => {
          err.should.eql(stubError);
          done();
        };

        checkGuestStatus(req, null, next);
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
      let next, req;

      beforeEach(() => {
        next = sandbox.spy();
        req = {
          params: {
            userId: 'a1b2c3d4'
          },
          user: {
            id: 'a1b2c3d4'
          }
        };
      });

      it('moves on if the desired user matches the current user', () => {
        isCurrentUser(req, null, next);
        next.calledOnce.should.equal(true);
      });

      it('returns an error if the desired user doesn\'t match', () => {
        req.params.userId = 'a1b2c3d4e5';
        const stubError = new Error('Can\'t perform action on another user');
        stubError.status = 403;

        isCurrentUser(req, null, next);
        next.calledWith(stubError).should.equal(true);
      });

      it('returns an error if the userId param doesn\'t exist', () => {
        req.params = {};
        const stubError = new Error('No user ID provided');
        stubError.status = 400;

        isCurrentUser(req, null, next);
        next.calledWith(stubError).should.equal(true);
      });

      it('returns an error if no user object is provided', () => {
        delete req.user;

        const stubError = new Error('Not Authorized');
        stubError.status = 401;

        isCurrentUser(req, null, next);
        next.calledWith(stubError).should.equal(true);
      });
    });

    context('#isValidUser:', () => {
      let next, req;

      beforeEach(() => {
        next = sandbox.spy();
        req = {
          user: {
            id: 'a1b2c3d4'
          }
        };
      });

      it('continues if user object exists', () => {
        isValidUser(req, null, next);
        next.calledOnce.should.equal(true);
      });

      it('returns an error if no user object exists', () => {
        delete req.user;
        const stubError = new Error('Not Authorized');
        stubError.status = 401;

        isValidUser(req, null, next);
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
