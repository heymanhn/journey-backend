/*jslint node: true */
'use strict';

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.json({
    message: 'This is the Journey API.'
  });
});

module.exports = router;
