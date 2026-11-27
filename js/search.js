/**
 * Search module for BNS Mapper
 * Powered by Fuse.js with direction-aware weighting and exact section boost
 */

import { DIRECTIONS } from './storage.js';

let fuseInstance = null;
let allSections = [];
let currentDirection = DIRECTIONS.IPC_TO_BNS;

export const searchEngine = {
  init(sections, direction = DIRECTIONS.IPC_TO_BNS) {
    allSections = sections;
    currentDirection = direction;
    this.rebuildIndex(direction);
  },

  setDirection(direction) {
    if (currentDirection !== direction) {
      currentDirection = direction;
      this.rebuildIndex(direction);
    }
  },

  rebuildIndex(direction) {
    if (!window.Fuse) {
      console.warn('Fuse.js not found in global window scope.');
      return;
    }

    // Configure keys and weights based on active direction
    // If IPC -> BNS: IPC number gets highest priority
    // If BNS -> IPC: BNS number gets highest priority
    const keys = direction === DIRECTIONS.BNS_TO_IPC
      ? [
          { name: 'bns', weight: 0.45 },
          { name: 'title', weight: 0.25 },
          { name: 'ipc', weight: 0.15 },
          { name: 'tags', weight: 0.10 },
          { name: 'explanation', weight: 0.05 }
        ]
      : [
          { name: 'ipc', weight: 0.45 },
          { name: 'title', weight: 0.25 },
          { name: 'bns', weight: 0.15 },
          { name: 'tags', weight: 0.10 },
          { name: 'explanation', weight: 0.05 }
        ];

    fuseInstance = new window.Fuse(allSections, {
      keys,
      threshold: 0.35,
      distance: 100,
      ignoreLocation: true,
      minMatchCharLength: 1,
      includeScore: true
    });
  },

  search(query, { filterChange = 'all', chapter = 'all' } = {}) {
    const trimmed = (query || '').trim();
    let results = [];

    if (!trimmed) {
      // No query: return all sections
      results = allSections.slice();
    } else {
      // 1. Direct exact or prefix section number match boost
      const cleanNum = trimmed.replace(/[^0-9a-zA-Z()]/g, '').toLowerCase();
      const directMatches = [];
      const primaryKey = currentDirection === DIRECTIONS.BNS_TO_IPC ? 'bns' : 'ipc';
      const secondaryKey = currentDirection === DIRECTIONS.BNS_TO_IPC ? 'ipc' : 'bns';

      // Check if user typed an exact or prefix section number
      for (const item of allSections) {
        const pVal = (item[primaryKey] || '').toLowerCase().replace(/[^0-9a-zA-Z()]/g, '');
        const sVal = (item[secondaryKey] || '').toLowerCase().replace(/[^0-9a-zA-Z()]/g, '');

        if (pVal === cleanNum || pVal.startsWith(cleanNum)) {
          directMatches.push({ item, score: 0 });
        } else if (sVal === cleanNum || sVal.startsWith(cleanNum)) {
          directMatches.push({ item, score: 0.05 });
        }
      }

      // 2. Fuzzy search via Fuse
      const fuseResults = fuseInstance ? fuseInstance.search(trimmed) : [];

      // Combine direct matches and fuzzy results without duplicates
      const seenIds = new Set();
      results = [];

      for (const dm of directMatches) {
        if (!seenIds.has(dm.item.id)) {
          seenIds.add(dm.item.id);
          results.push(dm.item);
        }
      }

      for (const fr of fuseResults) {
        if (!seenIds.has(fr.item.id)) {
          seenIds.add(fr.item.id);
          results.push(fr.item);
        }
      }
    }

    // Apply change type filter
    if (filterChange && filterChange !== 'all') {
      results = results.filter(item => item.change === filterChange);
    }

    // Apply chapter filter
    if (chapter && chapter !== 'all') {
      results = results.filter(item => item.chapter === chapter);
    }

    return results;
  },

  getAllSections() {
    return allSections;
  },

  getSectionById(idOrNumber) {
    if (!idOrNumber) return null;
    const clean = idOrNumber.toString().trim().toLowerCase();

    // 1. Exact ID match (e.g., "ipc-302")
    let found = allSections.find(s => s.id.toLowerCase() === clean);
    if (found) return found;

    // 2. Exact IPC number match (e.g., "302" or "304b")
    found = allSections.find(s => s.ipc.toLowerCase() === clean);
    if (found) return found;

    // 3. Exact BNS number match (e.g., "103" or "103(1)")
    found = allSections.find(s => s.bns.toLowerCase() === clean || s.bns.toLowerCase().startsWith(clean));
    if (found) return found;

    return null;
  }
};
