/*jslint node: true */
'use strict';

var database = require('./database');
var secrets = require('./secrets');
var s3 = require('./s3');

module.exports = {
  database: database,
  secrets: secrets,
  s3: s3
};
