'use strict';

const _ = require('underscore');
const app = require('express')();
const Analytics = require('analytics-node');
const { secrets }  = require('app/config/config');
const { guid } = require('./users');

const segmentKey = process.env.SEGMENT_WRITE_KEY || secrets.segmentKey;
const env = process.env.ANALYTICS_ENV || app.get('env');
let analytics;

// Flush events immediately if on dev environment
if (env !== 'production') {
  analytics = new Analytics(segmentKey, { flushAt: 1 });
} else {
  analytics = new Analytics(segmentKey);
}

function generateOpts(req) {
  const user = req.user || req.anonymousUser;
  const { id: userId, anonymousId } = user;
  let opts = userId ? { userId } : { anonymousId };

  // Log the environment to differentiate events from production vs dev
  opts.properties = { environment: env, platform: 'Web' };

  return opts;
}

module.exports = {
  // https://segment.com/docs/sources/server/node/#identify
  identify(req) {
    let opts = generateOpts(req);

    if (req.user) {
      const { email, name, username } = req.user;
      opts.traits = { email, name, username };
    }

    analytics.identify(opts);
  },

  // https://segment.com/docs/sources/server/node/#track
  track(req, event, properties) {
    let opts = _.extend(generateOpts(req), { event, properties });
    analytics.track(opts);
  },

  // https://segment.com/docs/sources/server/node/#page
  page(req, category, name, properties) {
    let opts = _.extend(generateOpts(req), { category, name });
    opts.properties = _.extend(opts.properties, properties);
    analytics.page(opts);
  },

  // https://segment.com/docs/sources/server/node/#alias
  alias(req) {
    const { id: userId } = req.user;
    const { anonymousId: previousId } = req.anonymousUser;

    analytics.alias({ previousId, userId });
  }
};
