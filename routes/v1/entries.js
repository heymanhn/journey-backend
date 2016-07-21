/*jslint node: true */
'use strict';

var AWS = require('aws-sdk');
var express = require('express');

var ensureAuth = require('../../utils/auth').ensureAuth;
var Entry = require('../../models/entryModel');
var s3config = require('../../config/secrets').s3;

var app = express.Router();
AWS.config.update({region: s3config.region });
var s3 = new AWS.S3();

/*
 * POST /entries/
 *
 * - Creator (current user)
 * - Type (text, photo, video)
 * - Contents (Optional: multiple types)
 * - Message (Optional: string)
 * - Location (Optional: lat, lng)
 */
app.post('/', ensureAuth, function(req, res, next) {
  var params = {
    creator: req.user._id,
    type: req.body.type,
  };

  if (req.body.message) {
    params.message = req.body.message;
  }
  if (req.body.contents) {
    params.contents = req.body.contents;
  }
  if (req.body.loc) {
    params.loc = req.body.loc;
  }

  var entry = new Entry(params);
  entry
    .save()
    .then(function() {
      res.redirect('/v1/users/' + params.creator + '/entries');
    })
    .catch(next);
});

/*
 * DELETE /entries/:entryId
 *
 * Removes an entry, first confirming that the entry was created by the
 * current user. The contents are also deleted from S3 if they exist.
 *
 */
app.delete('/:entryId', ensureAuth, function(req, res, next) {
  var params = {
    _id: req.params.entryId,
    creator: req.user._id
  };

  Entry
    .findOne(params).exec()
    .then(deleteS3Contents)
    .then(removeEntry)
    .then(function() {
      res.json({
        message: 'Entry deleted.'
      });
    }).catch(next);
});

function deleteS3Contents(entry) {
  if (!entry) {
    var err = new Error('Entry not found');
    err.status = 404;
    return Promise.reject(err);
  }

  if (entry.contents && (typeof entry.contents) === 'string') {
    return s3.deleteObject({
      Bucket: s3config.mediaBucket,
      Key: entry.contents.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/)[0]
    }).promise().then(function() { return entry; });
  } else {
    return Promise.resolve(entry);
  }
}

function removeEntry(entry) {
  return entry.remove();
}

module.exports = app;
