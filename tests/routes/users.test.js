'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const express = require('express');
const jwt = require('jsonwebtoken');
const rewire = require('rewire');
const should = chai.should(); // jshint ignore:line
const sinon = require('sinon');

require('sinon-as-promised');
require('mongoose').Promise = Promise;
chai.use(chaiAsPromised);

const analytics = require('app/utils/analytics');
const database = require('app/config/database');
const Entry = require('app/models/entryModel');
const User = require('app/models/userModel');

describe('User Routes', () => {
  let generateJWT, router, sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    sandbox.stub(express, 'Router').returns({
      get: sandbox.spy(),
      post: sandbox.spy(),
      put: sandbox.spy(),
      delete: sandbox.spy()
    });

    router = rewire('app/routes/v1/users');
    generateJWT = router.__get__('generateJWT');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#post /', () => {
    let req;
    let stubUser;

    function callPost(res, next) {
      router.post.firstCall.args[2](req, res, next);
    }

    beforeEach(() => {
      req = {
        body: {
          username: 'amy',
          password: 'abc123',
          email: 'amy@journey.com',
          name: 'Amy Doe'
        },
        token: 'abcdefg'
      };

      stubUser = { _doc: { username: 'amy' } };
    });

    it('registers a URI for POST: /', () => {
      router.post.calledWith('/', sandbox.match.any).should.equal(true);
    });

    it('creates the user if all required fields are provided', (done) => {
      sandbox.stub(User.prototype, 'save', function() {
        this._doc.username.should.equal(req.body.username);
        this._doc.email.should.equal(req.body.email);
        this._doc.name.should.equal(req.body.name);
        done();
      });

      router.__set__('generateJWT', () => Promise.resolve());
      callPost();
    });

    it('sends the user and token in response', (done) => {
      const expectedResponse = {
        message: 'User created successfully.',
        user: stubUser._doc,
        token: 'JWT ' + req.token
      };

      const res = {
        json: (obj) => {
          obj.should.eql(expectedResponse);
          done();
        }
      };

      sandbox.stub(User.prototype, 'save').yields();
      router.__set__('generateJWT', () => Promise.resolve());
      router.__set__('identifySignup', () => Promise.resolve());
      router.__set__('trackSignup', () => Promise.resolve(stubUser));

      callPost(res);
    });

    it('returns an error if something in the chain fails', (done) => {
      const stubError = new Error('some error');
      function next(err) {
        err.should.eql(stubError);
        done();
      }

      router.__set__('generateJWT', () => Promise.reject(stubError));
      callPost(null, next);
    });

    context('#generateJWT:', () => {
      it('generates a JSON web token and sends in response', () => {
        const stubReq = {};
        const stubToken = 'abcdefg';
        const expectedReq = { token: stubToken, user: stubUser };

        sandbox.stub(jwt, 'sign').returns(stubToken);
        generateJWT(stubReq, stubUser);
        stubReq.should.eql(expectedReq);
      });

      it('returns an error if JWT creation fails', () => {
        const stubError = new Error('Error generating authentication token');
        sandbox.stub(jwt, 'sign').returns(null);

        generateJWT(null, stubUser).should.be.rejected
          .and.eventually.eql(stubError);
      });
    });
  });

  describe('#get /:userId', () => {
    let req;

    const callGet = function(res, next) {
      router.get.firstCall.args[2](req, res, next);
    };

    beforeEach(() => {
      req = {
        user: {
          _doc: {
            username: 'herman',
            email: 'herman@journey.com'
          }
        }
      };
    });

    it('registers a URI for GET: /:userId', () => {
      router.get.firstCall.calledWith('/:userId', sandbox.match.any)
            .should.equal(true);
    });

    it('returns the current authenticated user object', (done) => {
      const expectedResponse = { user: req.user._doc };
      const res = {
        json(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };
      sandbox.stub(analytics, 'track').returns();
      callGet(res);
    });
  });

  describe('#put /:userId', () => {
    let req;

    const callPut = function(res, next) {
      router.put.firstCall.args[2](req, res, next);
    };

    beforeEach(() => {
      req = {
        body: {
          email: 'amy.doe@journey.com',
          name: 'Amy Doe'
        },
        user: {
          username: 'amy',
          password: 'hashedabc123',
          email: 'amy@journey.com',
          name: 'Amy Doe'
        }
      };
    });

    it('registers a URI for PUT: /:userId', () => {
      router.put.firstCall.calledWith('/:userId', sandbox.match.any)
            .should.equal(true);
    });

    it('does not change the password if it matches existing hashed password',
      (done) => {
      const stubError = new Error('fake error');
      req.body.password = 'abc123';

      req.user.checkPassword = (pw) => {
        pw.should.equal(req.body.password);
        return true;
      };
      req.user.save = function() {
        this.password.should.not.equal(req.body.password);
        return Promise.reject(stubError);
      };

      const next = (err) => done();
      callPut(null, next);
    });

    it('only updates fields that have changed', (done) => {
      const stubError = new Error('fake error');
      const oldEmail = req.user.email;
      req.user.save = function() {
        this.email.should.not.equal(oldEmail);
        return Promise.reject(stubError);
      };

      const next = (err) => done();
      callPut(null, next);
    });

    it('updates the user and sends object in response', (done) => {
      const stubUser = {
        _doc: {
          username: 'amy',
          email: 'amy@journey.com',
          name: 'Amy Doe'
        }
      };
      const expectedResponse = {
        message: 'User updated successfully.',
        user: stubUser._doc
      };
      const res = {
        json(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };

      req.user.save = () => Promise.resolve();
      router.__set__('identifyUpdateUser', () => Promise.resolve());
      router.__set__('trackUpdateUser', () => Promise.resolve(stubUser));

      callPut(res);
    });

    it('returns an error if the update operation fails', (done) => {
      const stubError = 'Update error';
      const next = function(err) {
        err.should.equal(stubError);
        done();
      };
      req.user.save = () => {
        return Promise.reject(stubError);
      };

      callPut(null, next);
    });
  });

  describe('#delete /', () => {
    let req = {};
    const callDelete = function(res, next) {
      router.delete.firstCall.args[2](req, res, next);
    };

    it('registers a URI for DELETE: /:userId', () => {
      router.delete.firstCall.calledWith('/:userId', sandbox.match.any)
            .should.equal(true);
    });

    it('calls user.remove() and sends response to user', (done) => {
      const expectedResponse = { message: 'User deleted.' };
      const res = {
        json(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };
      req.user = { remove() { return Promise.resolve(); } };
      router.__set__('trackDeleteUser', () => Promise.resolve());

      callDelete(res);
    });

    it('returns an error if the model\'s remove method fails', (done) => {
      const stubError = 'Remove error';
      const next = (err) => {
        err.should.equal(stubError);
        done();
      };

      req.user = { remove(cb) { return Promise.reject(stubError); } };
      callDelete(null, next);
    });
  });

  describe('#get /:userId/entries', () => {
    const req = {
      params: {
        userId: 'a1b2c3d4'
      },

      query: {}
    };
    const callGet = function(res, next) {
      router.get.thirdCall.args[2](req, res, next);
    };

    it('registers a URI for GET: /:userId/entries', () => {
      router.get
            .thirdCall
            .calledWith('/:userId/entries', sandbox.match.any)
            .should.equal(true);
    });

    it('looks for entries by the current user', (done) => {
      sandbox.stub(Entry, 'findEntries', function(params, count, page) {
        params.creator.should.equal(req.params.userId);
        count.should.equal(database.DEFAULT_ENTRY_COUNT);
        page.should.equal(1);

        return {
          then: () => { return { catch: () => { done(); } }; }
        };
      });

      callGet();
    });

    it('uses additional query parameters if provided', (done) => {
      req.query = {
        page: '1',
        count: '5',
        maxDate: '2016-07-22'
      };

      sandbox.stub(Entry, 'findEntries', function(params, count, page) {
        params.date.should.eql({ $lt: new Date(req.query.maxDate) });
        count.should.equal(Number(req.query.count));
        page.should.equal(Number(req.query.page));

        return {
          then: () => { return { catch: () => { done(); } }; }
        };
      });

      callGet();
    });

    it('returns a list of entries in the response', (done) => {
      const stubEntries = ['Entry 1', 'Entry 2', 'Entry 3'];
      const expectedResponse = {
        page: 1,
        results: 3,
        entries: stubEntries,
      };
      const res = {
        json: function(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };

      sandbox.stub(Entry, 'findEntries').returns(Promise.resolve(stubEntries));
      callGet(res);
    });

    it('returns an error if no entries are found', (done) => {
      const stubError = new Error('No entries found');
      stubError.status = 404;

      const next = function(err) {
        err.should.eql(stubError);
        done();
      };

      sandbox.stub(Entry, 'findEntries').returns(Promise.resolve([]));
      callGet(null, next);
    });

    it('returns an error if Entry.findEntries() fails', (done) => {
      const stubError = 'Find error';
      const next = function(err) {
        err.should.equal(stubError);
        done();
      };

      sandbox.stub(Entry, 'findEntries').returns(Promise.reject(stubError));
      callGet(null, next);
    });
  });
});
