'use strict';

/**
 * Returns the Bearer token for the evaluation-service Log API.
 * Token is fetched once from env — rotate via environment without code changes.
 */
function getAuthToken() {
  const token = process.env.EVAL_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'EVAL_ACCESS_TOKEN is not set. Run the auth flow and set this environment variable.'
    );
  }
  return token;
}

module.exports = { getAuthToken };
