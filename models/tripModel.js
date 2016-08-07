/*jslint node: true */
'use strict';

var mongoose = require('mongoose');
var utils = require('./tripUtils');

var ideaSchema = new mongoose.Schema({
  googlePlaceId: { type: String, required: true },
  date: { type: Date, default: Date.now },
  name: { type: String, required: true },
  loc: {
    type: { type: String, required: true },
    coordinates: { type: [Number], required: true }
  },
  address: String,
  phone: String,
  types: [String],
  photo: String,
  url: String,
  comment: String
});

var destinationSchema = new mongoose.Schema({
  googlePlaceId: { type: String, required: true },
  name: { type: String, required: true },
  loc: {
    type: { type: String, required: true },
    coordinates: { type: [Number], required: true }
  },
  types: [String]
});

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
  destinations: [destinationSchema],
  ideas: [ideaSchema],
  plan: [String],
  visibility: { type: String, default: 'private' }
});

tripSchema.pre('validate', utils.validateFields);
tripSchema.statics.findTrips = utils.findTrips;

module.exports = mongoose.model('Trip', tripSchema);
