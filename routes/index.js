'use strict';

const app = require('express').Router();

/* GET home page. */
app.get('/', (req, res) => {
  res.json({ message: 'This is the Journey API.' });
});

module.exports = app;
