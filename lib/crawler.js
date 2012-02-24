var http = require('http'),
    querystring = require('querystring'),
    crypto = require('crypto'),
    sys = require('util'),
    mongoose = require('mongoose'),
    underscore = require('underscore'),
    htmlparser = require('htmlparser'),
    DomUtils = htmlparser.DomUtils,
    config = require('../config').config,
    models = require('../models'),
    Slideshow = models.Slideshow;

var options = {
  host: "www.slideshare.net",
  path: "/api/2/get_slideshows_by_tag?"
};

var fetchDomData = function(dom, name) {
  var data_dom = DomUtils.getElementsByTagName(name, dom);
  var data = "";
  if (data_dom[0]["children"]) {
    data = data_dom[0]["children"][0]["data"];
  }
  return data;
};

var fetchDomArray = function(dom, name) {
  var data_dom = DomUtils.getElementsByTagName(name, dom);
  var data = [];
  underscore.each(data_dom, function(child_dom) {
    if (child_dom["children"]) {
      data.push(child_dom["children"][0]["data"]);
    };
  });
  return data;
};

var fetchSlides = function(tag_name) {
  var now = (Date.now() / 1000).toFixed();
  var sha1 = crypto.createHash('sha1');
  sha1.update(config.slideshare_secret + now);
  var hashed = sha1.digest('hex');

  var queries = querystring.stringify({
    api_key: config.slideshare_key,
    ts: now,
    hash: hashed,
    tag: tag_name,
    limit: 5,
    detailed: 1
  });
  var slideshare_options = underscore.clone(options);
  slideshare_options["path"] += queries;

  var xml_handler = new htmlparser.DefaultHandler(function(error, dom) {
    if (error) {
      console.log(error.message);
    } else {
      var slideshow_doms = DomUtils.getElementsByTagName("Slideshow", dom);
      var slideshow_states = new Array(slideshow_doms.length);
      var index, slideshow_dom;
      for (index = 0; index < slideshow_states.length; index++) {
        slideshow_dom = slideshow_doms[index];
        var slideshow = new Slideshow();
        slideshow.title = fetchDomData(slideshow_dom, "Title");
        slideshow.description = fetchDomData(slideshow_dom, "Description");
        slideshow.username = fetchDomData(slideshow_dom, "Username");
        slideshow.url = fetchDomData(slideshow_dom, "URL");
        slideshow.created = fetchDomData(slideshow_dom, "Created");
        slideshow.tags = fetchDomArray(slideshow_dom, "Tag");

        slideshow.save(function(err) {
          if (error) { console.log(error.message); }
          slideshow_states.pop();
        });
      };

      // WTF, I hate disconnecting mongo by setTimeout
      var intervalId = setInterval(function() {
        if (slideshow_states.length === 0) {
          mongoose.disconnect();
          clearInterval(intervalId);
        }
      }, 5000);
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
    }).on('error', function(error) {
      console.log(error.message);
    });
  });

  req.end();
};

fetchSlides('nodejs');
