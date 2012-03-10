var mongoose = require('mongoose');

var Tweet = mongoose.model('Tweet', new mongoose.Schema({
      id_str            :  { type: String, unique: true }
    , text              :  { type: String }
    , created_at        :  { type: String }
    , spam              :  { type: Boolean, index: true }
    , interesting       :  { type: Boolean, index: true }
    , not_english       :  { type: Boolean, index: true }
    , spam_prob         :  { type: Number, index: true }
    , interesting_prob  :  { type: Number, index: true }
    , not_english_prob  :  { type: Number, index: true }
    , classified        :  { type: Boolean, index: true, default: false }
  }));
