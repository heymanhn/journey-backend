/*jslint node: true */
'use strict';

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

module.exports = app;
