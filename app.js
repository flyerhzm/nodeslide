var express = require('express'),
  app = express.createServer(),
  RSS = require('rss'),
  models = require('./models'),
  Slideshow = models.Slideshow;

app.configure(function(){
  app.use(express.logger());
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  app.use(app.router);
  app.set('view engine', 'jade');
  app.set('view options', { layout: false });
});

app.configure('development', function(){
  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
  app.use(express.errorHandler());
});

app.get('/', function(req, res) {
  res.redirect('/slideshows');
});

function loadSlideshows(req, res, next) {
  var page = parseInt(req.query.page || 1),
    per_page = 10,
    offset = (page - 1) * per_page;

  req.current_page = page;
  Slideshow.find({}).limit(per_page).skip(offset).desc("created").exec(function(err, docs) {
    if (err) {
      next(new Error('Failed to load slideshows'));
    } else {
      req.slideshows = docs;
      next();
    }
  });
}

function initPagination(req, res, next) {
  Slideshow.count({}, function(err, count) {
    if (err) {
      next(new Error('Failed to init pagination for slideshows'));
    } else {
      var per_page = 10;
      req.total_count = count;
      req.total_pages = Math.ceil(count / 10);
      next();
    }
  });
}

app.get('/slideshows', loadSlideshows, initPagination, function(req, res, next) {
  if (req.slideshows) {
    res.render('slideshows/index', { slideshows: req.slideshows, current_page: req.current_page, total_count: req.total_count, total_page: req.total_pages });
  } else {
    next();
  }
});


function generateFeeds(req, res, next) {
  var feed = new RSS({
    title: "Nodeslide RSS",
    description: "Nodeslide gathers all the latest node.js slides and presentations in one convenient place!",
    feed_url: "http://feeds.feedburner.com/nodeslide",
    site_url: "http://nodeslide.herokuapp.com",
    author: "Richard Huang <flyerhzm@gmail.com>"
  });
  var slideshows = req.slideshows;
  for (var index = 0, length = slideshows.length; index < length; index += 1) {
    var slideshow = slideshows[index];
    feed.item({
      title: slideshow.title,
      description: slideshow.description + slideshow.embed,
      url: slideshow.url,
      author: slideshow.username,
      date: slideshow.created
    });
  }
  req.feeds = feed.xml();
  next();
}

app.get('/slideshows.xml', loadSlideshows, generateFeeds, function(req, res, next) {
  var feeds = req.feeds;
  if (feeds) {
    res.send(feeds);
  } else {
    next();
  }
});

function loadSlideshow(req, res, next) {
  Slideshow.findById(req.params.id, function(err, doc) {
    if (err) {
      next(new Error('Failed to load slideshow ' + req.params.id));
    } else {
      req.slideshow = doc;
      next();
    }
  });
}

app.get('/slideshows/:id', loadSlideshow, function(req, res, next) {
  var slideshow = req.slideshow;
  if (slideshow) {
    res.redirect(slideshow.url);
  } else {
    next();
  }
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
