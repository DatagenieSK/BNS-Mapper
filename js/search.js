/**
 * Search module for BNS Mapper
 * Supports array-based section mappings (e.g. IPC [300, 302] -> BNS [103]),
 * lazy Fuse.js indexing, and multi-statute datasets.
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
    fuseInstance = null; // Mark index as dirty for lazy building
  },

  setStatute(statute) {
    if (datasets[statute]) {
      currentStatute = statute;
      fuseInstance = null; // Reset index for lazy rebuild
    }
  },

  getStatute() {
    return currentStatute;
  },

  setDirection(direction) {
    if (currentDirection !== direction) {
      currentDirection = direction;
      fuseInstance = null; // Reset index for lazy rebuild
    }
  },

  getFuseInstance() {
    if (!fuseInstance) {
      this.rebuildIndex();
    }
    return fuseInstance;
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
        const pArr = Array.isArray(item[primaryKey]) ? item[primaryKey] : [item[primaryKey]];
        const sArr = Array.isArray(item[secondaryKey]) ? item[secondaryKey] : [item[secondaryKey]];

        const pMatch = pArr.some(num => {
          const c = String(num || '').toLowerCase().replace(/[^0-9a-zA-Z()]/g, '');
          return c === cleanNum || c.startsWith(cleanNum);
        });

        const sMatch = sArr.some(num => {
          const c = String(num || '').toLowerCase().replace(/[^0-9a-zA-Z()]/g, '');
          return c === cleanNum || c.startsWith(cleanNum);
        });

        if (pMatch) {
          directMatches.push({ item, score: 0 });
        } else if (sMatch) {
          directMatches.push({ item, score: 0.05 });
        }
      }

      // Lazy query through Fuse instance
      const fuse = this.getFuseInstance();
      const fuseResults = fuse ? fuse.search(trimmed) : [];
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

    // 1. Direct ID match
    let found = combined.find(s => s.id.toLowerCase() === clean);
    if (found) return found;

    // 2. Direct Section match in bns array
    found = combined.find(s => {
      const arr = Array.isArray(s.bns) ? s.bns : [s.bns];
      return arr.some(num => String(num).toLowerCase() === clean || String(num).toLowerCase().startsWith(clean));
    });
    if (found) return found;

    // 3. Direct Section match in ipc array
    found = combined.find(s => {
      const arr = Array.isArray(s.ipc) ? s.ipc : [s.ipc];
      return arr.some(num => String(num).toLowerCase() === clean || String(num).toLowerCase().startsWith(clean));
    });
    if (found) return found;

    return null;
  }
};
