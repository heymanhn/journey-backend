'use strict';

module.exports = {
  validateFields(next) {
    if (!this.title) {
      return next(new Error('Trip is missing a title'));
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

    const vis = this.visibility;
    if (vis) {
      if (vis !== 'public' && vis !== 'private' && vis !== 'viewOnly') {
        return next(new Error('Trip has invalid visibility set'));
      }
    }

    next();
  },

  // Create a trip day by default for each new trip
  createDefaultTripDay(next) {
    if (!this.isNew) {
      return next();
    }

    this.plan.push({ entries: [], lodging: {} });
    next();
  },

  findTrips(params, count, page) {
    if (!params || !count || !page) {
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
