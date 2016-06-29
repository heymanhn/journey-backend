var express = require('express');

var ensureAuth = require('../utils/auth').ensureAuth;
var Entry = require('../models/entryModel');
var app = express.Router();

/*
 * POST /entries/
 *
 * - Creator (current user)
 * - Type (text for now)
 * - Contents (string)
 */
app.post('/', ensureAuth, function(req, res, next) {
  var type = req.body.type;
  var contents = req.body.contents;
  var creator = req.user._id;

  if (!type || !contents) {
    return res.status(400).send("Missing some parameters.");
  }

  var entry = new Entry({
    creator: creator,
    type: type,
    contents: contents
  });

  entry.save(function(err) {
    if (err) {
      return next(err);
    }

    res.redirect('/users/' + req.user.id + '/entries');
  });
});

/*
 * DELETE /entries/:entryId
 *
 * Removes an entry, first confirming that the entry was created by the
 * current user
 */
app.delete('/:entryId', ensureAuth, function(req, res, next) {
  var user = req.userDoc;

  Entry.findOne({ '_id': req.params.entryId }, function(err, entry) {
    if (err) {
      console.log(err);
      next(err);
    }

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found.'
      });
    } else {
      entry.remove(function(err, entry) {
        if (err) {
          console.log(err);
          next(err);
        }

        res.status(200).json({
          success: true,
          message: 'Entry deleted.'
        });
      })
    }
  });
});

module.exports = app;
