/*jslint node: true */
'use strict';

var _ = require('underscore');
var express = require('express');

var ensureAuth = require('../../utils/auth').ensureAuth;
var Trip = require('../../models/tripModel');

var app = express.Router();

/*
 * Trips
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

app.get('/:tripId', ensureAuth, function(req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(function(trip) {
      res.json({
        trip: trip
      });
    })
    .catch(next);
});

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
 * Trips - helper functions
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


/*
 * Trip Destinations
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
 * Trip Destinations - helper functions
 */

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


/*
 * Trip Ideas
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

app.get('/:tripId/ideas', ensureAuth, function(req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(function(trip) {
      res.json({
        ideas: trip.ideas
      });
    })
    .catch(next);
});

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

app.put('/:tripId/ideas/:ideaId', ensureAuth, function(req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(checkIdeaExists.bind(null, req.params.ideaId))
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

app.delete('/:tripId/ideas/:ideaId', ensureAuth, function (req, res, next) {
  findTrip(req.params.tripId, req.user._id)
    .then(checkIdeaExists.bind(null, req.params.ideaId))
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
 * Trip Destinations - helper functions
 */

function createTripIdea(params, trip) {
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

  trip.ideas.push(newParams);
  return trip;
}

function checkIdeaExists(ideaId, trip) {
  if (!trip.ideas.id(ideaId)) {
    return Promise.reject(new Error('Trip idea not found'));
  }

  return trip;
}

function updateTripIdea(params, ideaId, trip) {
  var idea = trip.ideas.id(ideaId);

  if (params.comment !== undefined && params.comment !== idea.comment) {
    idea.comment = params.comment;
  }

  // Re-order the idea within the list
  var result = reorderInArray(trip.ideas, idea, params.index);
  return result ? result : trip;
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


/*
 * Trip Plan and Trip Days
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
 * Trip Plan and Trip Days helper functions
 */

/*
 * Trip Plan - helper functions
 */

function findTripDay(dayId, trip) {
  return trip.plan.id(dayId);
}

function updateTripDay(params, dayId, trip) {
  var day = trip.plan.id(dayId);

  if (params.lodging !== undefined) {
    day.lodging = params.lodging;
  }

  // Re-order the day within the list if the index specified has changed
  var result = reorderInArray(trip.plan, day, params.index);
  return result ? result : trip;
}

function checkDayExists(dayId, trip) {
  if (!trip.plan.id(dayId)) {
    return Promise.reject(new Error('Trip day not found'));
  }

  return trip;
}


/*
 * Trip Entries
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

app.put('/:tripId/plan/:dayId/entries/:entryId', ensureAuth,
  function(req, res, next) {

  findTrip(req.params.tripId, req.user._id)
    .then(checkDayExists.bind(null, req.params.dayId))
    .then(checkEntryExists.bind(null, req.params.dayId, req.params.entryId))
    .then(updateTripEntry.bind(
      null,
      req.body,
      req.params.dayId,
      req.params.entryId
    ))
    .then(saveTrip)
    .then(function(trip) {
      res.json({
        dayId: req.params.dayId,
        entries: trip.plan.id(req.params.dayId).entries
      });
    })
    .catch(next);
});

app.delete('/:tripId/plan/:dayId/entries/:entryId', ensureAuth,
  function(req, res, next) {

  findTrip(req.params.tripId, req.user._id)
    .then(checkDayExists.bind(null, req.params.dayId))
    .then(checkEntryExists.bind(null, req.params.dayId, req.params.entryId))
    .then(deleteTripEntry.bind(null, req.params.dayId, req.params.entryId))
    .then(saveTrip)
    .then(function() {
      res.json({
        message: "Trip entry deleted successfully."
      });
    })
    .catch(next);
});


/*
 * Trip Entries helper functions
 */

function createTripEntry(params, dayId, trip) {
  var newParams = {};

  // Create the entry from the provided idea's data if available
  if (params.idea !== undefined) {
    var idea = trip.ideas.id(params.idea);
    if (!idea) {
      return Promise.reject(new Error('Trip idea not found'));
    }

    newParams = populateEntryParams(idea);
    idea.remove();
  } else {
    newParams = populateEntryParams(params);
  }

  var entries = trip.plan.id(dayId).entries;
  var result = insertIntoArray(entries, newParams, params.index);

  return result ? result : trip;
}

function populateEntryParams(params) {
  var newParams = {};
  var entryParams = ['googlePlaceId', 'name', 'loc', 'address', 'phone',
    'types', 'photo', 'url', 'comment'];

  entryParams.forEach(function(field) {
    if (params[field]) {
      newParams[field] = params[field];
    }
  });

  return newParams;
}

function checkEntryExists(dayId, entryId, trip) {
  var entry = trip.plan.id(dayId).entries.id(entryId);
  if (!entry) {
    return Promise.reject(new Error('Trip entry not found'));
  }

  return trip;
}

function updateTripEntry(params, dayId, entryId, trip) {
  var day = trip.plan.id(dayId);
  var entry = day.entries.id(entryId);
  var index = params.index;
  var result;

  if (params.comment !== undefined && params.comment !== entry.comment) {
    entry.comment = params.comment;
  }

  if (params.status !== undefined && params.status !== entry.status) {
    entry.status = params.status;
  }

  if (params.dayId !== undefined && params.dayId !== dayId) {
    var newDay = trip.plan.id(params.dayId);
    if (!newDay) {
      return Promise.reject(new Error('Target trip day not found'));
    }

    // Remove entry from current day and insert into the correct position of
    // the new day
    entry.remove();
    result = insertIntoArray(newDay.entries, entry, index);
  } else {
    result = reorderInArray(day.entries, entry, index);
  }

  return result ? result : trip;
}

function deleteTripEntry(dayId, entryId, trip) {
  var entry = trip.plan.id(dayId).entries.id(entryId);
  entry.remove();

  return trip;
}


/*
 * Other helper functions
 */

function insertIntoArray(array, obj, index) {
  if (index !== undefined) {
    if (index < 0 || index > array.length) {
      return Promise.reject(new Error('Invalid index'));
    }

    array.splice(index, 0, obj);
  }
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
