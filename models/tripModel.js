/*jslint node: true */
'use strict';

var mongoose = require('mongoose');
var utils = require('./tripUtils');

var planEntrySchema = new mongoose.Schema({
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
  status: { type: String, default: 'planned', enum: ['planned', 'visited'] },
  comment: String
});

var daySchema = new mongoose.Schema({
  entries: [planEntrySchema],
  lodging: {
    address: String,
    googlePlaceId: String,
    loc: {
      type: String,
      coordinates: [Number]
    },
    name: String
  }
});

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
  startDate: { type: Date },
  endDate: { type: Date },
  destination: destinationSchema,
  ideas: [ideaSchema],
  plan: [daySchema],
  visibility: { type: String, default: 'private' }
});

tripSchema.pre('validate', utils.validateFields);
tripSchema.pre('save', utils.createDefaultTripDay);
tripSchema.statics.findTrips = utils.findTrips;

module.exports = mongoose.model('Trip', tripSchema);
