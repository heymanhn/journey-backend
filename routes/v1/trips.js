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
    startDate: new Date(req.body.startDate),
    endDate: new Date(req.body.endDate)
  };

  if (req.body.destinations) {
    params.destinations = req.body.destinations;
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
    .then(checkDayExists.bind(null, req.params.dayId))
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
 * Trip Plan
 */

/*
 * GET /:tripId/plan
 *
 * Returns the entire trip plan.
 *
 */
app.get('/:tripId/plan', ensureAuth, function(req, res, next) {
  var tripId = req.params.tripId;

  findTrip(tripId, req.user._id)
    .then(function(trip) {
      res.json({
        tripId: tripId,
        plan: trip.plan
      });
    })
    .catch(next);
});

/*
 * GET /trips/:tripId/plan/:dayId
 *
 * Returns the plan for a trip day. Only allowed on trips created by the
 * currently authenticated user.
 *
 */
app.get('/:tripId/plan/:dayId', ensureAuth, function(req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(checkDayExists.bind(null, req.params.dayId))
    .then(findTripDay.bind(null, req.params.dayId))
    .then(function(tripDay) {
      res.json({
        tripDay: tripDay
      });
    })
    .catch(next);
});

/*
 * PUT /trips/:tripId/plan/:dayId
 *
 * Updates the contents of a trip day. Only allowed on trips created by the
 * currently authenticated user. Can move the entire day to another day,
 * reordering the affected trip days in the process. Can also update the
 * lodging information for the day.
 *
 */
app.put('/:tripId/plan/:dayId', ensureAuth, function(req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(checkDayExists.bind(null, req.params.dayId))
    .then(updateTripDay.bind(null, req.body, req.params.dayId))
    .then(saveTrip)
    .then(function(trip) {
      res.json({
        index: req.body.index,
        tripDay: trip.plan.id(req.params.dayId)
      });
    })
    .catch(next);
});

/*
 * Trip Entries
 */

/*
 * POST /trips/:tripId/plan/:dayId/entries
 *
 * A Trip Entry can be created either through a trip idea, or directly into the
 * trip plan. Only allowed on trips created by the currently authenticated
 * user.
 *
 */
app.post('/:tripId/plan/:dayId/entries', ensureAuth, function(req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(checkDayExists.bind(null, req.params.dayId))
    .then(createTripEntry.bind(null, req.body, req.params.dayId))
    .then(saveTrip)
    .then(function(trip) {
      res.json({
        dayId: req.params.dayId,
        entries: trip.plan.id(req.params.dayId).entries
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
    startDate: params.startDate,
    endDate: params.endDate,
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

  if (params.comment !== undefined && params.comment !== idea.comment) {
    idea.comment = params.comment;
  }

  // Re-order the idea within the list if the index specified has changed
  reorderInArray(trip.ideas, idea, params.index);
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

function findTripDay(dayId, trip) {
  return trip.plan.id(dayId);
}

function updateTripDay(params, dayId, trip) {
  var day = trip.plan.id(dayId);

  if (params.lodging !== undefined) {
    day.lodging = params.lodging;
  }

  // Re-order the day within the list if the index specified has changed
  reorderInArray(trip.plan, day, params.index);
  return trip;
}

function checkDayExists(dayId, trip) {
  if (!trip.plan.id(dayId)) {
    return Promise.reject(new Error('Trip day not found'));
  }

  return trip;
}

function createTripEntry(params, dayId, trip) {
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

  trip.plan.id(dayId).entries.push(newParams);
  return trip;
}

function reorderInArray(array, obj, index) {
  if (index !== undefined && index !== obj.__index) {
    if (index < 0 || index > array.length - 1) {
      return Promise.reject(new Error('Invalid index'));
    }

    array.splice(obj.__index, 1);
    array.splice(index, 0, obj);
  }
}

module.exports = app;
