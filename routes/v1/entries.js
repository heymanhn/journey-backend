'use strict';

const AWS = require('aws-sdk');
const app = require('express').Router();

const ensureAuth = require('../../utils/auth').ensureAuth;
const Entry = require('../../models/entryModel');
const s3config = require('../../config/s3');

AWS.config.update({region: s3config.region });
const s3 = new AWS.S3();

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
app.post('/', ensureAuth, (req, res, next) => {
  const { contents, loc, message } = req.body;

  let params = {
    creator: req.user._id,
    type: req.body.type
  };

  if (message) {
    params.message = message;
  }
  if (contents) {
    params.contents = contents;
  }
  if (loc) {
    params.loc = loc;
  }

  const entry = new Entry(params);
  entry.save((err) => {
    if (err) {
      return next(err);
    }

    res.redirect(`/v1/users/${params.creator}/entries`);
  });
});

/*
 * GET /entries/:entryId
 *
 * Fetches details for a specific entry created by the currently authenticated
 * user.
 *
 */
app.get('/:entryId', ensureAuth, (req, res, next) => {
  findEntry(req.params.entryId, req.user._id)
    .then((entry) => res.json({ entry }))
    .catch(next);
});

/*
 * DELETE /entries/:entryId
 *
 * Removes an entry, first confirming that the entry was created by the
 * current user. The contents are also deleted from S3 if they exist.
 *
 */
app.delete('/:entryId', ensureAuth, (req, res, next) => {
  findEntry(req.params.entryId, req.user._id)
    .then(deleteS3Contents)
    .then(removeEntry)
    .then(() => res.json({ message: 'Entry deleted.' }))
    .catch(next);
});

function findEntry(entryId, userId) {
  const params = {
    _id: entryId,
    creator: userId
  };

  return Entry
    .findOne(params).exec()
    .then((entry) => {
      if (!entry) {
        let err = new Error('Entry not found');
        err.status = 404;
        return Promise.reject(err);
      }

      return entry;
    });
}

function deleteS3Contents(entry) {
  const { contents } = entry;
  if (!contents) {
    return entry;
  } else {
    let urls;
    switch (typeof contents) {
      case 'object':
        urls = contents;
        break;
      case 'string':
        urls = [contents];
        break;
      default:
        return Promise.reject(new Error('Entry has invalid contents'));
    }

    urls = urls.map((value) => {
      return s3.deleteObject({
        Bucket: s3config.mediaBucket,
        Key: value.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/)[0]
      }).promise();
    });

    return Promise.all(urls).then(() => entry);
  }
}

function removeEntry(entry) {
  return entry.remove();
}

module.exports = app;
