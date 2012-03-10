var mongoose = require('mongoose');

var NotInteresting = mongoose.model('NotInteresting', new mongoose.Schema({
      word               :  { type: String, unique: true }
    , count              :  { type: Number }
  }, {strict: true}));
