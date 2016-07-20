/*jslint node: true, mocha: true */
'use strict';

var AWS = require('aws-sdk');
var express = require('express');
var rewire = require('rewire');
var should = require('chai').should();
var sinon = require('sinon');

var s3config = require('../../config/secrets').s3;

describe('Uploads Routes', function() {
  var sandbox;
  var router;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    sandbox.stub(express, 'Router').returns({
      get: sandbox.spy()
    });

    router = rewire('../../routes/v1/uploads');
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('findValidParams()', function() {
    var findValidParams;

    beforeEach(function() {
      findValidParams = router.__get__('findValidParams');
    });

    it('generates a random key', function(done) {
      var cb = function(params) {
        getObject.callCount.should.equal(1);
        (typeof params).should.equal('object');
        params.Bucket.should.equal(s3config.mediaBucket);
        params.Key.length.should.equal(36);
        done();
      };

      var getObject = sandbox.stub(router.__get__('s3'), 'getObject');
      getObject.yields('key not found');

      findValidParams(cb);
    });

    it('re-generates the key if it already exists on S3', function(done) {
      var cb = function(params) {
        getObject.callCount.should.equal(2);
        params.Key.length.should.equal(36);
        done();
      };

      var getObject = sandbox.stub(router.__get__('s3'), 'getObject');
      getObject.onFirstCall().yields(null, 'key');
      getObject.onSecondCall().yields('key not found');

      findValidParams(cb);
    });
  });

  describe('#get /signedurl', function() {
    var req;
    var s3;

    beforeEach(function() {
      req = {
        query: {
          fileType: 'image/png'
        }
      };

      router.__set__('findValidParams', function(cb) {
        cb({
          Bucket: s3config.mediaBucket,
          Key: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'
        });
      });

      s3 = router.__get__('s3');
    });

    var callGet = function(res, next) {
      router.get.firstCall.args[2](req, res, next);
    };

    it('registers a URI for GET: /signedurl', function() {
      router.get.calledWith('/signedurl', sandbox.match.any).should.equal(true);
    });

    it('queries S3 for a signed URL given the right params', function(done) {
      sandbox.stub(s3, 'getSignedUrl', function(op, params, cb) {
        op.should.equal('putObject');
        Object.keys(params).length.should.equal(4);
        params.ContentType.should.equal(req.query.fileType);
        done();
      });

      callGet();
    });

    it('sends the signed URL back in response', function(done) {
      var stubUrl = 'http://fakeamazonlink.com';
      var stubResponseJSON = {
        url: stubUrl
      };

      var stubResponse = function(expectedResponse) {
        return {
          json: function(obj) {
            obj.should.eql(expectedResponse);
            done();
          }
        };
      };

      sandbox.stub(s3, 'getSignedUrl').yields(null, stubUrl);
      callGet(stubResponse(stubResponseJSON));
    });

    it('returns an error if the S3 call fails', function(done) {
      var stubError = 's3 error';
      var next = function(err) {
        err.should.equal(stubError);
        done();
      };

      sandbox.stub(s3, 'getSignedUrl').yields(stubError);
      callGet(null, next);
    });
  });
});
