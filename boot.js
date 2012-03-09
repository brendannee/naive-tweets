var config = require('./config')
  , routes = require('./routes')
  , tweets = require('./tweets');

module.exports = function boot(app){

  config(app);
  
  routes(app);

  tweets(app);

  return app;

}
