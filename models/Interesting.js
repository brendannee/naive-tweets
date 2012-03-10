var mongoose = require('mongoose');

var Interesting = mongoose.model('Interesting', new mongoose.Schema({
      word               :  { type: String, unique: true }
    , count              :  { type: Number }
  }, {strict: true}));
