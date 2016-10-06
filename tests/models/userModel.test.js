/*jslint node: true, mocha: true */
'use strict';

const bcrypt = require('bcrypt');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const gravatar = require('gravatar');
const should = chai.should();
const sinon = require('sinon');

require('sinon-as-promised');
chai.use(chaiAsPromised);
require('mongoose').Promise = Promise;

const { defaultPic } = require('app/utils/constants').gravatar;
const testUtils = require('./utils');
const User = require('app/models/userModel');
const utils = require('app/models/userUtils');

describe('User Model', () => {
  let sandbox;
  let next;

  before(testUtils.connect);

  beforeEach((done) => {
    sandbox = sinon.sandbox.create();
    next = sandbox.spy();

    const user1 = new User({
      username: 'amy',
      email: 'amy@journey.com',
      password: 'abc123'
    }).save();

    const user2 = new User({
      username: 'alex',
      email: 'alex@journey.com',
      password: 'abc123'
    }).save();

    Promise.all([user1, user2]).then(() => done());
  });

  afterEach((done) => {
    sandbox.restore();
    User.remove({}, done);
  });

  describe('#create:', () => {
    it('creates a new User given the right fields', (done) => {
      const testUser = new User({
        username: 'herman',
        password: 'abc123',
        email: 'herman@journey.com',
        name: 'Herman Ng'
      });

      testUser.save((err, user) => {
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

  describe('#pre-save checks:', () => {
    context('#duplicate field checking:', () => {
      const field = 'foo';
      const value = 'bar';
      let stubModel;

      beforeEach(() => {
        stubModel = { isModified: () => { return true; } };
      });

      it('calls Model.count() to check if the field exists', (done) => {
        stubModel.model = () => {
          return {
            count: (opts) => {
              opts[field].should.equal(value);
              Object.keys(opts).length.should.equal(1);
              return { exec: () => { return Promise.resolve(0); } };
            }
          };
        };

        utils.fieldExistsCheck.bind(stubModel)(field, value, done);
      });

      it('fails if Model.count() returns an error', (done) => {
        const stubError = 'count() error';
        const stubNext = (err) => {
          err.should.eql(stubError);
          done();
        };

        stubModel.model = () => {
          return ({ count: () => ({ exec: () => Promise.reject(stubError)}) });
        };

        utils.fieldExistsCheck.bind(stubModel)(field, value, stubNext);
      });

      it('moves on if the field has not changed', () => {
        stubModel.isModified = () => { return false; };
        utils.fieldExistsCheck.bind(stubModel)(field, null, next);
        next.calledOnce.should.equal(true);
      });

      it('returns an error if the field exists', (done) => {
        const stubError = new Error(field + ' already exists');
        const stubNext = (err) => {
          err.should.eql(stubError);
          done();
        };

        stubModel.model = () => {
          return ({ count: () => ({ exec: () => Promise.resolve(1) }) });
        };

        utils.fieldExistsCheck.bind(stubModel)(field, value, stubNext);
      });
    });

    context('#password length check:', () => {
      it('moves on if the password is >= 6 characters', () => {
        const stubModel = { password: 'abc123' };

        utils.checkPasswordLength.bind(stubModel)(next);
        next.calledOnce.should.equal(true);
      });

      it('returns an error if password is < 6 characters', () => {
        const error = new Error('Password needs to be at least 6 characters');
        const stubModel = { password: 'a1b2' };

        utils.checkPasswordLength.bind(stubModel)(next);
        next.calledOnce.should.equal(true);
        next.calledWith(error).should.equal(true);
      });
    });

    context('#password hashing:', () => {
      let stubModel;

      beforeEach(() => {
        stubModel = {
          password: 'abc123',
          isModified: () => { return true; }
        };
      });

      it('hashes the user password before storing to db', (done) => {
        sandbox.stub(bcrypt, 'hash', (password) => {
          password.should.equal(stubModel.password);
          done();
        });

        utils.hashPassword.bind(stubModel)();
      });

      it('only pre-processes if the password has changed', () => {
        stubModel.isModified = () => { return false; };

        utils.hashPassword.bind(stubModel)(next);
        next.calledOnce.should.equal(true);
      });

      it('fails if the hash function returns an error', (done) => {
        const stubError = 'bcrypt.hash() error';
        sandbox.stub(bcrypt, 'hash', (pw, saltCount, cb) => {
          cb(stubError);
          next.calledWith(stubError).should.equal(true);
          done();
        });

        utils.hashPassword.bind(stubModel)(next);
      });

      it('sets the password if hash function succeeds', (done) => {
        const stubHash = 'ABC!@#';

        sandbox.stub(bcrypt, 'hash', (pw, saltCount, cb) => {
          cb(null, stubHash);

          next.calledOnce.should.equal(true);
          stubModel.password.should.equal(stubHash);
          done();
        });

        utils.hashPassword.bind(stubModel)(next);
      });
    });

    context('#generate gravatar:', () => {
      let stubModel;

      beforeEach(() => {
        stubModel = {
          email: 'abc@123.com',
          isModified: () => true
        };
      });

      it('generates the gravatar URL based on the email', (done) => {
        sandbox.stub(gravatar, 'url', (email, options, protocol) => {
          email.should.equal(stubModel.email);
          protocol.should.equal(true);
          done();
        });

        utils.generateGravatar.bind(stubModel)(next);
      });

      it('generates a URL with the right format', () => {
        const encodedDefaultPic = encodeURIComponent(defaultPic);
        const stubURL = 'https://s.gravatar.com/avatar/' +
          '7c99b0d72a58c0539022bdadd887f167?s=200&d=' + encodedDefaultPic;

        utils.generateGravatar.bind(stubModel)(next);
        stubModel.gravatar.should.equal(stubURL);
      });

      it('only runs if the email has changed', () => {
        stubModel.isModified = () => { return false; };

        utils.generateGravatar.bind(stubModel)(next);
        next.calledOnce.should.equal(true);
      });

      it('returns an error if gravatar url generation fails', () => {
        const stubError = new Error('Unable to create gravatar URL');
        sandbox.stub(gravatar, 'url').returns(false);

        utils.generateGravatar.bind(stubModel)(next);
        next.calledOnce.should.equal(true);
        next.calledWith(stubError).should.equal(true);
      });
    });
  });

  describe('#validation:', () => {
    it('fails if password is not provided', () => {
      const testUser = new User({
        username: 'herman',
        email: 'herman@journey.com'
      });

      testUser.validate().should.eventually.be.rejected;
    });

    it('fails if email is not provided', () => {
      const testUser = new User({
        username: 'herman',
        password: 'abc123'
      });

      testUser.validate().should.eventually.be.rejected;
    });
  });

  describe('#instance methods:', () => {
    context('#checkPassword:', () => {
      it('calls bcrypt.compareSync() with the right arguments', () => {
        const newPassword = '123abc';
        const oldPassword = 'abc123';
        const bcryptMock = sandbox.mock(bcrypt)
                                .expects('compareSync')
                                .withArgs(newPassword, oldPassword);

        const testUser = new User({
          username: 'herman',
          password: oldPassword
        });

        testUser.checkPassword(newPassword);
        bcryptMock.verify();
      });
    });
  });
});
