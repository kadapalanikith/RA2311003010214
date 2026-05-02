'use strict';

/**
 * 0/1 Knapsack solver optimised for the vehicle maintenance scheduling problem.
 *
 * Problem:
 *   Given a set of vehicle tasks {Duration, Impact} and a capacity (MechanicHours),
 *   select a subset of tasks that maximises total Impact without exceeding total Duration.
 *
 * Algorithm: Bottom-up dynamic programming
 *   Time  : O(n × W)   where n = tasks, W = mechanic-hours capacity
 *   Space : O(n × W)   — could be reduced to O(W) but we keep the full table
 *                        so we can reconstruct the selected task list.
 *
 * Why DP and not greedy (impact/duration ratio)?
 *   Greedy does NOT guarantee an optimal solution for the 0/1 knapsack variant.
 *   DP is correct and efficient for the input sizes expected here (hours ≤ ~200,
 *   tasks in the hundreds).
 *
 * @param {Array<{TaskID: string, Duration: number, Impact: number}>} tasks
 * @param {number} capacity - total mechanic hours available
 * @returns {{ selectedTasks: Array, totalImpact: number, totalDuration: number }}
 */
function knapsack(tasks, capacity) {
  const n = tasks.length;
  const W = Math.floor(capacity); // capacity must be an integer for DP table indexing

  // dp[i][w] = max impact using first i tasks with capacity w
  // We use a 1D rolling array to reduce memory: dp[w]
  const dp = new Array(W + 1).fill(0);

  // keep[i][w] = true if task i is selected when capacity is w
  // Required for backtracking — store as flat Uint8Array for performance
  const keep = [];
  for (let i = 0; i <= n; i++) {
    keep.push(new Uint8Array(W + 1));
  }

  for (let i = 1; i <= n; i++) {
    const { Duration: dur, Impact: imp } = tasks[i - 1];
    const weight = Math.floor(dur);
    const value  = imp;

    // Traverse capacity in reverse to avoid using the same item twice (0/1 knapsack)
    for (let w = W; w >= weight; w--) {
      const withItem    = dp[w - weight] + value;
      const withoutItem = dp[w];
      if (withItem > withoutItem) {
        dp[w] = withItem;
        keep[i][w] = 1;
      }
    }
  }

  // Backtrack to find selected tasks
  const selectedTasks = [];
  let w = W;
  for (let i = n; i >= 1; i--) {
    if (keep[i][w]) {
      selectedTasks.push(tasks[i - 1]);
      w -= Math.floor(tasks[i - 1].Duration);
    }
  }

  const totalDuration = selectedTasks.reduce((s, t) => s + t.Duration, 0);
  const totalImpact   = selectedTasks.reduce((s, t) => s + t.Impact,   0);

  return { selectedTasks, totalImpact, totalDuration };
}

module.exports = { knapsack };
