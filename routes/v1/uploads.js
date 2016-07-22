/*jslint node: true */
'use strict';

var AWS = require('aws-sdk');
var express = require('express');

var ensureAuth = require('../../utils/auth').ensureAuth;
var s3config = require('../../config/secrets').s3;

var app = express.Router();
AWS.config.update({ region: s3config.region });
var s3 = new AWS.S3();

/*
 * GET /uploads/signedurls
 *
 * Returns a number of signed URLs from Amazon S3 that the caller can use to
 * upload media using PUT requests. Once the files are uploaded, anyone with
 * the URLs can view the files.
 *
 * The caller will need to include the URLs in the POST request for adding
 * new entries.
 *
 * If called with a query parameter "urls", the app generates and returns the
 * number of URLs specified. If the parameter is not specified, the request
 * defaults to generating 1 URL.
 *
 */
app.get('/signedurls', ensureAuth, function(req, res, next) {
  var urlCount = Number(req.query.urls) || 1;
  var requests = generateRequests(urlCount);

  return Promise.all(requests)
    .then(function(urls) {
      res.json({
        urls: urls
      });
    })
    .catch(next);
});

function generateRequests(count) {
  return Array(count)
    .fill(0)
    .map(function(value) {
      return findValidParams().then(getSignedUrl);
    });
}

function findValidParams() {
  var params = {
    Bucket: s3config.mediaBucket,
    Key: guid()
  };

  /* s3.getObject() returns an error if an object with the generated key
   * doesn't exist, and a valid object otherwise. Hence we need to flip the
   * logic of the promise handling below.
   */
  return s3.getObject(params).promise()
    .then(findValidParams)
    .catch(function(err) {
      if (err.name === 'NoSuchKey') {
        return Promise.resolve(params);
      } else {
        return Promise.reject(err);
      }
    });
}

function getSignedUrl(params) {
  params.ACL = 'public-read';

  return Promise.resolve(s3.getSignedUrl('putObject', params));
}

// Borrowed from Stack Overflow
function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

module.exports = app;
