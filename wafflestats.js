
/**
 * Module dependencies.
 */

var express = require('express');
var app = express();
var http = require('http');
var path = require('path');

var mongoose = require('mongoose');
require('./models/models.js').initialize();

var redis = require("redis");
var rclient = redis.createClient();

var index = require('./routes/index')();
var current = require('./routes/current')(app, rclient);
var historical = require('./routes/historical')(app, rclient);
var metrics = require('./routes/metrics')(app, rclient);

var notification = require('./routes/notification')(app, rclient);

if (process.env.HASHID === undefined) {
	console.log("Please set 'hashid' environment variable.");
	process.exit(1);
}

app.configure(function() {
	// Waffles Version Info
	app.set('wafflesVersion', '0.66');

	// all environments
	app.set('port', process.env.PORT || 3000);
	app.set('views', path.join(__dirname, 'views'));
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.json());
	app.use(express.urlencoded());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
	app.use(express.errorHandler());
	app.locals.pretty = true;
	mongoose.connect('mongodb://localhost/waffles-dev');
});

// Added to run final development tests on production-levels of data
// Kind of dangerous, but since we only read data this should be fine
app.configure('devel-prod', function() {
	app.use(express.errorHandler());
	app.locals.pretty = true;
	mongoose.connect('mongodb://localhost/waffles');
});

app.configure('test', function() {
	app.use(express.errorHandler());
	app.locals.pretty = true;
	mongoose.connect('mongodb://localhost/waffles-test');
});

app.configure('production', function() {
	mongoose.connect('mongodb://localhost/waffles');
});

// Setup routes
app.get('/', index.get);
app.get('/stats', index.stats);

app.get('/current/:address', current.temp_api);
app.get('/historical/hashRate/:address/:resolution/:range', historical.granularHashRate);
app.get('/historical/balances/:address/:resolution/:range', historical.granularBalances);

app.get('/notification/:address', notification.get);

app.get('/metrics', metrics.get);

// Backwards compatibility
app.get('/temp-api/:address', current.temp_api);
app.get('/historical/:address', historical.get);

http.createServer(app).listen(app.get('port'), function(){
  console.log(
          'Express server listening on port %d within %s environment',
          app.get('port'), app.get('env')
      );
});
