'use strict';

const app = require('express')();
const Analytics = require('analytics-node');
const { secrets }  = require('../config/config');
const { guid } = require('./users');

const segmentKey = process.env.SEGMENT_WRITE_KEY || secrets.segmentKey;
const env = app.get('env');
let analytics;

// Flush events immediately if on dev environment
if (env !== 'production') {
  analytics = new Analytics(segmentKey, { flushAt: 1 });
} else {
  analytics = new Analytics(segmentKey);
}

module.exports = {
  // https://segment.com/docs/sources/server/node/#identify
  identify(user) {
    let opts = {};
    if (!user) {
      opts.anonymousId = guid();
    } else {
      const { _id, email, name, username } = user;
      opts = {
        userId: _id.toString(),
        traits: { name, email, username }
      };
    }

    // Log the environment to differentiate events from production vs dev
    opts.context = { environment: env };

    analytics.identify(opts);
  }
};
