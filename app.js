/*jslint node: true */
'use strict';

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const debug = require('debug')('journey-backend');
const express = require('express');
const fs = require('fs');
const https = require('https');
const http = require('http');
const logger = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');
const path = require('path');

const config = require('./config/config');
const { checkAuthStatus, checkGuestStatus } = require('./utils/auth');

/*
 * API Versioning
 */
const indexRoute = require('./routes/index');
const apiV1Routes = require('./routes/v1/index');

const app = express();
const env = app.get('env');
app.use(cors());
app.options('*', cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/*
 * Connect to Mongo
 */
mongoose.connect(config.database[env].url);
mongoose.Promise = Promise;

if (env !== 'production') {
  app.use(logger('dev'));
}

/*
 * Passport initialization
 */
require('./utils/passport-jwt')(passport);
app.use(passport.initialize());

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/*
 * Route configuration
 */
app.use('/v1', checkAuthStatus, checkGuestStatus, apiV1Routes);
app.use('/', indexRoute);  // Hello World purposes only

/*
 * catch 404 and forward to error handler
 */
app.use((req, res, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/*
 * error handlers
 */

// production error handler: no stacktraces leaked to user
if (env === 'production') {
  app.use((err, req, res, next) => {
    const { message, status } = err;
    res.status(status || 500);
    res.json({ message });
  });
} else {

  // default error handler: will print stacktrace
  app.use((err, req, res, next) => {
    const { message, stack, status } = err;
    res.status(status || 500);
    res.json({
      message,
      error: stack
    });
  });
}

/*
 * Create HTTPS server
 */

// NOTE: HTTPS disabled until we go into a more serious production mode
// const options = {
//   key: fs.readFileSync('key.pem'),
//   cert: fs.readFileSync('cert.pem')
// };
// const server = http.createServer(options, app);

const server = http.createServer(app);
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

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
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
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${port}`;
  debug(`Listening on ${bind}`);
}

/*
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  const port = parseInt(val, 10);

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
