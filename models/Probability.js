var mongoose = require('mongoose');

var Probability = mongoose.model('Probability', new mongoose.Schema({
      word               :  { type: String, unique: true }
    , probability        :  {
        en                  : { type: Number, index: true }
      , es                  : { type: Number, index: true }
      , pt                  : { type: Number, index: true }
      , fr                  : { type: Number, index: true }
      , other               : { type: Number, index: true }
    }
    , count              :  {
        en                  : { type: Number, index: true }
      , es                  : { type: Number, index: true }
      , pt                  : { type: Number, index: true }
      , fr                  : { type: Number, index: true }
      , other               : { type: Number, index: true }
    }
  }, {strict:true}));
