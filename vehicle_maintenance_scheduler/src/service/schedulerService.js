'use strict';

/**
 * Scheduler Service
 *
 * Orchestrates the full scheduling pipeline:
 *  1. Fetch depots and vehicle tasks from the evaluation-service
 *  2. For each depot, run the knapsack optimiser
 *  3. Return a structured result per depot
 */

const { fetchDepots, fetchVehicles } = require('../api/evalClient');
const { knapsack }                   = require('../algorithms/knapsack');
const { Log }                        = require('../../../logging_middleware/logger');

/**
 * Run maintenance scheduling for all depots.
 *
 * @returns {Promise<Array<DepotResult>>}
 */
async function scheduleAll() {
  Log('backend', 'info', 'service', 'Fetching depots from evaluation-service');
  const depots = await fetchDepots();

  Log('backend', 'info', 'service', 'Fetching vehicle tasks from evaluation-service');
  const tasks = await fetchVehicles();

  Log('backend', 'info', 'service', `Fetched ${depots.length} depots, ${tasks.length} tasks`);

  const results = depots.map((depot) => {
    const { ID, MechanicHours } = depot;
    Log('backend', 'debug', 'service', `Solving knapsack for Depot ${ID} (capacity=${MechanicHours}h)`);

    const { selectedTasks, totalImpact, totalDuration } = knapsack(tasks, MechanicHours);

    Log(
      'backend',
      'info',
      'service',
      `Depot ${ID}: selected ${selectedTasks.length} tasks | impact=${totalImpact} | duration=${totalDuration}h`
    );

    return {
      depotID: ID,
      mechanicHours: MechanicHours,
      scheduledTasks: selectedTasks.map((t) => ({
        taskID:   t.TaskID,
        duration: t.Duration,
        impact:   t.Impact,
      })),
      totalDuration,
      totalImpact,
      utilizationPercent: ((totalDuration / MechanicHours) * 100).toFixed(1),
    };
  });

  return results;
}

/**
 * Schedule a single depot by ID.
 *
 * @param {number|string} depotId
 * @returns {Promise<DepotResult>}
 */
async function scheduleDepot(depotId) {
  const depots = await fetchDepots();
  const depot  = depots.find((d) => String(d.ID) === String(depotId));
  if (!depot) {
    const err = new Error(`Depot ${depotId} not found`);
    err.status = 404;
    throw err;
  }

  const tasks = await fetchVehicles();
  const { selectedTasks, totalImpact, totalDuration } = knapsack(tasks, depot.MechanicHours);

  return {
    depotID: depot.ID,
    mechanicHours: depot.MechanicHours,
    scheduledTasks: selectedTasks.map((t) => ({
      taskID:   t.TaskID,
      duration: t.Duration,
      impact:   t.Impact,
    })),
    totalDuration,
    totalImpact,
    utilizationPercent: ((totalDuration / depot.MechanicHours) * 100).toFixed(1),
  };
}

module.exports = { scheduleAll, scheduleDepot };
