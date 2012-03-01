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
}

/* ---------------- original code for reference ------------ */

// slideshow_tbs (short for to be saved) is used to detect if we should close mongo connection
var slideshow_tbs = 0;

var fetchSlides = function(tag_name) {
  var now = (Date.now() / 1000).toFixed();
  var queries = querystring.stringify({
    api_key: config.slideshare_key,
    ts: now,
    hash: generateSlideshareHash(now),
    tag: tag_name,
    limit: config.crawl_size,
    detailed: 1
  });
  var slideshare_options = {
    host: "www.slideshare.net",
    path: "/api/2/get_slideshows_by_tag?" + queries
  };

  var xml_handler = new htmlparser.DefaultHandler(function(err, dom) {
    if (err) {
      console.log(err.message);
    } else {
      var slideshow_doms = DomUtils.getElementsByTagName("Slideshow", dom);
      slideshow_tbs += slideshow_doms.length;
      var index;
      for (index = 0; index < slideshow_doms.length; index++) {
        var slideshow = initSlideshare(slideshow_doms[index]);
        slideshow.save(function(err) {
          if (err) { console.log(err.message); }
          slideshow_tbs--;
        });
      };
    }
  }, {verbose: false});

  var req = http.get(slideshare_options, function(res) {
    res.setEncoding("utf8");
    var response_body = "";
    res.on('data', function(data) {
      response_body += data;
    }).on('end', function() {
      var parser = new htmlparser.Parser(xml_handler);
      parser.parseComplete(response_body);
    }).on('error', function(err) {
      console.log(err.message);
    });
  });

  req.end();
};

var generateSlideshareHash = function(now) {
  var sha1 = crypto.createHash('sha1');
  sha1.update(config.slideshare_secret + now);
  return sha1.digest('hex');
};

var initSlideshare = function(slideshow_dom) {
  var slideshow = new Slideshow();
  slideshow.title = fetchDomData(slideshow_dom, "Title");
  slideshow.description = fetchDomData(slideshow_dom, "Description");
  slideshow.username = fetchDomData(slideshow_dom, "Username");
  slideshow.url = fetchDomData(slideshow_dom, "URL");
  slideshow.created = fetchDomData(slideshow_dom, "Created");
  slideshow.tags = fetchDomArray(slideshow_dom, "Tag");
  slideshow.slideshare_id = fetchDomData(slideshow_dom, "ID");
  slideshow.embed = fetchEmbed(slideshow_dom);
  return slideshow;
};

// htmlparser can't parse the Embed section correctly, have to iterate all tags with data type.
var fetchEmbed = function(dom) {
  var data_doms = DomUtils.getElementsByTagType("text", dom);
  var index;
  for (index = 0; index < data_doms.length; index++) {
    var data_dom = data_doms[index];
    if (data_dom.data.indexOf("static.slidesharecdn.com/swf/ssplayer2.swf") !== -1) {
      return data_dom.data;
    }
  }
}

var fetchDomData = function(dom, name) {
  var data_dom = DomUtils.getElementsByTagName(name, dom)
    , data = "";
  if (data_dom[0]["children"]) {
    data = data_dom[0]["children"][0]["data"];
  }
  return data;
};

var fetchDomArray = function(dom, name) {
  var data_dom = DomUtils.getElementsByTagName(name, dom)
    , data = []
    , index = 0;

  for (index = 0; index < data_dom.length; index += 1) {
    var child_dom = data_dom[index];
    if (child_dom["children"]) {
      data.push(child_dom["children"][0]["data"]);
    };
  };
  return data;
};

fetchSlides('nodejs');
fetchSlides('node.js');
fetchSlides('javascript');
fetchSlides('js');
fetchSlides('jquery');

// WTF, I hate disconnecting mongo by setTimeout
var intervalId = setInterval(function() {
  if (slideshow_tbs === 0) {
    mongoose.disconnect();
    clearInterval(intervalId);
  }
}, 5000);
