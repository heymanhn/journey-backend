/*jslint node: true */
'use strict';

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.status(200).json({
    success: true,
    message: 'This is the Journey API.'
  });
});

module.exports = router;
