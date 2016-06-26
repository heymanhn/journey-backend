var mongoose = require('mongoose');

var entrySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: String,
  contents: String,
  lat: Number,
  lng: Number
});

module.exports = mongoose.model('Entry', entrySchema);
