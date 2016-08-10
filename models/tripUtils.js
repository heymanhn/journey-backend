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

  updateTripDays: function(next) {
    if (!this.startDate || !this.endDate) {
      return next(new Error('Trip entry is missing a start/end date'));
    }
    if (!this.isModified('startDate') && !this.isModified('endDate')) {
      return next();
    }

    var numDays = ((this.endDate - this.startDate) / (1000 * 3600 * 24)) + 1;
    if (numDays > 90) {
      return next(new Error('Cannot create a trip longer than 90 days'));
    }

    var delta = numDays - this.plan.length;
    if (delta > 0) {
      // Create more empty trip days to the end of the plan
      for (var i = 0; i < delta; i++) {
        var dayParams = {
          entries: [],
          lodging: {}
        };

        this.plan.push(dayParams);
      }
    } else if (delta < 0) {
      // Remove trip days
      var dayToAdd = this.plan[(this.plan.length - 1) + delta];
      for (var i = 0; i < Math.abs(delta); i++) {
        var day = this.plan.pop();

        Array.prototype.push.apply(dayToAdd.entries, day.entries);
      }
    }

    return next();
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
