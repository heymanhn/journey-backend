/*jslint node: true */
'use strict';

var _ = require('underscore');
var express = require('express');

var ensureAuth = require('../../utils/auth').ensureAuth;
var Trip = require('../../models/tripModel');

var app = express.Router();

/*
 * POST /trips/
 *
 * Creates a new trip. Only a title is required during creation. Returns the
 * newly created trip upon success.
 *
 */
app.post('/', ensureAuth, function(req, res, next) {
  var params = {
    creator: req.user._id,
    title: req.body.title,
  };

  if (req.body.destinations) {
    params.destinations = req.body.destinations;
  }
  if (req.body.startDate && req.body.endDate) {
    params.startDate = req.body.startDate;
    params.endDate = req.body.endDate;
  }

  var trip = new Trip(params);
  trip
    .save()
    .then(function(newTrip) {
      res.json({
        trip: newTrip
      });
    })
    .catch(next);
});

/*
 * GET /trips/:tripId
 *
 * Gets details about a particular trip created by the currently authenticated
 * user.
 *
 */
app.get('/:tripId', ensureAuth, function(req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(function(trip) {
      res.json({
        trip: trip
      });
    })
    .catch(next);
});

/*
 * PUT /trips/:tripId
 *
 * Updates the trip. Only allowed on trips created by currently authenticated
 * user.
 *
 * COMING SOON: Figure out how to set and update the ideas and plan
 * properties
 *
 */
app.put('/:tripId', ensureAuth, function(req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(updateTrip.bind(null, req.body))
    .then(saveTrip)
    .then(function(trip) {
      res.json({
        message: 'Trip updated successfully',
        trip: trip
      });
    })
    .catch(next);
});

/*
 * DELETE /trips/:tripId
 *
 * Deletes the trip. Only allowed on trips created by currently authenticated
 * user.
 *
 */
app.delete('/:tripId', ensureAuth, function(req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(removeTrip)
    .then(function() {
      res.json({
        message: 'Trip deleted.'
      });
    })
    .catch(next);
});

function findTrip(tripId, userId) {
  var params = {
    _id: tripId,
    creator: userId
  };

  return Trip
    .findOne(params)
    .exec()
    .then(function(trip) {
      if (!trip) {
        var err = new Error('Trip not found');
        err.status = 404;
        return Promise.reject(err);
      }

      return trip;
    });
}

function updateTrip(params, trip) {
  var newParams = {
    title: params.title,
    destinations: params.destinations,
    visibility: params.visibility
  };

  // Only keep the params that need to be modified
  _.each(newParams, function(value, key) {
    if (value !== undefined && value !== trip[key]) {
      trip[key] = value;
    }
  });

  return trip;
}

function saveTrip(trip) {
  return trip.save();
}

function removeTrip(trip) {
  return trip.remove();
}

module.exports = app;
