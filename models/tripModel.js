/*jslint node: true */
'use strict';

var mongoose = require('mongoose');
var utils = require('./tripUtils');

var tripSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, required: true },
  startDate: Date,
  endDate: Date,
  destinations: [String],
  wishlist: [String],
  plan: [String],
  visibility: { type: String, default: 'private' }
});

tripSchema.pre('validate', utils.validateFields);
tripSchema.statics.findTrips = utils.findTrips;

module.exports = mongoose.model('Trip', tripSchema);