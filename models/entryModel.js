/*jslint node: true */
'use strict';

var mongoose = require('mongoose');
var utils = require('./entryUtils');

var entrySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: { type: String, required: true },
  contents: mongoose.Schema.Types.Mixed,
  message: String,
  loc: {
    type: { type: String },
    coordinates: [Number]
  }
});

entrySchema.pre('save', utils.validateFields);
entrySchema.statics.findEntries = utils.findEntries;

module.exports = mongoose.model('Entry', entrySchema);
