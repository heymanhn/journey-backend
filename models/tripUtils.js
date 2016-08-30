/*jslint node: true */
'use strict';

var config = require('../config/config');

module.exports = {
  validateFields: function(next) {
    if (!this.title) {
      return next(new Error('Trip entry is missing a title'));
    }

    if (!Array.isArray(this.ideas)) {
      return next(new Error('Trip ideas have invalid format'));
    }

    if (!Array.isArray(this.plan)) {
      return next(new Error('Trip plan has invalid format'));
    }

    if (this.endDate && this.startDate) {
      if (this.endDate < this.startDate) {
        return next(new Error('Trip end date is before start date'));
      }
    }

    next();
  },

  // Create a trip day by default for each new trip
  createDefaultTripDay: function(next) {
    if (!this.isNew) {
      return next();
    }

    var params = {
      entries: [],
      lodging: {}
    };

    this.plan.push(params);
    next();
  },

  findTrips: function(params, page) {
    var count = config.database.DEFAULT_TRIP_COUNT;

    if (!params || !page) {
      return Promise.reject(new Error('Invalid arguments'));
    }

    return this
      .find(params)
      .sort({ date: -1 })
      .skip(count * (page-1))
      .limit(count)
      .exec();
  }
};
