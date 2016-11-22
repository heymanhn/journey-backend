/*
 * Updates each trip to include a list of idea categories
 */

'use strict';

const _ = require('underscore');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const url = 'mongodb://localhost:27017/journey';

// Use connect method to connect to the Server
MongoClient
  .connect(url)
  .then(db => {
    console.log('Connection established to', url);

    let tripsCollection = db.collection('trips');
    return tripsCollection
      .find({}, { title: 1, ideas: 1 })
      .toArray()
      .then(trips => {
        const updates = trips.map(updateTrip.bind(null, tripsCollection));
        return Promise.all(updates);
      })
      .then(() => {
        db.close();
      })
      .catch(e => console.log('Error finding trips: ' + e));
  })
  .catch(err => {
    console.log('Error: ', err);
  });

function updateTrip(tripsCollection, trip) {
  const categories = _.pluck(trip.ideas, 'category');
  const ideaCategories = _.uniq(categories.sort(), true);

  return tripsCollection
    .update({ _id: trip._id }, { $set: { ideaCategories } })
    .then(() => {
      return console.log('Trip updated: ' + trip.title);
    });
}
