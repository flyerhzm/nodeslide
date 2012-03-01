var http = require('http')
  , querystring = require('querystring')
  , crypto = require('crypto')
  , sys = require('util')
  , mongoose = require('mongoose')
  , htmlparser = require('htmlparser')
  , DomUtils = htmlparser.DomUtils
  , config = require('../config').config
  , models = require('../models')
  , Slideshow = models.Slideshow;


var Crawler = function() {
  // slideshow_tbs (short for to be saved) is used to detect if we should close mongo connection
  this.unsaved_count = 0;
  this.slideshare = new Slideshare;
  this.xmlHandler = new this.XmlHandler;
  this.httpHandler = new this.HttpHandeler;
};

Crawler.prototype.createHTTPOptions = function(tag, timestamp) {
  var queries = querystring.stringify({
    api_key: config.slideshare_key,
    ts: timestamp,
    hash: this.slideshare.timeHash(timestamp),
    tag: tag,
    limit: config.crawl_size,
    detailed: 1
  });
  var http_options = {
    host: "www.slideshare.net",
    path: "/api/2/get_slideshows_by_tag?" + queries
  };
  return http_options;
};

Crawler.prototype.XmlHandler = function() {
  var self = this;

  var handler = new htmlparser.DefaultHandler(function(err, dom) {
    if (err) {
      console.log(err.message);
    } else {
      var slideshow_doms = DomUtils.getElementsByTagName("Slideshow", dom);
      self.unsaved_count += slideshow_doms.length;

      for (var index = 0; index < slideshow_doms.length; index++) {
        var slideshow = self.slideshare.createSlideshow(slideshow_doms[index]);
        slideshow.save(function(err) {
          if (err) { console.log(err.message); }
          slideshow_tbs--;
        });
      };
    }
  }, {verbose: false});

  return handler;
};

Crawler.prototype.HttpHandeler = function() {
  var self = this;

  var handler = function(response) {
    response.setEncoding("utf8");
    var response_body = "",
        xml_handler = self.xml_handler;

    response.on('data', function(data) {
      response_body += data;
    }).on('end', function() {
      var parser = new htmlparser.Parser(xml_handler);
      parser.parseComplete(response_body);
    }).on('error', function(err) {
      console.log(err.message);
    });
  }

  return handler;
};

Crawler.prototype.fetchAndSave = function(tag, now) {
  if (!now) {
    // This simulate the default parameter value
    now = (Date.now() / 1000).toFixed();
  }

  var httpOptions = this.createHTTPOptions(tag, now),


  req = http.get(httpOptions, this.httpHandeler);
  req.end();

  return req;
};

Crawler.prototype.fetchSome = function(tags) {
  for (var index = 0; index < tags.length; index++) {
    var tag = tags[index];
    this.fetchAndSave(tag);
  }
  this.watchMongoConnection();
};

// WTF, I hate disconnecting mongo by setTimeout
// You should use promise...
Crawler.prototype.watchMongoConnection = function() {
  var self = this;
  if (!self.intervalId) {
    self.intervalId = setInterval(function() {
      if (self.unsaved_count === 0) {
        mongoose.disconnect();
        clearInterval(self.intervalId);
      }
    }, 5000);
  }
};

/* This is the domain of slideshare */
var Slideshare = function() {
};

Slideshare.prototype.SlideshowPropertyMapping = {
  title: "Title",
  description: "Description",
  username: "Username",
  url: "URL",
  created: "Created",
  slideshare_id: "ID"
};

/* generateSlideshareHash */
Slideshare.prototype.timeHash = function(now) {
  var sha1_crypto = crypto.createHash('sha1');
  sha1_crypto.update(config.slideshare_secret + now);
  return sha1_crypto.digest('hex');
};

Slideshare.prototype.fetchDomData = function(dom, name) {
  // Use a css or xpath selector is much better than this
  var data_dom = DomUtils.getElementsByTagName(name, dom)
    , data = "";
  if (data_dom[0]["children"]) {
    data = data_dom[0]["children"][0]["data"];
  }
  return data;
};

Slideshare.prototype.fetchDomArray = function(dom, name) {
  var data_dom = DomUtils.getElementsByTagName(name, dom)
    , data = [];

  for (var index = 0; index < data_dom.length; index++) {
    var child_dom = data_dom[index];
    if (child_dom["children"]) {
      data.push(child_dom["children"][0]["data"]);
    };
  };
  return data;
};

// htmlparser can't parse the Embed section correctly, have to iterate all tags with data type.
Slideshare.prototype.fetchEmbed = function(dom) {
  var data_doms = DomUtils.getElementsByTagType("text", dom);

  for (var index = 0; index < data_doms.length; index++) {
    var data_dom = data_doms[index];
    if (data_dom.data.indexOf("static.slidesharecdn.com/swf/ssplayer2.swf") !== -1) {
      return data_dom.data;
    }
  }
};

Slideshare.prototype.createSlideshow = function(dom) {
  var slideshow = new Slideshow();
  var propertyMapping = this.SlideshowPropertyMapping;
  for (var property in propertyMapping) {
    var attribute = this.SlideshowPropertyMapping[property];
    slideshow[property] = this.fetchDomData(dom, attribute);
  }
  slideshow.tags = this.fetchDomArray(slideshow_dom, "Tag");
  slideshow.embed = this.fetchEmbed(slideshow_dom);
  return slideshow;
};

var tags = ['nodejs', 'node.js', 'javascript', 'js', 'jquery'],
    crawler = new Crawler();

crawler.fetchSome(tags);
