'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const express = require('express');
const rewire = require('rewire');
const should = chai.should(); // jshint ignore:line
const sinon = require('sinon');

require('sinon-as-promised');
chai.use(chaiAsPromised);

const s3config = require('../../config/s3');

describe('Uploads Routes', () => {
  let sandbox;
  let router;
  let s3;
  let params;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    sandbox.stub(express, 'Router').returns({
      get: sandbox.spy()
    });

    router = rewire('../../routes/v1/uploads');
    s3 = router.__get__('s3');

    params = {
      Bucket: s3config.mediaBucket,
      Key: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#get /signedurls', () => {
    const req = { query: {} };
    function callGet(res, next) {
      router.get.firstCall.args[2](req, res, next);
    }

    function stubRes(expectedResponse, done) {
      return {
        json(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };
    }

    it('registers a URI for GET: /signedurls', () => {
      router.get.calledWith('/signedurls', sandbox.match.any)
            .should.equal(true);
    });

    context('#generateRequests():', () => {
      let generateRequests;

      beforeEach(() => {
        generateRequests = router.__get__('generateRequests');
      });

      it('generates multiple URLs if requested', () => {
        const stubUrl = Promise.resolve('http://url1.com');
        const stubUrls = Array(3).fill(stubUrl);

        router.__set__('findValidParams', () => Promise.resolve());
        router.__set__('getSignedUrl', () => stubUrl);

        generateRequests(stubUrls.length).should.eql(stubUrls);
      });
    });

    context('#findValidParams():', () => {
      let findValidParams;

      const generateNoSuchKeyError = () => {
        const err = new Error('no such key');
        err.name = 'NoSuchKey';
        return Promise.reject(err);
      };

      beforeEach(() => {
        findValidParams = router.__get__('findValidParams');
      });

      it('generates a random key', () => {
        router.__set__('guid', () => { return params.Key; });
        sandbox.stub(s3, 'getObject').returns({
          promise: () => generateNoSuchKeyError()
        });

        findValidParams().should.eventually.eql(params);
      });

      it('re-generates the key if it already exists on S3', (done) => {
        const getObject = sandbox.stub(s3, 'getObject');
        getObject.onFirstCall().returns({
          promise: () => Promise.resolve()
        });
        getObject.onSecondCall().returns({
          promise: () => generateNoSuchKeyError()
        });

        function cb() {
          getObject.callCount.should.equal(2);
          done();
        }

        findValidParams().then(cb);
      });

      it('returns an error if s3.getObject() fails with an error other than ' +
        'NoSuchKey', () => {
        const stubError = new Error('getObject() error');
        sandbox.stub(s3, 'getObject').returns({
          promise: () => Promise.reject(stubError)
        });

        findValidParams().should.eventually.be.rejectedWith(stubError);
      });
    });

    context('#getSignedUrl():', () => {
      let getSignedUrl;

      beforeEach(() => {
        getSignedUrl = router.__get__('getSignedUrl');
      });

      it('queries S3 for a signed URL given the right params', () => {
        const stubURL = 'http://www.stubURL.com';

        sandbox.stub(s3, 'getSignedUrl').returns(stubURL);
        getSignedUrl(params).should.eventually.equal(stubURL);
      });
    });

    it('returns the signed URL in response', (done) => {
      const stubUrl = 'http://www.stubURL.com';
      const stubResponseJSON = {
        urls: [stubUrl]
      };

      router.__set__('generateRequests', () => {
        return [Promise.resolve(stubUrl)];
      });

      callGet(stubRes(stubResponseJSON, done));
    });

    it('returns multiple signed URLs when requested', (done) => {
      const stubUrl = 'http://www.stubURL.com';
      function createArray(obj) {
        return Array(5).fill(0).map(() => obj);
      }
      const stubResponseJSON = {
        urls: createArray(stubUrl)
      };
      req.query.urls = 5;

      router.__set__('generateRequests', () => {
        return createArray(Promise.resolve(stubUrl));
      });

      callGet(stubRes(stubResponseJSON, done));
    });

    it('returns an error if one function in the chain fails', (done) => {
      const stubError = '/signedurls error';
      function next(err) {
        err.should.eql(stubError);
        done();
      }

      router.__set__('generateRequests', () => [Promise.reject(stubError)]);
      callGet(null, next);
    });
  });
});
