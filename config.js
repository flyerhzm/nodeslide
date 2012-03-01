var processEnv = process.env;

var config = {
  db: processEnv.MONGOLAB_URI ? processEnv.MONGOLAB_URI : "mongodb://127.0.0.1/nodeslide",
  slideshare_key: processEnv.SLIDESHARE_KEY ? processEnv.SLIDESHARE_KEY : "",
  slideshare_secret: processEnv.SLIDESHARE_SECRET ? porcessEnv.SLIDESHARE_SECRET : "",
  crawl_size: processEnv.CRAWL_SIZE ? processEnv.CRAWL_SIZE : 5
};

exports.config = config;
