/*jslint node: true */
'use strict';

var express = require('express');

var auth = require('./auth');
var entries = require('./entries');
var users = require('./users');
var app = express.Router();

/*
 * Route configuration
 */
app.use('/entries', entries);
app.use('/auth', auth);
app.use('/users', users);

module.exports = app;