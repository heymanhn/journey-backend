'use strict';

const app = require('express').Router();

const auth = require('./auth');
const entries = require('./entries');
const trips = require('./trips');
const uploads = require('./uploads');
const users = require('./users');

/*
 * Route configuration
 */
app.use('/entries', entries);
app.use('/auth', auth);
app.use('/trips', trips);
app.use('/uploads', uploads);
app.use('/users', users);

module.exports = app;
