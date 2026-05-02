'use strict';

const { scheduleAll, scheduleDepot } = require('../service/schedulerService');
const { Log } = require('../../../logging_middleware/logger');

/**
 * GET /schedule
 * Returns optimal maintenance schedule for all depots.
 */
async function getAllSchedules(req, res, next) {
  try {
    Log('backend', 'info', 'handler', 'GET /schedule — scheduling all depots');
    const results = await scheduleAll();
    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    Log('backend', 'error', 'handler', `GET /schedule failed: ${err.message}`);
    return next(err);
  }
}

/**
 * GET /schedule/:depotId
 * Returns optimal maintenance schedule for a single depot.
 */
async function getDepotSchedule(req, res, next) {
  const { depotId } = req.params;
  try {
    Log('backend', 'info', 'handler', `GET /schedule/${depotId}`);
    const result = await scheduleDepot(depotId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    Log('backend', 'error', 'handler', `GET /schedule/${depotId} failed: ${err.message}`);
    return next(err);
  }
}

module.exports = { getAllSchedules, getDepotSchedule };
