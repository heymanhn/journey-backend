/*jslint node: true, mocha: true */
'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var express = require('express');
var rewire = require('rewire');
var should = chai.should(); // jshint ignore:line
var sinon = require('sinon');

require('sinon-as-promised');
chai.use(chaiAsPromised);

var s3config = require('../../config/s3');

describe('Uploads Routes', function() {
  var sandbox;
  var router;
  var s3;
  var params;

  beforeEach(function() {
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

  afterEach(function() {
    sandbox.restore();
  });

  describe('#get /signedurls', function() {
    var req = { query: {} };
    var callGet = function(res, next) {
      router.get.firstCall.args[2](req, res, next);
    };

    var stubRes = function(expectedResponse, done) {
      return {
        json: function(obj) {
          obj.should.eql(expectedResponse);
          done();
        }
      };
    };

    it('registers a URI for GET: /signedurls', function() {
      router.get.calledWith('/signedurls', sandbox.match.any)
            .should.equal(true);
    });

    context('#generateRequests():', function() {
      var generateRequests;

      beforeEach(function() {
        generateRequests = router.__get__('generateRequests');
      });

      it('generates multiple URLs if requested', function() {
        var stubUrl = Promise.resolve('http://url1.com');
        var stubUrls = Array(3).fill(stubUrl);

        router.__set__('findValidParams', function() {
          return Promise.resolve();
        });
        router.__set__('getSignedUrl', function() {
          return stubUrl;
        });

        generateRequests(stubUrls.length).should.eql(stubUrls);
      });
    });

    context('#findValidParams():', function() {
      var findValidParams;

      var generateNoSuchKeyError = function() {
        var err = new Error('no such key');
        err.name = 'NoSuchKey';
        return Promise.reject(err);
      };

      beforeEach(function() {
        findValidParams = router.__get__('findValidParams');
      });

      it('generates a random key', function() {
        router.__set__('guid', function() { return params.Key; });
        sandbox.stub(s3, 'getObject').returns({
          promise: function() { return generateNoSuchKeyError(); }
        });

        findValidParams().should.eventually.eql(params);
      });

      it('re-generates the key if it already exists on S3', function(done) {
        var getObject = sandbox.stub(s3, 'getObject');
        getObject.onFirstCall().returns({
          promise: function() { return Promise.resolve(); }
        });
        getObject.onSecondCall().returns({
          promise: function() { return generateNoSuchKeyError(); }
        });

        var cb = function() {
          getObject.callCount.should.equal(2);
          done();
        };

        findValidParams().then(cb);
      });

      it('returns an error if s3.getObject() fails with an error other than ' +
        'NoSuchKey', function() {
        var stubError = new Error('getObject() error');
        sandbox.stub(s3, 'getObject').returns({
          promise: function() { return Promise.reject(stubError); }
        });

        findValidParams().should.eventually.be.rejectedWith(stubError);
      });
    });

    context('#getSignedUrl():', function() {
      var getSignedUrl;

      beforeEach(function() {
        getSignedUrl = router.__get__('getSignedUrl');
      });

      it('queries S3 for a signed URL given the right params', function() {
        var stubURL = 'http://www.stubURL.com';

        sandbox.stub(s3, 'getSignedUrl').returns(stubURL);
        getSignedUrl(params).should.eventually.equal(stubURL);
      });
    });

    it('returns the signed URL in response', function(done) {
      var stubUrl = 'http://www.stubURL.com';
      var stubResponseJSON = {
        urls: [stubUrl]
      };

      router.__set__('generateRequests', function() {
        return [Promise.resolve(stubUrl)];
      });

      callGet(stubRes(stubResponseJSON, done));
    });

    it('returns multiple signed URLs when requested', function(done) {
      var stubUrl = 'http://www.stubURL.com';
      var createArray = function(obj) {
        return Array(5).fill(0).map(function() {
          return obj;
        });
      };
      var stubResponseJSON = {
        urls: createArray(stubUrl)
      };
      req.query.urls = 5;

      router.__set__('generateRequests', function() {
        return createArray(Promise.resolve(stubUrl));
      });

      callGet(stubRes(stubResponseJSON, done));
    });

    it('returns an error if one function in the chain fails', function(done) {
      var stubError = '/signedurls error';
      var next = function(err) {
        err.should.eql(stubError);
        done();
      };

      router.__set__('generateRequests', function() {
        return [Promise.reject(stubError)];
      });

      callGet(null, next);
    });
  });
});
