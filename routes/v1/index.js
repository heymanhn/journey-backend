'use strict';

const app = require('express').Router();

const analytics = require('./analytics');
const auth = require('./auth');
const entries = require('./entries');
const trips = require('./trips');
const uploads = require('./uploads');
const users = require('./users');

/*
 * Route configuration
 */
app.use('/analytics', analytics);
app.use('/auth', auth);
app.use('/entries', entries);
app.use('/trips', trips);
app.use('/uploads', uploads);
app.use('/users', users);

module.exports = app;
