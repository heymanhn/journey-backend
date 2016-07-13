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
 */
app.post('/', ensureAuth, function(req, res, next) {
  var entry = new Entry({
    creator: req.user._id,
    type: req.body.type,
    contents: req.body.contents
  });

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
      return res.status(404).json({
        success: false,
        message: 'Entry not found.'
      });
    }

    entry.remove(function(err) {
      if (err) {
        return next(err);
      }

      res.json({
        success: true,
        message: 'Entry deleted.'
      });
    });
  });
});

module.exports = app;
