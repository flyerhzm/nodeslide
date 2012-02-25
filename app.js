var express = require('express')
  , app = express.createServer()
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
  res.send('Hello World!');
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
    res.render('slideshows/show', { slideshow: slideshow });
  } else {
    next();
  }
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
