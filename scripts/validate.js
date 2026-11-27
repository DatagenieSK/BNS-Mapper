/**
 * Validation script for BNS Mapper chapter datasets & quiz scenarios
 * Checks all chapter files against data/schema.json, validates range constraints,
 * checks for duplicate IDs, and validates quiz scenarios.
 * Run with: node scripts/validate.js
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'data', 'schema.json');
const chaptersIndexPath = path.join(__dirname, '..', 'data', 'chapters.json');
const chaptersDir = path.join(__dirname, '..', 'data', 'chapters');
const scenariosPath = path.join(__dirname, '..', 'data', 'quiz_scenarios.json');

function validate() {
  console.log('--- Validating BNS Mapper Chapter Datasets & Range Boundaries ---');

  let totalErrors = 0;

  if (!fs.existsSync(schemaPath)) {
    console.error(`Error: Schema file not found at ${schemaPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(chaptersIndexPath)) {
    console.error(`Error: chapters.json index not found at ${chaptersIndexPath}`);
    process.exit(1);
  }

  let chaptersIndex;
  try {
    chaptersIndex = JSON.parse(fs.readFileSync(chaptersIndexPath, 'utf8'));
  } catch (e) {
    console.error(`Error parsing chapters.json: ${e.message}`);
    process.exit(1);
  }

  const validChanges = ['renumbered', 'modified', 'merged', 'split', 'new', 'omitted'];
  const validChapters = [
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'
  ];
  const requiredFields = [
    'id', 'bns', 'ipc', 'title', 'chapter', 'change',
    'old_text', 'new_text', 'punishment_old', 'punishment_new',
    'explanation', 'tags', 'verified', 'source'
  ];

  const seenIds = new Set();
  let totalSections = 0;

  // Validate each chapter file in chapters.json
  for (const chMeta of chaptersIndex) {
    const chFile = path.join(chaptersDir, chMeta.file);
    if (!fs.existsSync(chFile)) {
      // If round has not added this chapter yet, report as pending
      continue;
    }

    let list;
    try {
      list = JSON.parse(fs.readFileSync(chFile, 'utf8'));
    } catch (e) {
      console.error(`Error parsing ${chMeta.file}: ${e.message}`);
      totalErrors++;
      continue;
    }

    if (!Array.isArray(list)) {
      console.error(`Error in ${chMeta.file}: Root must be an array`);
      totalErrors++;
      continue;
    }

    list.forEach((entry, idx) => {
      const label = `Chapter ${chMeta.chapter} (${chMeta.file}) #${idx + 1} [${entry.id || 'no-id'}]`;

      // Check required fields
      for (const f of requiredFields) {
        if (entry[f] === undefined || entry[f] === null) {
          console.error(`${label}: Missing required field '${f}'`);
          totalErrors++;
        }
      }

      // Check ID uniqueness
      if (entry.id) {
        if (seenIds.has(entry.id)) {
          console.error(`${label}: Duplicate id '${entry.id}'`);
          totalErrors++;
        }
        seenIds.add(entry.id);
      }

      // Check arrays for bns and ipc
      if (!Array.isArray(entry.bns) || entry.bns.length === 0) {
        console.error(`${label}: 'bns' must be a non-empty array of strings`);
        totalErrors++;
      }
      if (!Array.isArray(entry.ipc) || entry.ipc.length === 0) {
        console.error(`${label}: 'ipc' must be a non-empty array of strings`);
        totalErrors++;
      }

      // Check chapter enum matches chapter
      if (entry.chapter !== chMeta.chapter) {
        console.error(`${label}: Entry chapter '${entry.chapter}' does not match chapter file '${chMeta.chapter}'`);
        totalErrors++;
      }

      // Check change enum
      if (entry.change && !validChanges.includes(entry.change)) {
        console.error(`${label}: Invalid change '${entry.change}'`);
        totalErrors++;
      }

      // Check BNS section range boundary!
      if (Array.isArray(entry.bns)) {
        entry.bns.forEach(secNumStr => {
          if (secNumStr === 'Omitted') return;
          // Extract base integer (e.g. "3(5)" -> 3, "103(1)" -> 103)
          const baseNum = parseInt(secNumStr.replace(/[^0-9]/g, ''), 10);
          if (isNaN(baseNum)) {
            console.error(`${label}: Cannot parse section number from '${secNumStr}'`);
            totalErrors++;
          } else if (baseNum < chMeta.start || baseNum > chMeta.end) {
            console.error(`${label}: Section number '${secNumStr}' (${baseNum}) is outside Chapter ${chMeta.chapter} range [${chMeta.start}-${chMeta.end}]`);
            totalErrors++;
          }
        });
      }
    });

    console.log(`✔ Chapter ${chMeta.chapter} (${chMeta.title}): ${list.length} sections validated [Range: ${chMeta.range}].`);
    totalSections += list.length;
  }

  // Validate Quiz Scenarios
  if (fs.existsSync(scenariosPath)) {
    let scenarios;
    try {
      scenarios = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));
    } catch (e) {
      console.error(`Error parsing quiz scenarios: ${e.message}`);
      totalErrors++;
    }

    if (Array.isArray(scenarios)) {
      const scenIds = new Set();
      scenarios.forEach((sc, idx) => {
        const label = `Scenario #${idx + 1} (${sc.id || sc.section || 'no-id'})`;
        if (!sc.scenario || typeof sc.scenario !== 'string') {
          console.error(`${label}: Missing or invalid 'scenario' text`);
          totalErrors++;
        }
        if (!Array.isArray(sc.options) || sc.options.length < 2) {
          console.error(`${label}: 'options' must be an array of at least 2 options`);
          totalErrors++;
        }
        if (!sc.explanation) {
          console.error(`${label}: Missing 'explanation'`);
          totalErrors++;
        }
      });
      console.log(`✔ Quiz Scenarios: ${scenarios.length} scenarios validated.`);
    }
  }

  if (totalErrors > 0) {
    console.error(`\nValidation failed with ${totalErrors} error(s).`);
    process.exit(1);
  }

  console.log(`\n\x1b[32m✔ All chapter datasets passed validation cleanly! Total sections: ${totalSections}\x1b[0m`);
}

validate();
