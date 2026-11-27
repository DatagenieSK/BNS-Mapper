/**
 * Validation script for BNS Mapper sections dataset & quiz scenarios
 * Validates all datasets against schema criteria and integrity constraints.
 * Run with: node scripts/validate.js
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'data', 'schema.json');
const dataFiles = [
  { name: 'IPC -> BNS', path: path.join(__dirname, '..', 'data', 'sections.json') },
  { name: 'CrPC -> BNSS', path: path.join(__dirname, '..', 'data', 'bnss_sections.json') },
  { name: 'IEA -> BSA', path: path.join(__dirname, '..', 'data', 'bsa_sections.json') }
];
const scenariosPath = path.join(__dirname, '..', 'data', 'quiz_scenarios.json');

function validate() {
  console.log('--- Validating BNS Mapper Datasets & Scenarios ---');

  if (!fs.existsSync(schemaPath)) {
    console.error(`Error: Schema file not found at ${schemaPath}`);
    process.exit(1);
  }

  const requiredFields = [
    'id', 'ipc', 'bns', 'title', 'chapter', 'change',
    'old_text', 'new_text', 'punishment_old', 'punishment_new',
    'explanation', 'tags', 'verified', 'source'
  ];
  const validChanges = ['renumbered', 'modified', 'merged', 'split', 'new', 'omitted'];
  let totalErrors = 0;
  let totalSections = 0;

  // 1. Validate Statute Section Files
  for (const item of dataFiles) {
    if (!fs.existsSync(item.path)) {
      console.error(`Error: Data file not found for ${item.name} at ${item.path}`);
      totalErrors++;
      continue;
    }

    let list;
    try {
      list = JSON.parse(fs.readFileSync(item.path, 'utf8'));
    } catch (e) {
      console.error(`Error parsing ${item.name}: ${e.message}`);
      totalErrors++;
      continue;
    }

    if (!Array.isArray(list)) {
      console.error(`Error in ${item.name}: Must be an array`);
      totalErrors++;
      continue;
    }

    const seenIds = new Set();
    list.forEach((entry, idx) => {
      const label = `${item.name} #${idx + 1} (${entry.id || 'no-id'})`;
      for (const field of requiredFields) {
        if (entry[field] === undefined || entry[field] === null) {
          console.error(`${label}: Missing required field '${field}'`);
          totalErrors++;
        }
      }
      if (entry.id) {
        if (seenIds.has(entry.id)) {
          console.error(`${label}: Duplicate id '${entry.id}'`);
          totalErrors++;
        }
        seenIds.add(entry.id);
      }
      if (entry.change && !validChanges.includes(entry.change)) {
        console.error(`${label}: Invalid change '${entry.change}'`);
        totalErrors++;
      }
      if (entry.tags && !Array.isArray(entry.tags)) {
        console.error(`${label}: 'tags' must be an array`);
        totalErrors++;
      }
    });

    console.log(`✔ ${item.name}: ${list.length} sections validated.`);
    totalSections += list.length;
  }

  // 2. Validate Quiz Scenarios
  if (!fs.existsSync(scenariosPath)) {
    console.error(`Error: Scenarios file not found at ${scenariosPath}`);
    totalErrors++;
  } else {
    let scenarios;
    try {
      scenarios = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));
    } catch (e) {
      console.error(`Error parsing quiz scenarios: ${e.message}`);
      totalErrors++;
    }

    if (Array.isArray(scenarios)) {
      const scenRequired = ['id', 'title', 'scenario', 'options', 'correctIndex', 'bns_section', 'explanation', 'chapter'];
      const seenScenIds = new Set();

      scenarios.forEach((sc, idx) => {
        const label = `Scenario #${idx + 1} (${sc.id || 'no-id'})`;
        for (const req of scenRequired) {
          if (sc[req] === undefined || sc[req] === null) {
            console.error(`${label}: Missing field '${req}'`);
            totalErrors++;
          }
        }
        if (sc.id) {
          if (seenScenIds.has(sc.id)) {
            console.error(`${label}: Duplicate scenario id '${sc.id}'`);
            totalErrors++;
          }
          seenScenIds.add(sc.id);
        }
        if (!Array.isArray(sc.options) || sc.options.length < 2) {
          console.error(`${label}: 'options' must be an array of at least 2 items`);
          totalErrors++;
        }
        if (typeof sc.correctIndex !== 'number' || sc.correctIndex < 0 || sc.correctIndex >= (sc.options ? sc.options.length : 0)) {
          console.error(`${label}: 'correctIndex' is out of bounds`);
          totalErrors++;
        }
      });
      console.log(`✔ Quiz Scenarios: ${scenarios.length} scenarios validated.`);
    } else {
      console.error(`Error: quiz_scenarios.json must contain an array.`);
      totalErrors++;
    }
  }

  if (totalErrors > 0) {
    console.error(`\nValidation failed with ${totalErrors} error(s).`);
    process.exit(1);
  }

  console.log(`\n\x1b[32m✔ All validation checks passed cleanly! (Total legal sections: ${totalSections})\x1b[0m`);
}

validate();
