var http = require('http')
  , querystring = require('querystring')
  , crypto = require('crypto')
  , underscore = require('underscore')
  , slideshare = require('./slideshare');

var options = {
  host: "www.slideshare.net",
  path: "/api/2/get_slideshows_by_tag?"
};

var fetchSlides = function(tag_name) {
  var now = (Date.now() / 1000).toFixed();
  var sha1 = crypto.createHash('sha1');
  sha1.update(slideshare.secret + now);
  var hashed = sha1.digest('hex');

  var queries = querystring.stringify({
    api_key: slideshare.key,
    ts: now,
    hash: hashed,
    tag: tag_name,
    limit: 50,
    detailed: 1
  });
  var slideshare_options = underscore.clone(options);
  slideshare_options["path"] += queries;

  var req = http.get(slideshare_options, function(res) {
    res.setEncoding("utf8");
    res.on('data', function(data) {
      console.log(data);
    }).on('error', function(e) {
      console.log(e.message);
    });
  });

  req.end();
};

fetchSlides('nodejs');
