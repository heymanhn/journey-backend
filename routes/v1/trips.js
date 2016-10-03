'use strict';

const _ = require('underscore');
const app = require('express').Router();

const analytics = require('app/utils/analytics');
const ensureAuth = require('app/utils/auth').ensureAuth;
const { trips: events } = require('app/utils/constants').analytics;
const Trip = require('app/models/tripModel');

/*
 * Trips
 */

app.post('/', ensureAuth, (req, res, next) => {
  let params = {
    creator: req.user._id,
    title: req.body.title
  };

  const optionalFields = ['startDate', 'endDate', 'destination', 'visibility'];
  optionalFields.forEach((field) => {
    if (req.body[field]) {
      if (field === 'startDate' || field === 'endDate') {
        params[field] = new Date(req.body[field]);
      } else {
        params[field] = req.body[field];
      }
    }
  });

  new Trip(params)
    .save()
    .then(trackTripEvent.bind(null, req.user, events.CREATE_TRIP))
    .then((trip) => res.json({ trip }))
    .catch(next);
});

app.get('/:tripId', (req, res, next) => {
  findTrip(req.params.tripId)
    .then(checkOwnership.bind(null, req, res))
    .then((trip) => res.json({ trip }))
    .catch(next);
});

app.put('/:tripId', (req, res, next) => {
  findTrip(req.params.tripId)
    .then(checkOwnership.bind(null, req, res))
    .then(updateTrip.bind(null, req.body))
    .then(saveTrip)
    .then((trip) => {
      res.json({
        message: 'Trip updated successfully.',
        trip
      });
    })
    .catch(next);
});

app.delete('/:tripId', ensureAuth, (req, res, next) => {
  findTripWithOwner(req.params.tripId, req.user._id)
    .then(removeTrip)
    .then(trackTripEvent.bind(null, req.user, events.DELETE_TRIP))
    .then(() => res.json({ message: 'Trip deleted.' }))
    .catch(next);
});


/*
 * Trips - helper functions
 */

function trackTripEvent(user, event, trip) {
  analytics.track(user, event, { tripId: trip.id });
  return trip;
}

function findTripWithOwner(tripId, userId) {
  return findTrip(tripId)
    .then((trip) => {
      if (userId.toString() !== trip.creator.toString()) {
        return Promise.reject(new Error('Not Authorized'));
      } else {
        return trip;
      }
    });
}

function findTrip(tripId) {
  return Trip
    .findOne({ _id: tripId })
    .exec()
    .then((trip) => {
      if (!trip) {
        let err = new Error('Trip not found');
        err.status = 404;
        return Promise.reject(err);
      }

      return trip;
    });
}

/*
 * Allow public trips to pass through; only allow private trips to pass through
 * if the trip is created by the currently authenticated user
 */
function checkOwnership(req, res, trip) {
  const vis = trip.visibility;
  const { authorization: token } = req.headers;

  if (!token) {
    if (vis === 'public') {
      return trip;
    } else {
      let newErr = new Error('Not Authorized');
      newErr.status = 401;
      return Promise.reject(newErr);
    }
  }

  // Construct a promise for the async ensureAuth() call
  const authPromise = new Promise((resolve, reject) => {
    const cb = (err) => {
      if (err) {
        return reject(err);
      }

      if (vis === 'private' && req.user.id !== trip.creator.toString()) {
        let newErr = new Error('Not Authorized');
        newErr.status = 401;
        return reject(newErr);
      }

      return resolve(trip);
    };

    ensureAuth(req, res, cb);
  });

  return authPromise;
}

function updateTrip(params, trip) {
  const { destination, title, startDate, endDate, visibility } = params;
  const newParams = {
    destination,
    title,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    visibility
  };

  // Only keep the params that need to be modified
  _.each(newParams, (value, key) => {
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
 * Trip Ideas
 */

app.post('/:tripId/ideas', (req, res, next) => {
  const tripId = req.params.tripId;

  findTrip(tripId)
    .then(checkOwnership.bind(null, req, res))
    .then(createTripIdea.bind(null, req.body))
    .then(saveTrip)
    .then(trackTripIdeaEvent.bind(null, req, events.ADD_TRIP_IDEA))
    .then((trip) => {
      const { ideas } = trip;
      res.json({ tripId, ideas });
    })
    .catch(next);
});

app.get('/:tripId/ideas', (req, res, next) => {
  const tripId = req.params.tripId;

  findTrip(tripId)
    .then(checkOwnership.bind(null, req, res))
    .then((trip) => {
      const { ideas } = trip;
      res.json({ tripId, ideas });
    })
    .catch(next);
});

app.put('/:tripId/ideas/:ideaId', (req, res, next) => {
  const { ideaId, tripId } = req.params;

  findTrip(tripId)
    .then(checkOwnership.bind(null, req, res))
    .then(checkIdeaExists.bind(null, ideaId))
    .then(updateTripIdea.bind(null, req.body, ideaId))
    .then(saveTrip)
    .then((trip) => {
      res.json({
        message: 'Trip idea updated successfully.',
        ideas: trip.ideas
      });
    })
    .catch(next);
});

app.delete('/:tripId/ideas/:ideaId', (req, res, next) => {
  const { ideaId, tripId } = req.params;

  findTrip(tripId)
    .then(checkOwnership.bind(null, req, res))
    .then(checkIdeaExists.bind(null, ideaId))
    .then(deleteTripIdea.bind(null, ideaId))
    .then(saveTrip)
    .then((trip) => {
      res.json({
        message: "Trip idea deleted successfully.",
        ideas: trip.ideas
      });
    })
    .catch(next);
});

app.delete('/:tripId/ideas', (req, res, next) => {
  findTrip(req.params.tripId)
    .then(checkOwnership.bind(null, req, res))
    .then(deleteTripIdeas)
    .then(saveTrip)
    .then(() => res.json({ message: 'Trip ideas deleted.' }))
    .catch(next);
});


/*
 * Trip Ideas - helper functions
 */

function trackTripIdeaEvent(req, event, trip) {
  analytics.track(req.user, event, { tripId: trip.id, ideaId: trip.ideas[0].id });
  return trip;
}

function createTripIdea(params, trip) {
  let newParams = _.pick(params, ['googlePlaceId', 'loc', 'name']);

  const optionalParams = [
    'address', 'phone', 'types', 'photo', 'url', 'comment'
  ];

  optionalParams.forEach((field) => {
    if (params[field]) {
      newParams[field] = params[field];
    }
  });

  trip.ideas.unshift(newParams);
  return trip;
}

function checkIdeaExists(ideaId, trip) {
  if (!trip.ideas.id(ideaId)) {
    return Promise.reject(new Error('Trip idea not found'));
  }

  return trip;
}

function updateTripIdea(params, ideaId, trip) {
  let idea = trip.ideas.id(ideaId);

  if (params.comment !== undefined && params.comment !== idea.comment) {
    idea.comment = params.comment;
  }

  // Re-order the idea within the list
  const result = reorderInArray(trip.ideas, idea, params.index);
  return result || trip;
}

function deleteTripIdeas(trip) {
  trip.ideas = [];
  return trip;
}

// Use this function in conjunction with checkIdeaExists()
function deleteTripIdea(ideaId, trip) {
  trip.ideas.id(ideaId).remove();
  return trip;
}


/*
 * Trip Plan and Trip Days
 */

app.get('/:tripId/plan', (req, res, next) => {
  const { tripId } = req.params;

  findTrip(tripId)
    .then(checkOwnership.bind(null, req, res))
    .then((trip) => {
      const { plan } = trip;
      res.json({ tripId, plan });
    })
    .catch(next);
});

app.post('/:tripId/plan', (req, res, next) => {
  const { tripId } = req.params;

  findTrip(tripId)
    .then(checkOwnership.bind(null, req, res))
    .then(createTripDay)
    .then(saveTrip)
    .then((trip) => {
      const { plan } = trip;
      res.json({ tripId, plan });
    })
    .catch(next);
});

app.get('/:tripId/plan/:dayId', (req, res, next) => {
  const { dayId, tripId } = req.params;

  findTrip(tripId)
    .then(checkOwnership.bind(null, req, res))
    .then(checkDayExists.bind(null, dayId))
    .then(findTripDay.bind(null, dayId))
    .then((tripDay) => res.json({ tripDay }))
    .catch(next);
});

app.put('/:tripId/plan/:dayId', (req, res, next) => {
  const { dayId, tripId } = req.params;

  findTrip(tripId)
    .then(checkOwnership.bind(null, req, res))
    .then(checkDayExists.bind(null, dayId))
    .then(updateTripDay.bind(null, req.body, dayId))
    .then(saveTrip)
    .then((trip) => {
      res.json({
        index: req.body.index,
        tripDay: trip.plan.id(dayId)
      });
    })
    .catch(next);
});

app.delete('/:tripId/plan/:dayId', (req, res, next) => {
  const { dayId, tripId } = req.params;

  findTrip(tripId)
    .then(checkOwnership.bind(null, req, res))
    .then(checkDayExists.bind(null, dayId))
    .then(removeTripDay.bind(null, dayId))
    .then(saveTrip)
    .then(() => res.json({ message: "Trip day deleted successfully." }))
    .catch(next);
});


/*
 * Trip Plan and Trip Days helper functions
 */

function createTripDay(trip) {
  trip.plan.push({ entries: [], lodging: {} });
  return trip;
}

function findTripDay(dayId, trip) {
  return trip.plan.id(dayId);
}

function updateTripDay(params, dayId, trip) {
  let day = trip.plan.id(dayId);

  if (params.lodging !== undefined) {
    day.lodging = params.lodging;
  }

  // Re-order the day within the list if the index specified has changed
  const result = reorderInArray(trip.plan, day, params.index);
  return result || trip;
}

function checkDayExists(dayId, trip) {
  if (!trip.plan.id(dayId)) {
    return Promise.reject(new Error('Trip day not found'));
  }

  return trip;
}

function removeTripDay(dayId, trip) {
  trip.plan.id(dayId).remove();
  return trip;
}


/*
 * Trip Entries
 */

app.post('/:tripId/plan/:dayId/entries', (req, res, next) => {
  const { dayId, tripId } = req.params;

  findTrip(tripId)
    .then(checkOwnership.bind(null, req, res))
    .then(checkDayExists.bind(null, dayId))
    .then(createTripEntry.bind(null, req.body, dayId))
    .then(saveTrip)
    .then((trip) => {
      const { entries } = trip.plan.id(dayId);
      res.json({ dayId, entries });
    })
    .catch(next);
});

app.put('/:tripId/plan/:dayId/entries/:entryId', (req, res, next) => {
  const { dayId, entryId, tripId } = req.params;

  findTrip(tripId)
    .then(checkOwnership.bind(null, req, res))
    .then(checkDayExists.bind(null, dayId))
    .then(checkEntryExists.bind(null, dayId, entryId))
    .then(updateTripEntry.bind(null, req.body, dayId, entryId))
    .then(saveTrip)
    .then((trip) => {
      const { entries } = trip.plan.id(dayId);
      res.json({ dayId, entries });
    })
    .catch(next);
});

app.delete('/:tripId/plan/:dayId/entries/:entryId', (req, res, next) => {
  const { dayId, entryId, tripId } = req.params;
  const { ignoreIdeaCreate } = req.query;

  findTrip(tripId)
    .then(checkOwnership.bind(null, req, res))
    .then(checkDayExists.bind(null, dayId))
    .then(checkEntryExists.bind(null, dayId, entryId))
    .then(deleteTripEntry.bind(null, dayId, entryId, ignoreIdeaCreate))
    .then(saveTrip)
    .then(() => res.json({ message: "Trip entry deleted successfully." }))
    .catch(next);
});


/*
 * Trip Entries helper functions
 */

function createTripEntry(params, dayId, trip) {
  let newParams = {};

  // Create the entry from the provided idea's data if available
  if (params.idea !== undefined) {
    const idea = trip.ideas.id(params.idea);
    if (!idea) {
      return Promise.reject(new Error('Trip idea not found'));
    }

    newParams = populateNewParams(idea);
    idea.remove();
  } else {
    newParams = populateNewParams(params);
  }

  const { entries } = trip.plan.id(dayId);
  const result = insertIntoArray(entries, newParams, params.index);

  return result || trip;
}

function populateNewParams(params) {
  let newParams = {};
  const targetParams = ['googlePlaceId', 'name', 'loc', 'address', 'phone',
    'types', 'photo', 'url', 'comment'];

  targetParams.forEach((field) => {
    if (params[field]) {
      newParams[field] = params[field];
    }
  });

  return newParams;
}

function checkEntryExists(dayId, entryId, trip) {
  const entry = trip.plan.id(dayId).entries.id(entryId);
  if (!entry) {
    return Promise.reject(new Error('Trip entry not found'));
  }

  return trip;
}

function updateTripEntry(params, dayId, entryId, trip) {
  const day = trip.plan.id(dayId);
  const entry = day.entries.id(entryId);
  const { index } = params;
  let result;

  if (params.comment !== undefined && params.comment !== entry.comment) {
    entry.comment = params.comment;
  }

  if (params.status !== undefined && params.status !== entry.status) {
    entry.status = params.status;
  }

  if (params.dayId !== undefined && params.dayId !== dayId) {
    const newDay = trip.plan.id(params.dayId);
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

  return result || trip;
}

function deleteTripEntry(dayId, entryId, ignoreIdeaCreate, trip) {
  const entry = trip.plan.id(dayId).entries.id(entryId);
  entry.remove();

  if (!ignoreIdeaCreate) {
    const newParams = populateNewParams(entry);
    trip.ideas.unshift(newParams);
  }

  return trip;
}


/*
 * Other helper functions
 */

function insertIntoArray(array, obj, index) {
  // If index is not defined, default to inserting to end of the array
  index = index || array.length;

  if (index < 0 || index > array.length) {
    return Promise.reject(new Error('Invalid index'));
  }

  array.splice(index, 0, obj);
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
