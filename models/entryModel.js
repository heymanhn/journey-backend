var mongoose = require('mongoose');

var entrySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: { type: String, required: true },
  contents: { type: String, required: true },
  lat: Number,
  lng: Number
});

module.exports = mongoose.model('Entry', entrySchema);
