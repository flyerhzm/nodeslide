var config = {
    db: "mongodb://127.0.0.1/nodeslide"
  , slideshare_key: ""
  , slideshare_secret: ""
  , crawl_size: 5
}

if (process.env.MONGOLAB_URI) {
  config["db"] = process.env.MONGOLAB_URI;
}

if (process.env.SLIDESHARE_KEY) {
  config["slideshare_key"] = process.env.SLIDESHARE_KEY;
}
if (process.env.SLIDESHARE_SECRET) {
  config["slideshare_secret"] = process.env.slideshare_secret;
}

exports.config = config;
