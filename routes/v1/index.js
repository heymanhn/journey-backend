/*jslint node: true */
'use strict';

var express = require('express');

var auth = require('./auth');
var entries = require('./entries');
var trips = require('./trips');
var uploads = require('./uploads');
var users = require('./users');
var app = express.Router();

/*
 * Route configuration
 */
app.use('/entries', entries);
app.use('/auth', auth);
app.use('/trips', trips);
app.use('/uploads', uploads);
app.use('/users', users);

module.exports = app;
