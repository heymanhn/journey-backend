/*jslint node: true */
'use strict';

var express = require('express');
var ensureAuth = require('../../utils/auth').ensureAuth;
var Entry = require('../../models/entryModel');
var app = express.Router();

/*
 * POST /entries/
 *
 * - Creator (current user)
 * - Type (text for now)
 * - Contents (string)
 * - Location (Optional: lat, lng)
 */
app.post('/', ensureAuth, function(req, res, next) {
  var params = {
    creator: req.user._id,
    type: req.body.type,
    contents: req.body.contents
  };

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
 * current user
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

    entry.remove(function(err) {
      if (err) {
        return next(err);
      }

      res.json({
        message: 'Entry deleted.'
      });
    });
  });
});

module.exports = app;
