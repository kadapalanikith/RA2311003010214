'use strict';

const express = require('express');
const router  = express.Router();
const { getAllSchedules, getDepotSchedule } = require('../controller/schedulerController');

/**
 * @route  GET /schedule
 * @desc   Optimal maintenance schedule for all depots
 */
router.get('/', getAllSchedules);

/**
 * @route  GET /schedule/:depotId
 * @desc   Optimal maintenance schedule for a single depot
 */
router.get('/:depotId', getDepotSchedule);

module.exports = router;
