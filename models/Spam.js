var mongoose = require('mongoose');

var Spam = mongoose.model('Spam', new mongoose.Schema({
      word               :  { type: String, unique: true }
    , count              :  { type: Number }
  }, {strict:true}));
