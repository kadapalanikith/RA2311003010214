'use strict';

const VALID_STACKS = ['backend', 'frontend'];

const VALID_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];

const VALID_PACKAGES = {
  backend: ['cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service'],
  frontend: ['api', 'component', 'hook', 'page', 'state', 'style'],
  common: ['auth', 'config', 'middleware', 'utils'],
};

// All valid packages across both stacks (common applies to both)
const ALL_VALID_PACKAGES = [
  ...VALID_PACKAGES.backend,
  ...VALID_PACKAGES.frontend,
  ...VALID_PACKAGES.common,
];

const LOG_API_ENDPOINT = process.env.LOG_API_URL || 'http://20.207.122.201/evaluation-service/logs';

module.exports = {
  VALID_STACKS,
  VALID_LEVELS,
  VALID_PACKAGES,
  ALL_VALID_PACKAGES,
  LOG_API_ENDPOINT,
};
