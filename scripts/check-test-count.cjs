#!/usr/bin/env node
"use strict";

/**
 * Fail CI when the test suite is missing, broken, or smaller than the
 * configured minimum. `vitest --passWithNoTests` used to let a green build
 * through even when zero tests were discovered; this gate restores that
 * signal by reading the JSON report emitted by the `json` reporter.
 */

const fs = require("node:fs");

const reportPath = process.argv[2] || ".vitest-results.json";
const minimum = Number.parseInt(process.env.MIN_TEST_COUNT || "38", 10);

function fail(message) {
  console.error(`[test-count-gate] FAIL: ${message}`);
  process.exit(1);
}

if (!Number.isFinite(minimum) || minimum < 1) {
  fail(`MIN_TEST_COUNT must be a positive integer (got "${process.env.MIN_TEST_COUNT}")`);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
} catch (error) {
  fail(`could not read vitest report "${reportPath}": ${error.message}`);
}

const {
  numTotalTests = 0,
  numPassedTests = 0,
  numFailedTests = 0,
  numPendingTests = 0,
  numFailedTestSuites = 0,
  numTotalTestSuites = 0,
  success = false,
} = report;

console.log(
  `[test-count-gate] ${numPassedTests} passed, ${numFailedTests} failed, ` +
    `${numPendingTests} pending across ${numTotalTestSuites} file(s) ` +
    `(minimum ${minimum})`
);

if (!success || numFailedTests > 0 || numFailedTestSuites > 0) {
  fail("the test run reported failures");
}

if (numTotalTests < minimum) {
  fail(
    `only ${numTotalTests} test(s) were discovered; expected at least ${minimum}. ` +
      "A broken test setup or deleted tests must not pass CI."
  );
}

console.log(`[test-count-gate] PASS: ${numTotalTests} test(s) meets the minimum of ${minimum}`);
