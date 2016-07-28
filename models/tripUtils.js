/*jslint node: true */
'use strict';

var config = require('../config/config');

module.exports = {
  validateFields: function(next) {
    if (!this.title) {
      return next(new Error('Trip entry is missing a title'));
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
      .select('-wishlist -itinerary') // Not returning the full object
      .sort({ date: -1 })
      .skip(count * (page-1))
      .limit(count)
      .exec();
  }
};