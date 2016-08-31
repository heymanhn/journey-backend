/*jslint node: true */
'use strict';

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cors = require('cors');
var debug = require('debug')('journey-backend');
var express = require('express');
var fs = require('fs');
var https = require('https');
var logger = require('morgan');
var mongoose = require('mongoose');
var passport = require('passport');
var path = require('path');

var config = require('./config/config');

/*
 * API Versioning
 */
var indexRoute = require('./routes/index');
var apiV1Routes = require('./routes/v1/index');

/*
 * Connect to Mongo
 */
mongoose.connect(config.database.development.url);
mongoose.Promise = Promise;

var app = express();
app.use(cors());
app.options('*', cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/*
 * Passport initialization
 */
require('./utils/passport-jwt')(passport);
app.use(passport.initialize());

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/*
 * Route configuration
 */
app.use('/v1', apiV1Routes);
app.use('/', indexRoute);

/*
 * catch 404 and forward to error handler
 */
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/*
 * error handlers
 */

// production error handler: no stacktraces leaked to user
if (app.get('env') === 'production') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      message: err.message
    });
  });
} else {
  // default error handler: will print stacktrace
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      message: err.message,
      error: err.stack
    });
  });
}

/*
 * Create HTTPS server
 */
var options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

var server = https.createServer(options, app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/*
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/*
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

/*
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
