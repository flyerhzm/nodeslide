var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Slideshow = new Schema({
  title         : {type: String},
  description   : {type: String},
  username      : {type: String},
  url           : {type: String, unique: true},
  created       : {type: Date, default: Date.now},
  tags          : {type: Array},
  slideshare_id : {type: String},
  embed         : {type: String}
});

Slideshow.virtual('user_link').get(function() {
  return this.url.replace(/\/[^\/]+$/, "");
});

mongoose.model('Slideshow', Slideshow);
