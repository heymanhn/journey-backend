/*jslint node: true */
'use strict';

var _ = require('underscore');
var express = require('express');

var ensureAuth = require('../../utils/auth').ensureAuth;
var Trip = require('../../models/tripModel');

var app = express.Router();

/*
 * POST /
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
    .then(function() {
      res.redirect('/v1/users/' + req.user._id + '/trips/');
    })
    .catch(next);
});

/*
 * GET /:tripId
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
 * PUT /:tripId
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
        message: 'Trip updated successfully.',
        trip: trip
      });
    })
    .catch(next);
});

/*
 * DELETE /:tripId
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

/*
 * Trip Destinations
 */

/*
 * POST /:tripId/destinations
 *
 * Add a new destination to the trip. Only allowed on trips created by the
 * currently authenticated user.
 *
 */
app.post('/:tripId/destinations', ensureAuth, function(req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(createTripDestination.bind(null, req.body))
    .then(saveTrip)
    .then(function(trip) {
      res.json({
        destinations: trip.destinations
      });
    })
    .catch(next);
});

/*
 * DELETE /:tripId/destinations/:destinationId
 *
 * Removes a destination from a trip. Only allowed on trips created by the
 * currently authenticated user.
 *
 */
app.delete('/:tripId/destinations/:destinationId', ensureAuth,
  function(req, res, next) {

  findTrip(req.params.tripId, req.user._id)
    .then(deleteTripDestination.bind(null, req.params.destinationId))
    .then(saveTrip)
    .then(function() {
      res.json({
        message: "Trip destination deleted successfully."
      });
    })
    .catch(next);
});


/*
 * Trip Ideas
 */

/*
 * POST /:tripId/ideas
 *
 * Add a new idea to the trip. Only allowed on trips created by the currently
 * authenticated user.
 *
 */
app.post('/:tripId/ideas', ensureAuth, function(req, res, next) {
  var tripId = req.params.tripId;

  findTrip(tripId, req.user._id)
    .then(createTripIdea.bind(null, req.body))
    .then(saveTrip)
    .then(function() {
      res.redirect('/v1/trips/' + tripId + '/ideas');
    })
    .catch(next);
});

/*
 * GET /:tripId/ideas
 *
 * Get the list of ideas from a given trip. Only allowed on trips created by
 * the currently authenticated user.
 *
 */
app.get('/:tripId/ideas', ensureAuth, function(req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(function(trip) {
      res.json({
        ideas: trip.ideas
      });
    })
    .catch(next);
});

/*
 * DELETE /:tripId/ideas
 *
 * Clears the list of ideas from a given trip. Only allowed on trips created by
 * the currently authenticated user.
 *
 */
app.delete('/:tripId/ideas', ensureAuth, function(req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(deleteTripIdeas)
    .then(saveTrip)
    .then(function() {
      res.json({
        message: 'Trip ideas deleted.'
      });
    })
    .catch(next);
});

/*
 * PUT /:tripId/ideas/:ideaId
 *
 * Updates an idea that belongs to a trip. Useful for reordering an idea in the
 * list, marking an idea as "planned", or marking an idea back as "active".
 * Only allowed on ideas whose trips are created by the currently authenticated
 * user.
 *
 * Users can update the order of an idea in the list, or the comments the users
 * provided.
 *
 */
app.put('/:tripId/ideas/:ideaId', ensureAuth, function(req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(updateTripIdea.bind(null, req.body, req.params.ideaId))
    .then(saveTrip)
    .then(function(trip) {
      res.json({
        message: 'Trip idea updated successfully.',
        ideas: trip.ideas
      });
    })
    .catch(next);
});

/*
 * DELETE /:tripId/ideas/:ideaId
 *
 * Removes an idea from a trip. Only allowed on ideas from trips created by the
 * currently authenticated user.
 *
 */
app.delete('/:tripId/ideas/:ideaId', ensureAuth, function (req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(deleteTripIdea.bind(null, req.params.ideaId))
    .then(saveTrip)
    .then(function() {
      res.json({
        message: "Trip idea deleted successfully."
      });
    })
    .catch(next);
});


/*
 * Helper functions
 */

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

function createTripDestination(params, trip) {
  var destExists = false;
  var newParams = {
    googlePlaceId: params.googlePlaceId,
    name: params.name,
    loc: params.loc
  };

  if (params.types) {
    newParams.types = params.types;
  }

  trip.destinations.forEach(function(dest) {
    if (dest.googlePlaceId === newParams.googlePlaceId) {
      destExists = true;
    }
  });

  if (destExists) {
    return Promise.reject(new Error('Destination already exists.'));
  }

  trip.destinations.push(newParams);
  return trip;
}

function deleteTripDestination(destId, trip) {
  var dest = trip.destinations.id(destId);
  dest.remove();

  return trip;
}

function createTripIdea(params, trip) {
  var ideaExists = false;
  var newParams = {
    googlePlaceId: params.googlePlaceId,
    name: params.name,
    loc: params.loc
  };

  var optionalParams = [
    'address', 'phone', 'types', 'photo', 'url', 'comment'
  ];

  optionalParams.forEach(function(field) {
    if (params[field]) {
      newParams[field] = params[field];
    }
  });

  trip.ideas.forEach(function(idea) {
    if (idea.googlePlaceId === newParams.googlePlaceId) {
      ideaExists = true;
    }
  });

  if (ideaExists) {
    return Promise.reject(new Error('Idea already exists.'));
  }

  trip.ideas.push(newParams);
  return trip;
}

function updateTripIdea(params, ideaId, trip) {
  var idea = trip.ideas.id(ideaId);

  if (!idea) {
    return Promise.reject(new Error('Trip idea not found'));
  }

  if (params.comment !== undefined && params.comment !== idea.comment) {
    idea.comment = params.comment;
  }

  // Re-order the idea within the list if the index specified has changed vs.
  // the idea's current index in the array
  if (params.index !== undefined && params.index !== idea.__index) {
    if (params.index < 0 || params.index > trip.ideas.length - 1) {
      return Promise.reject(new Error('Invalid position for idea'));
    }

    trip.ideas.splice(idea.__index, 1);
    trip.ideas.splice(params.index, 0, idea);
  }

  return trip;
}

function deleteTripIdeas(trip) {
  trip.ideas = [];
  return trip;
}

function deleteTripIdea(ideaId, trip) {
  var idea = trip.ideas.id(ideaId);
  idea.remove();

  return trip;
}

module.exports = app;
