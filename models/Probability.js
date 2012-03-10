var mongoose = require('mongoose');

var Probability = mongoose.model('Probability', new mongoose.Schema({
      word               :  { type: String, unique: true }
    , spam               :  { type: Number }
    , not_english         :  { type: Number }
    , interesting        :  { type: Number }

  }, {strict:true}));
