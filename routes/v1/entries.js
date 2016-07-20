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
  entry.save(function(err) {
    if (err) {
      return next(err);
    }

    res.redirect('/v1/users/' + entry.creator + '/entries');
  });
});

/*
 * DELETE /entries/:entryId
 *
 * Removes an entry, first confirming that the entry was created by the
 * current user. The contents are also deleted from S3 if they exist.
 *
 */
app.delete('/:entryId', ensureAuth, function(req, res, next) {
  Entry.findOne({
    '_id': req.params.entryId,
    'creator': req.user._id
  }, function(err, entry) {
    if (err) {
      return next(err);
    }

    if (!entry) {
      err = new Error('Entry not found');
      err.status = 404;
      return next(err);
    }

    if ((typeof entry.contents) === 'string') {
      var params = {
        Bucket: s3config.mediaBucket,
        Key: entry.contents.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/)[0]
      };

      s3.deleteObject(params, function(err, data) {
        if (err) {
          return next(err);
        }

        removeEntry();
      });
    } else {
      removeEntry();
    }

    function removeEntry() {
      entry.remove(function(err) {
        if (err) {
          return next(err);
        }

        res.json({
          message: 'Entry deleted.'
        });
      });
    }
  });
});

module.exports = app;
