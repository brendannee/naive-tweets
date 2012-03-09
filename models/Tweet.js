var mongoose = require('mongoose');

var Tweet = mongoose.model('Tweet', new mongoose.Schema({
    id_str              :  { type: String, unique: true }
    , text              :  { type: String }
    , created_at        :  { type: String }
    , spam              :  { type: Boolean }
    , interesting       :  { type: Boolean }
    , non_english       :  { type: Boolean }
    , classified        :  { type: Boolean, default: false }
  }));
