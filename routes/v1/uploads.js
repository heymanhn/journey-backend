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
 * GET /uploads/signedurl
 *
 * Returns a signed URL from Amazon S3 that the caller can use to upload media
 * using a PUT request. Once the file is uploaded, anyone with access to the
 * URL can view the file.
 *
 * The caller will need to specify the URL for any image or video uploaded in
 * the POST request for adding a new entry.
 *
 */
app.get('/signedurl', ensureAuth, function(req, res, next) {
  findValidParams()
    .then(getSignedUrl.bind(null, req.query.fileType))
    .then(function(url) {
      res.json({
        url: url
      });
    })
    .catch(next);
});

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
      debugger;
      if (err.name === 'NoSuchKey') {
        return Promise.resolve(params);
      } else {
        return Promise.reject(err);
      }
    });
}

function getSignedUrl(fileType, params) {
  params.ContentType = fileType;
  params.ACL = 'public-read';

  return s3.getSignedUrl('putObject', params);
}

// Borrowed from Stack Overflow
function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

module.exports = app;
