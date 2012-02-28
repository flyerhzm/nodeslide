var express = require('express')
  , app = express.createServer()
  , RSS = require('rss')
  , models = require('./models')
  , Slideshow = models.Slideshow;

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
  Slideshow.find({}).limit(10).exec(function(err, docs) {
    if (err) {
      next(new Error('Failed to load slideshows'));
    } else {
      req.slideshows = docs;
      next();
    }
  });
}

app.get('/slideshows', loadSlideshows, function(req, res, next) {
  var slideshows = req.slideshows;
  if (slideshows) {
    res.render('slideshows/index', { slideshows: slideshows });
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
  var index;
  for (index = 0; index < slideshows.length; index += 1) {
    var slideshow = slideshows[index];
    feed.item({
      title: slideshow.title,
      description: slideshow.description + slideshow.embed,
      url: slideshow.url,
      author: slideshow.username,
      date: slideshow.created
    });
  };
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
