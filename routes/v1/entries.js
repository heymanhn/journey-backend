/*jslint node: true */
'use strict';

var AWS = require('aws-sdk');
var express = require('express');

var ensureAuth = require('../../utils/auth').ensureAuth;
var Entry = require('../../models/entryModel');
var s3config = require('../../config/s3');

var app = express.Router();
AWS.config.update({region: s3config.region });
var s3 = new AWS.S3();

/*
 * POST /entries/
 *
 * Create a journey entry.
 *
 * - The type of the entry is required.
 * - Contents is required if the user is creating a `video`, `audio`, or
 *   `photo` entry.
 * - Message is required if the user is creating a `text` entry.
 *
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
  entry.save(function(err) {
    if (err) {
      return next(err);
    }

    res.redirect('/v1/users/' + params.creator + '/entries');
  });
});

/*
 * GET /entries/:entryId
 *
 * Fetches details for a specific entry created by the currently authenticated
 * user.
 *
 */
app.get('/:entryId', ensureAuth, function(req, res, next) {
  findEntry(req.params.entryId, req.user._id)
    .then(function(entry) {
      res.json({
        entry: entry
      });
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
  findEntry(req.params.entryId, req.user._id)
    .then(deleteS3Contents)
    .then(removeEntry)
    .then(function() {
      res.json({
        message: 'Entry deleted.'
      });
    })
    .catch(next);
});

function findEntry(entryId, userId) {
  var params = {
    _id: entryId,
    creator: userId
  };

  return Entry
    .findOne(params).exec()
    .then(function(entry) {
      if (!entry) {
        var err = new Error('Entry not found');
        err.status = 404;
        return Promise.reject(err);
      }

      return entry;
    });
}

function deleteS3Contents(entry) {
  if (!entry.contents) {
    return entry;
  } else {
    var urls;
    switch (typeof entry.contents) {
      case 'object':
        urls = entry.contents;
        break;
      case 'string':
        urls = [entry.contents];
        break;
      default:
        return Promise.reject(new Error('Entry has invalid contents'));
    }

    urls = urls.map(function(value) {
      return s3.deleteObject({
        Bucket: s3config.mediaBucket,
        Key: value.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/)[0]
      }).promise();
    });

    return Promise.all(urls).then(function() { return entry; });
  }
}

function removeEntry(entry) {
  return entry.remove();
}

module.exports = app;
