/**
 * Search module for BNS Mapper
 * Powered by Fuse.js with direction-aware weighting and multi-statute support
 */

import { DIRECTIONS, STATUTES } from './storage.js';

let fuseInstance = null;
let currentStatute = STATUTES.IPC_BNS;
let currentDirection = DIRECTIONS.IPC_TO_BNS;
const datasets = {
  [STATUTES.IPC_BNS]: [],
  [STATUTES.CRPC_BNSS]: [],
  [STATUTES.IEA_BSA]: []
};

export const searchEngine = {
  init(ipcSections, bnssSections = [], bsaSections = [], direction = DIRECTIONS.IPC_TO_BNS, statute = STATUTES.IPC_BNS) {
    datasets[STATUTES.IPC_BNS] = ipcSections || [];
    datasets[STATUTES.CRPC_BNSS] = bnssSections || [];
    datasets[STATUTES.IEA_BSA] = bsaSections || [];
    currentDirection = direction;
    currentStatute = statute;
    this.rebuildIndex();
  },

  setStatute(statute) {
    if (datasets[statute]) {
      currentStatute = statute;
      this.rebuildIndex();
    }
  },

  getStatute() {
    return currentStatute;
  },

  setDirection(direction) {
    if (currentDirection !== direction) {
      currentDirection = direction;
      this.rebuildIndex();
    }
  },

  rebuildIndex() {
    if (!window.Fuse) {
      console.warn('Fuse.js not found in global window scope.');
      return;
    }

    const activeList = datasets[currentStatute] || [];
    const keys = currentDirection === DIRECTIONS.BNS_TO_IPC
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

    fuseInstance = new window.Fuse(activeList, {
      keys,
      threshold: 0.35,
      distance: 100,
      ignoreLocation: true,
      minMatchCharLength: 1,
      includeScore: true
    });
  },

  search(query, { filterChange = 'all', chapter = 'all' } = {}) {
    const activeList = datasets[currentStatute] || [];
    const trimmed = (query || '').trim();
    let results = [];

    if (!trimmed) {
      results = activeList.slice();
    } else {
      const cleanNum = trimmed.replace(/[^0-9a-zA-Z()]/g, '').toLowerCase();
      const directMatches = [];
      const primaryKey = currentDirection === DIRECTIONS.BNS_TO_IPC ? 'bns' : 'ipc';
      const secondaryKey = currentDirection === DIRECTIONS.BNS_TO_IPC ? 'ipc' : 'bns';

      for (const item of activeList) {
        const pVal = (item[primaryKey] || '').toLowerCase().replace(/[^0-9a-zA-Z()]/g, '');
        const sVal = (item[secondaryKey] || '').toLowerCase().replace(/[^0-9a-zA-Z()]/g, '');

        if (pVal === cleanNum || pVal.startsWith(cleanNum)) {
          directMatches.push({ item, score: 0 });
        } else if (sVal === cleanNum || sVal.startsWith(cleanNum)) {
          directMatches.push({ item, score: 0.05 });
        }
      }

      const fuseResults = fuseInstance ? fuseInstance.search(trimmed) : [];
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

    if (filterChange && filterChange !== 'all') {
      results = results.filter(item => item.change === filterChange);
    }

    if (chapter && chapter !== 'all') {
      results = results.filter(item => item.chapter === chapter);
    }

    return results;
  },

  getAllSections() {
    return datasets[currentStatute] || [];
  },

  getAllSectionsCombined() {
    return [
      ...datasets[STATUTES.IPC_BNS],
      ...datasets[STATUTES.CRPC_BNSS],
      ...datasets[STATUTES.IEA_BSA]
    ];
  },

  getSectionById(idOrNumber) {
    if (!idOrNumber) return null;
    const clean = idOrNumber.toString().trim().toLowerCase();
    const combined = this.getAllSectionsCombined();

    let found = combined.find(s => s.id.toLowerCase() === clean);
    if (found) return found;

    found = combined.find(s => s.ipc.toLowerCase() === clean);
    if (found) return found;

    found = combined.find(s => s.bns.toLowerCase() === clean || s.bns.toLowerCase().startsWith(clean));
    if (found) return found;

    return null;
  }
};
