var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Slideshow = new Schema({
    title         : {type: String}
  , description   : {type: String}
  , username      : {type: String}
  , url           : {type: String, unique: true}
  , created       : {type: Date, default: Date.now}
  , tags          : {type: Array}
  , slideshare_id : {type: String}
});

Slideshow.virtual('user_link').get(function() {
  console.log(this.url.replace(/\/[^/]+$/, ""));
  return this.url.replace(/\/[^/]+$/, "");
});

Slideshow.virtual('embed').get(function() {
  console.log('<div style="width:425px" id="__ss_' + this.slideshare_id + '"> <strong style="display:block;margin:12px 0 4px"><a href="' + this.url + '" title="' + this.title + '" target="_blank">' + this.title + '</a></strong> <iframe src="http://www.slideshare.net/slideshow/embed_code/' + this.slideshare_id + '?rel=0" width="425" height="355" frameborder="0" marginwidth="0" marginheight="0" scrolling="no"></iframe> <div style="padding:5px 0 12px"> View more presentations from <a href="' + this.user_link + '" target="_blank">' + this.username + '</a> </div> </div>');
  return '<div style="width:425px" id="__ss_' + this.slideshare_id + '"> <strong style="display:block;margin:12px 0 4px"><a href="' + this.url + '" title="' + this.title + '" target="_blank">' + this.title + '</a></strong> <iframe src="http://www.slideshare.net/slideshow/embed_code/' + this.slideshare_id + '?rel=0" width="425" height="355" frameborder="0" marginwidth="0" marginheight="0" scrolling="no"></iframe> <div style="padding:5px 0 12px"> View more presentations from <a href="' + this.user_link + '" target="_blank">' + this.username + '</a> </div> </div>';
});

mongoose.model('Slideshow', Slideshow);
