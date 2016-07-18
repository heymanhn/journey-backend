/*jslint node: true */
'use strict';

var mongoose = require('mongoose');

var entrySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: { type: String, required: true },
  contents: { type: String, required: true },
  loc: {
    type: { type: String },
    coordinates: [Number]
  }
});

module.exports = mongoose.model('Entry', entrySchema);
