'use strict';

/**
 * Unit tests for the 0/1 Knapsack algorithm.
 * Run: node test/knapsack.test.js
 */

const assert    = require('assert');
const { knapsack } = require('../src/algorithms/knapsack');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌  ${name}\n     ${err.message}`);
    failed++;
  }
}

console.log('\n=== Knapsack Algorithm Tests ===\n');

// Classic known-answer test
test('selects optimal subset (classic example)', () => {
  const tasks = [
    { TaskID: 'A', Duration: 1, Impact: 1 },
    { TaskID: 'B', Duration: 3, Impact: 4 },
    { TaskID: 'C', Duration: 4, Impact: 5 },
    { TaskID: 'D', Duration: 5, Impact: 7 },
  ];
  const { totalImpact, totalDuration } = knapsack(tasks, 7);
  // Optimal: B (3h, 4) + D (5h, 7) = 8h > 7 → B + C = 7h, 9 impact
  //          or A (1h,1) + D (5h,7) = 6h, 8 impact
  //          or B(3)+C(4)=7h, 9 impact ✓
  assert.strictEqual(totalImpact, 9, `Expected 9 got ${totalImpact}`);
  assert.ok(totalDuration <= 7, `Duration ${totalDuration} exceeds capacity 7`);
});

test('returns empty when capacity is 0', () => {
  const tasks = [{ TaskID: 'X', Duration: 5, Impact: 10 }];
  const { selectedTasks, totalImpact } = knapsack(tasks, 0);
  assert.strictEqual(selectedTasks.length, 0);
  assert.strictEqual(totalImpact, 0);
});

test('returns empty when tasks array is empty', () => {
  const { selectedTasks, totalImpact } = knapsack([], 100);
  assert.strictEqual(selectedTasks.length, 0);
  assert.strictEqual(totalImpact, 0);
});

test('never exceeds capacity', () => {
  const tasks = Array.from({ length: 20 }, (_, i) => ({
    TaskID: `T${i}`,
    Duration: Math.floor(Math.random() * 20) + 1,
    Impact:   Math.floor(Math.random() * 10) + 1,
  }));
  const capacity = 50;
  const { totalDuration } = knapsack(tasks, capacity);
  assert.ok(totalDuration <= capacity, `Duration ${totalDuration} exceeded capacity ${capacity}`);
});

test('selects single task when only one fits', () => {
  const tasks = [
    { TaskID: 'A', Duration: 10, Impact: 5 },
    { TaskID: 'B', Duration: 3,  Impact: 8 },
  ];
  const { selectedTasks, totalImpact } = knapsack(tasks, 4);
  assert.strictEqual(selectedTasks.length, 1);
  assert.strictEqual(totalImpact, 8); // B fits, A doesn't
});

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
