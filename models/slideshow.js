var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var SlideshowSchema = new Schema({
    title       : {type: String}
  , description : {type: String}
  , username    : {type: String}
  , url         : {type: String}
  , created     : {type: Date, default: Date.now}
  , tags        : {type: Array}
});

mongoose.model('Slideshow', SlideshowSchema);
