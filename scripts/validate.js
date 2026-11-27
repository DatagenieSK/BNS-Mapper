/**
 * Validation script for BNS Mapper sections dataset
 * Validates data/sections.json against schema criteria and integrity constraints.
 * Run with: node scripts/validate.js
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'sections.json');
const schemaPath = path.join(__dirname, '..', 'data', 'schema.json');

function validate() {
  console.log('--- Validating BNS Mapper Data ---');

  if (!fs.existsSync(dataPath)) {
    console.error(`Error: Data file not found at ${dataPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(schemaPath)) {
    console.error(`Error: Schema file not found at ${schemaPath}`);
    process.exit(1);
  }

  let sections, schema;
  try {
    sections = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (err) {
    console.error(`Error: Failed to parse data/sections.json:`, err.message);
    process.exit(1);
  }

  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (err) {
    console.error(`Error: Failed to parse data/schema.json:`, err.message);
    process.exit(1);
  }

  if (!Array.isArray(sections)) {
    console.error('Validation failure: Root element must be an Array.');
    process.exit(1);
  }

  const requiredFields = [
    'id', 'ipc', 'bns', 'title', 'chapter', 'change',
    'old_text', 'new_text', 'punishment_old', 'punishment_new',
    'explanation', 'tags', 'verified', 'source'
  ];

  const validChanges = ['renumbered', 'modified', 'merged', 'split', 'new', 'omitted'];
  const seenIds = new Set();
  const errors = [];

  sections.forEach((entry, index) => {
    const label = `Entry #${index + 1} (${entry.id || 'missing-id'})`;

    // Check required fields
    for (const field of requiredFields) {
      if (entry[field] === undefined || entry[field] === null) {
        errors.push(`${label}: Missing required field '${field}'`);
      }
    }

    // Unique ID check
    if (entry.id) {
      if (seenIds.has(entry.id)) {
        errors.push(`${label}: Duplicate id '${entry.id}'`);
      }
      seenIds.add(entry.id);
    }

    // Change enum check
    if (entry.change && !validChanges.includes(entry.change)) {
      errors.push(`${label}: Invalid change '${entry.change}'. Must be one of: ${validChanges.join(', ')}`);
    }

    // Tags check
    if (entry.tags && !Array.isArray(entry.tags)) {
      errors.push(`${label}: 'tags' must be an array`);
    }

    // Verified check
    if (typeof entry.verified !== 'boolean') {
      errors.push(`${label}: 'verified' must be a boolean`);
    }

    // Strings non-empty where sensible
    if (typeof entry.title !== 'string' || entry.title.trim().length === 0) {
      errors.push(`${label}: 'title' must be a non-empty string`);
    }
  });

  if (errors.length > 0) {
    console.error(`\nValidation failed with ${errors.length} error(s):`);
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log(`\x1b[32m✔ Validation passed!\x1b[0m`);
  console.log(`Total sections loaded: ${sections.length}`);
  const changeCounts = sections.reduce((acc, s) => {
    acc[s.change] = (acc[s.change] || 0) + 1;
    return acc;
  }, {});
  console.log('Change type breakdown:', changeCounts);
  const unverifiedCount = sections.filter(s => !s.verified).length;
  console.log(`Unverified entries count: ${unverifiedCount} (marked for verification against official gazette)`);
}

validate();
