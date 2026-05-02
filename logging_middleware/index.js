'use strict';

const logger = require('./logger');
const requestLogger = require('./middleware/requestLogger');

module.exports = {
  logger,
  requestLogger,
};
