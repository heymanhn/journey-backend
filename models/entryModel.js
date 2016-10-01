'use strict';

const mongoose = require('mongoose');
const utils = require('./entryUtils');

const entrySchema = new mongoose.Schema({
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
