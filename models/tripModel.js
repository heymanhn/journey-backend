'use strict';

const mongoose = require('mongoose');
const utils = require('./tripUtils');

const planEntrySchema = new mongoose.Schema({
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

const daySchema = new mongoose.Schema({
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

const ideaSchema = new mongoose.Schema({
  googlePlaceId: { type: String, required: true },
  date: { type: Date, default: Date.now },
  name: { type: String, required: true },
  category: { type: String, default: 'Place' },
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

const destinationSchema = new mongoose.Schema({
  googlePlaceId: { type: String, required: true },
  name: { type: String, required: true },
  formattedAddress: { type: String, required: true },
  loc: {
    type: { type: String, required: true },
    coordinates: { type: [Number], required: true }
  },
  viewport: {
    northeast: {
      type: { type: String, required: true },
      coordinates: { type: [Number], required: true }
    },
    southwest: {
      type: { type: String, required: true },
      coordinates: { type: [Number], required: true }
    }
  },
  types: [String]
});

const tripSchema = new mongoose.Schema({
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
  ideaCategories: { type: [String], required: true },
  plan: [daySchema],
  visibility: { type: String, default: 'public', required: true }
});

ideaSchema.pre('validate', utils.validateIdeaFields);
tripSchema.pre('validate', utils.validateFields);
tripSchema.pre('save', utils.updateIdeaCategories);
tripSchema.pre('save', utils.createDefaultTripDay);
tripSchema.statics.findTrips = utils.findTrips;

module.exports = mongoose.model('Trip', tripSchema);
