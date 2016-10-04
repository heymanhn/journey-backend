'use strict';

const app = require('express').Router();
const analytics = require('app/utils/analytics');

app.post('/track', (req, res, next) => {
  const { user } = req;
  const { event, properties } = req.body;

  if (!event) {
    return next(new Error('Event not specified'));
  }

  analytics.track(user, event, properties);
  res.json({ message: 'track() event logged successfully.'});
});

app.post('/page', (req, res, next) => {
  const { user } = req;
  const { category, name, properties } = req.body;

  if (!name) {
    return next(new Error('Page name not specified'));
  }

  analytics.page(user, category, name, properties);
  res.json({ message: 'page() event logged successfully.'});
});

module.exports = app;
