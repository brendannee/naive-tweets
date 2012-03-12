var mongoose = require('mongoose');

var Tweet = mongoose.model('Tweet', new mongoose.Schema({
      id_str            :  { type: String, unique: true }
    , text              :  { type: String }
    , created_at        :  { type: String }
    , probability       :  {
        en                :  { type: Number, index: true }
      , es                :  { type: Number, index: true }
      , pt                :  { type: Number, index: true }
      , fr                :  { type: Number, index: true }
      , other             :  { type: Number, index: true }
    }
    , trained_language  :  { type: String }
    , trained           :  { type: Boolean, index: true, default: false }
  }));
