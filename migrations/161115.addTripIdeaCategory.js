'use strict';

const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const url = 'mongodb://localhost:27017/journey';

const IDEA_CATEGORY_FOOD = 'Food';
const IDEA_CATEGORY_LODGING = 'Lodging';
const IDEA_CATEGORY_NIGHTLIFE = 'Nightlife';
const IDEA_CATEGORY_PLACE = 'Place';
const IDEA_CATEGORY_RECREATION = 'Recreation';
const IDEA_CATEGORY_SHOPPING = 'Shopping';
const IDEA_CATEGORY_SIGHTSEEING = 'Sightseeing';
const IDEA_CATEGORY_TRANSPORTATION = 'Transportation';

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
  trip.ideas.forEach(idea => {
    if (!idea.category) {
      if (idea.types.length === 0) {
        idea.category = IDEA_CATEGORY_PLACE;
      } else {
        idea.category = getCategoryForIdeaType(idea.types[0]);
      }
    }
  });

  return tripsCollection
    .update({ _id: trip._id }, { $set: { ideas: trip.ideas } })
    .then(test => {
      return console.log('Trip updated: ' + trip.title);
    });
}

function getCategoryForIdeaType(type) {
  switch(type) {
    case 'bakery':
    case 'cafe':
    case 'food':
    case 'meal_delivery':
    case 'meal_takeaway':
    case 'restaurant':
      return IDEA_CATEGORY_FOOD;
    case 'lodging':
      return IDEA_CATEGORY_LODGING;
    case 'bar':
    case 'night_club':
      return IDEA_CATEGORY_NIGHTLIFE;
    case 'amusement_park':
    case 'aquarium':
    case 'art_gallery':
    case 'campground':
    case 'museum':
    case 'park':
    case 'spa':
    case 'stadium':
    case 'zoo':
      return IDEA_CATEGORY_RECREATION;
    case 'book_store':
    case 'clothing_store':
    case 'department_store':
    case 'furniture_store':
    case 'shopping_mall':
    case 'store':
      return IDEA_CATEGORY_SHOPPING;
    case 'establishment':
    case 'locality':
    case 'natural_feature':
    case 'place_of_worship':
    case 'premise':
    case 'point_of_interest':
    case 'subpremise':
      return IDEA_CATEGORY_SIGHTSEEING;
    case 'airport':
    case 'bus_station':
    case 'taxi_stand':
    case 'train_station':
    case 'transit_station':
      return IDEA_CATEGORY_TRANSPORTATION;
    default:
      return IDEA_CATEGORY_PLACE;
  }
}
