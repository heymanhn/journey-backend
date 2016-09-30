'use strict';

const database = require('./database');
const secrets = require('./secrets');
const s3 = require('./s3');

module.exports = { database, secrets, s3 };
