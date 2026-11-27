/**
 * Test Suite for Pagination Mathematics and Edge Cases
 * Runs in plain Node.js: `node tests/test_pagination.js`
 */

import {
  getPageCount,
  clampPage,
  getSliceBounds,
  generateEllipsis,
  getResultSummary,
  calculatePageForNewPageSize
} from '../js/pagination.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✔ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✖ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    passed++;
    console.log(`  ✔ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✖ FAIL: ${message} (Expected ${expectedStr}, got ${actualStr})`);
  }
}

console.log('\n--- Running Pagination Tests ---\n');

// 1. Page Count Calculations
console.log('1. Page Count Calculations');
assertEqual(getPageCount(358, 20), 18, '358 items with size 20 = 18 pages');
assertEqual(getPageCount(358, 10), 36, '358 items with size 10 = 36 pages');
assertEqual(getPageCount(358, 50), 8, '358 items with size 50 = 8 pages');
assertEqual(getPageCount(0, 20), 1, '0 items = 1 page (minimum 1)');
assertEqual(getPageCount(20, 20), 1, 'Exact page size = 1 page');
assertEqual(getPageCount(21, 20), 2, '21 items with size 20 = 2 pages');

// 2. Clamping
console.log('\n2. Clamping Page Numbers');
assertEqual(clampPage(0, 18), 1, 'Clamp page 0 to 1');
assertEqual(clampPage(-5, 18), 1, 'Clamp negative page to 1');
assertEqual(clampPage(1, 18), 1, 'Valid page 1 stays 1');
assertEqual(clampPage(6, 18), 6, 'Valid page 6 stays 6');
assertEqual(clampPage(18, 18), 18, 'Valid page 18 stays 18');
assertEqual(clampPage(99, 18), 18, 'Clamp out-of-bounds 99 to 18');
assertEqual(clampPage(NaN, 18), 1, 'NaN clamps to 1');
assertEqual(clampPage('abc', 18), 1, 'Non-numeric string clamps to 1');
assertEqual(clampPage('5', 18), 5, 'Numeric string parsed correctly');

// 3. Slice Bounds
console.log('\n3. Slice Bounds');
assertEqual(getSliceBounds(1, 20, 358), { startIndex: 0, endIndex: 20, length: 20 }, 'Page 1 size 20 (0..20)');
assertEqual(getSliceBounds(3, 20, 358), { startIndex: 40, endIndex: 60, length: 20 }, 'Page 3 size 20 (40..60)');
assertEqual(getSliceBounds(18, 20, 358), { startIndex: 340, endIndex: 358, length: 18 }, 'Last page 18 size 20 (340..358)');
assertEqual(getSliceBounds(1, 20, 0), { startIndex: 0, endIndex: 0, length: 0 }, 'Zero items bounds');
assertEqual(getSliceBounds(1, 20, 5), { startIndex: 0, endIndex: 5, length: 5 }, 'Fewer items than page size');

// 4. Ellipsis Generation
console.log('\n4. Ellipsis Generation');
assertEqual(
  generateEllipsis(1, 5),
  [1, 2, 3, 4, 5],
  'Total pages <= 7 shows all numbers without ellipsis'
);

assertEqual(
  generateEllipsis(6, 18),
  [1, '...', 4, 5, 6, 7, 8, '...', 18],
  'Page 6 of 18 shows: 1 ... 4 5 [6] 7 8 ... 18 (Exact prompt specification)'
);

assertEqual(
  generateEllipsis(1, 18),
  [1, 2, 3, 4, 5, '...', 18],
  'Start page 1 of 18 shows left-anchored range'
);

assertEqual(
  generateEllipsis(2, 18),
  [1, 2, 3, 4, 5, '...', 18],
  'Page 2 of 18 shows left-anchored range'
);

assertEqual(
  generateEllipsis(18, 18),
  [1, '...', 14, 15, 16, 17, 18],
  'End page 18 of 18 shows right-anchored range'
);

assertEqual(
  generateEllipsis(17, 18),
  [1, '...', 14, 15, 16, 17, 18],
  'Page 17 of 18 shows right-anchored range'
);

// 5. Result Summary String
console.log('\n5. Result Summary Formatting');
assertEqual(
  getResultSummary(3, 20, 358, 'sections'),
  'Showing 41-60 of 358 sections',
  'Summary: Showing 41-60 of 358 sections (Exact prompt specification)'
);
assertEqual(
  getResultSummary(1, 20, 358, 'sections'),
  'Showing 1-20 of 358 sections',
  'Summary: Page 1'
);
assertEqual(
  getResultSummary(18, 20, 358, 'sections'),
  'Showing 341-358 of 358 sections',
  'Summary: Last page'
);
assertEqual(
  getResultSummary(1, 20, 0, 'sections'),
  'Showing 0 of 0 sections',
  'Summary: 0 items'
);
assertEqual(
  getResultSummary(2, 20, 358, 'sections', true),
  'Showing 1-40 of 358 sections',
  'Summary in load-more mode showing cumulative items'
);

// 6. Page Size Change Keep-in-View
console.log('\n6. Page Size Change Keep-in-View');
assertEqual(
  calculatePageForNewPageSize(4, 10, 50),
  1,
  'Page 4 at size 10 (item 30) maps to Page 1 at size 50'
);
assertEqual(
  calculatePageForNewPageSize(3, 20, 10),
  5,
  'Page 3 at size 20 (item 40) maps to Page 5 at size 10'
);
assertEqual(
  calculatePageForNewPageSize(1, 20, 50),
  1,
  'Page 1 stays Page 1 regardless of size change'
);

console.log(`\n--- Test Results: ${passed} passed, ${failed} failed ---\n`);

if (failed > 0) {
  process.exit(1);
}
