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

    if (this.endDate < this.startDate) {
      return next(new Error('Trip end date is before start date'));
    }

    next();
  },

  createTripDays: function(next) {
    if (!this.startDate || !this.endDate) {
      return next(new Error('Trip entry is missing a start/end date'));
    }

    var numDays = ((this.endDate - this.startDate) / (1000 * 3600 * 24)) + 1;
    for (var i = 0; i < numDays; i++) {
      var dayParams = {
        entries: [],
        lodging: {}
      };

      this.plan.push(dayParams);
    }

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
