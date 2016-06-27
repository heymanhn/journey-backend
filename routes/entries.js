var express = require('express');
var mongoose = require('mongoose');
var Entry = require('../models/entryModel');

var app = express.Router();
mongoose.connect('mongodb://localhost:27017/journey');

app.get('/', function(req, res, next) {
  Entry.find(function(err, entries) {
    if (err) {
      return next(err);
    }

    res.status(200).json({ entries: entries });
  });
});

app.post('/', function(req, res, next) {
  var type = req.body.type;
  var contents = req.body.contents;

  if (!type || !contents) {
    return res.status(400).send("Missing some parameters.");
  }

  var entry = new Entry({
    type: type,
    contents: contents
  });

  entry.save(function(err) {
    if (err) {
      return next(err);
    }

    res.redirect('/entries');
  });
});

module.exports = app;
