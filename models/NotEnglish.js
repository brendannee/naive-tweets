var mongoose = require('mongoose');

var NotEnglish = mongoose.model('NotEnglish', new mongoose.Schema({
      word               :  { type: String, unique: true }
    , count              :  { type: Number }
  }, {strict:true}));
