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
  this.unsaved_count = 0;
  this.slideshare = new Slideshare;
  this.httpHandler = (new Crawler.HttpHandler(this)).handler;
};

/* generateSlideshareHash */
Crawler.prototype.timeHash = function(now) {
  var seed = config.slideshare_secret + now;
  sha1 = crypto.createHash('sha1');
  sha1.update(seed);
  return sha1.digest('hex');
};

Crawler.prototype.createHTTPOptions = function(tag, timestamp) {
  var queries = querystring.stringify({
    api_key: config.slideshare_key,
    ts: timestamp,
    hash: this.timeHash(timestamp),
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

Crawler.XmlHandler = function(self) {
  var handler = new htmlparser.DefaultHandler(function(err, dom) {
    console.log("calling XmlHandler");
    if (err) {
      console.log(err.message);
    } else {
      var slideshow_doms = DomUtils.getElementsByTagName("Slideshow", dom);
      self.unsaved_count += slideshow_doms.length;

      for (var index = 0; index < slideshow_doms.length; index++) {
        var slideshow = self.slideshare.createSlideshow(slideshow_doms[index]);
        slideshow.save(function(err) {
          if (err) { console.log(err.message); }
          self.unsaved_count--;
        });
      };
    }
  }, {verbose: false});

  this.handler = handler;
};

Crawler.HttpHandler = function(self) {
  var handler = function(response) {
    console.log("calling HttpHandler");
    response.setEncoding("utf8");
    var response_body = "",
        xml_handler = self.xml_handler;

    response.on('data', function(data) {
      response_body += data;
    }).on('end', function() {
      var xmlHandler = (new Crawler.XmlHandler(self)).handler;
      var parser = new htmlparser.Parser(xmlHandler);
      parser.parseComplete(response_body);
    }).on('error', function(err) {
      console.log(err.message);
    });
  }

  this.handler = handler;
};

Crawler.prototype.fetchAndSave = function(tag, now) {
  console.log("fetchAndSave: tag=" + tag + " now=" + now);
  if (!now) {
    // This simulate the default parameter value
    now = (Date.now() / 1000).toFixed();
  }

  var httpOptions = this.createHTTPOptions(tag, now);

  console.log("get httpOptions=" + httpOptions.host + " path=" + httpOptions.path);
  console.log(this.httpHandler);
  req = http.get(httpOptions, this.httpHandler);
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
      var embed = data_dom.data;
      embed = embed.replace(/&lt;/g, "<");
      embed = embed.replace(/&gt;/g, ">");
      embed = embed.replace(/&quot;/g, '"');
      return embed;
      return data_dom.data;
    }
  }
};

Slideshare.prototype.createSlideshow = function(slideshow_dom) {
  var slideshow = new Slideshow();
  var propertyMapping = this.SlideshowPropertyMapping;
  for (var property in propertyMapping) {
    var attribute = this.SlideshowPropertyMapping[property];
    slideshow[property] = this.fetchDomData(slideshow_dom, attribute);
  }
  slideshow.tags = this.fetchDomArray(slideshow_dom, "Tag");
  slideshow.embed = this.fetchEmbed(slideshow_dom);
  return slideshow;
};

var tags = ['nodejs', 'node.js', 'javascript', 'js', 'jquery'],
    crawler = new Crawler();

crawler.fetchSome(tags);
