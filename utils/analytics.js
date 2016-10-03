'use strict';

const _ = require('underscore');
const app = require('express')();
const Analytics = require('analytics-node');
const { secrets }  = require('app/config/config');
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

function generateOpts() {
  return {
    // Log the environment to differentiate events from production vs dev
    context: { environment: env, platform: 'Web' }
  };
}

module.exports = {
  // https://segment.com/docs/sources/server/node/#identify
  identify(user) {
    let opts = generateOpts();
    if (!user) {
      opts.anonymousId = guid();
    } else {
      const { id: userId, email, name, username } = user;
      opts = {
        userId,
        traits: { name, email, username }
      };
    }

    analytics.identify(opts);
  },

  // https://segment.com/docs/sources/server/node/#track
  track(user, event, properties) {
    const { id: userId } = user;
    let opts = _.extend(generateOpts(), { userId, event, properties });

    analytics.track(opts);
  }
};
