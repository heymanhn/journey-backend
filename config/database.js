/*jslint node: true */
'use strict';

module.exports = {
  production: {
    url: process.env.MONGODB_URI
  },

  development: {
    url: 'mongodb://localhost:27017/journey'
  },

  test: {
    url: 'mongodb://localhost:27017/journey-test'
  },

  DEFAULT_ENTRY_COUNT: 20,
  DEFAULT_TRIP_COUNT: 10
};
