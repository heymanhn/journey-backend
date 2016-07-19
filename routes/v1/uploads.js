/*jslint node: true */
'use strict';

var AWS = require('aws-sdk');
var express = require('express');

var ensureAuth = require('../../utils/auth').ensureAuth;
var s3config = require('../../config/secrets').s3;

var app = express.Router();
AWS.config.update({region: 'us-west-1'});
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
  findValidParams(function(params) {
    params.ContentType = req.query.fileType;
    params.ACL = 'public-read';

    s3.getSignedUrl('putObject', params, function(err, url) {
      if (err) {
        return next(err);
      }

      if (!url) {
        return next(new Error('Error uploading file'));
      }

      res.json({
        url: url
      });
    });
  });
});

function findValidParams(cb) {
  var params = {
    Bucket: s3config.mediaBucket,
    Key: guid()
  };

  var processResponse = function(err, data) {
    if (err) {
      return cb(params);
    } else {
      params.Key = guid();
      s3.getObject(params, processResponse);
    }
  };

  s3.getObject(params, processResponse);
}

// Borrowed from Stack Overflow
function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

module.exports = app;
