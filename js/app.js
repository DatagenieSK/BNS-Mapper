/**
 * Application Bootstrap for BNS Mapper (Extended Round 2)
 * Loads multi-statute datasets, initializes quiz engine, PWA service worker, and routing
 */

import { storage, DIRECTIONS, STATUTES } from './storage.js';
import { searchEngine } from './search.js';
import { quizEngine } from './quiz.js';
import { Router } from './router.js';
import { ui } from './ui.js';

let appRouter = null;

async function bootstrap() {
  // 1. Initialize Theme from storage or system preferences
  storage.initTheme();

  // 2. Setup UI Container
  const container = document.getElementById('app');
  ui.init(container);

  // 3. Register Service Worker for PWA Offline Support
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        console.log('BNS Mapper Service Worker registered:', reg.scope);
      }).catch((err) => {
        console.warn('Service Worker registration skipped/failed:', err);
      });
    });
  }

  // 4. Fetch all datasets via relative paths
  let ipcSections = [], bnssSections = [], bsaSections = [], quizScenarios = [];
  try {
    const [ipcRes, bnssRes, bsaRes, scenRes] = await Promise.all([
      fetch('./data/sections.json'),
      fetch('./data/bnss_sections.json').catch(() => ({ ok: false })),
      fetch('./data/bsa_sections.json').catch(() => ({ ok: false })),
      fetch('./data/quiz_scenarios.json').catch(() => ({ ok: false }))
    ]);

    if (!ipcRes.ok) throw new Error(`HTTP ${ipcRes.status} loading sections.json`);
    ipcSections = await ipcRes.json();
    if (bnssRes.ok) bnssSections = await bnssRes.json();
    if (bsaRes.ok) bsaSections = await bsaRes.json();
    if (scenRes.ok) quizScenarios = await scenRes.json();
  } catch (err) {
    console.error('Failed to load law data:', err);
    container.innerHTML = `
      <div class="empty-state" style="margin-top: 50px;">
        <h2>Error Loading Law Data</h2>
        <p>Could not load legal datasets. If running locally, please serve through an HTTP server (e.g. <code>npx serve</code>).</p>
      </div>
    `;
    return;
  }

  // 5. Initialize Search & Quiz Engines
  const currentDirection = storage.getDirection();
  const currentStatute = storage.getActiveStatute();
  searchEngine.init(ipcSections, bnssSections, bsaSections, currentDirection, currentStatute);
  quizEngine.init(searchEngine.getAllSectionsCombined(), quizScenarios);

  // 6. Setup Router with Extended Routes
  appRouter = new Router();

  appRouter
    .addRoute('#/', () => {
      ui.renderSearchView({ query: '', filterChange: 'all' });
    })
    .addRoute('#/search', (params, query) => {
      ui.renderSearchView({ query: query.q || '', filterChange: query.filter || 'all' });
    })
    .addRoute('#/section/:id', (params) => {
      ui.renderSectionDetail(params.id);
    })
    .addRoute('#/chapters', (params, query) => {
      ui.renderChaptersView({ filterChange: query.filter || 'all' });
    })
    .addRoute('#/bookmarks', () => {
      ui.renderBookmarksView();
    })
    .addRoute('#/quiz', (params, query) => {
      ui.renderQuizView({ mode: query.mode || 'mixed', chapter: query.chapter || 'all', difficulty: query.diff || 'medium' });
    })
    .addRoute('#/flashcards', () => {
      ui.renderFlashcardsView();
    })
    .addRoute('#/whats-new', () => {
      ui.renderWhatsNew();
    })
    .addRoute('#/compare', () => {
      ui.renderCompareView();
    });

  // 7. Bind Global Header Controls (Statute Switcher, Direction Switcher, Theme Toggle)
  bindGlobalControls();

  // 8. Initial routing handle
  appRouter.handleRouting();
}

function bindGlobalControls() {
  // Theme toggle button
  const themeToggle = document.getElementById('theme-toggle-btn');
  const bottomThemeToggle = document.getElementById('bottom-theme-toggle-btn');

  const toggleThemeAction = () => {
    const current = storage.getTheme();
    let next;
    if (current === 'light') next = 'dark';
    else if (current === 'dark') next = 'light';
    else {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      next = isDark ? 'light' : 'dark';
    }
    storage.setTheme(next);
    ui.showToast(`Switched to ${next} theme`);
    updateThemeIcon();
  };

  if (themeToggle) themeToggle.addEventListener('click', toggleThemeAction);
  if (bottomThemeToggle) bottomThemeToggle.addEventListener('click', toggleThemeAction);

  function updateThemeIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('.theme-icon-sun').forEach(el => {
      el.style.display = isDark ? 'inline-block' : 'none';
    });
    document.querySelectorAll('.theme-icon-moon').forEach(el => {
      el.style.display = isDark ? 'none' : 'inline-block';
    });
  }
  updateThemeIcon();

  // Statute Switcher Tabs (IPC/BNS vs CrPC/BNSS vs IEA/BSA)
  const statuteBtns = document.querySelectorAll('.statute-tab-btn');
  const updateStatuteUI = (activeStatute) => {
    statuteBtns.forEach(b => {
      const s = b.getAttribute('data-statute');
      if (s === activeStatute) {
        b.classList.add('active');
        b.setAttribute('aria-pressed', 'true');
      } else {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      }
    });
  };

  updateStatuteUI(storage.getActiveStatute());

  statuteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.getAttribute('data-statute');
      storage.setActiveStatute(s);
      searchEngine.setStatute(s);
      updateStatuteUI(s);

      let label = 'IPC ↔ BNS';
      if (s === STATUTES.CRPC_BNSS) label = 'CrPC ↔ BNSS';
      else if (s === STATUTES.IEA_BSA) label = 'IEA ↔ BSA';
      ui.showToast(`Active Statute: ${label}`);

      const hash = window.location.hash || '#/';
      if (hash === '#/' || hash.startsWith('#/search')) {
        ui.renderSearchView({ query: ui.lastSearchQuery, filterChange: ui.activeFilterChange });
      } else if (hash.startsWith('#/chapters')) {
        ui.renderChaptersView();
      }
    });
  });

  // Direction Switcher (IPC -> BNS vs BNS -> IPC)
  const dirBtns = document.querySelectorAll('.direction-btn');
  const updateDirectionUI = (activeDir) => {
    dirBtns.forEach(b => {
      const dir = b.getAttribute('data-direction');
      if (dir === activeDir) {
        b.classList.add('active');
        b.setAttribute('aria-pressed', 'true');
      } else {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      }
    });
  };

  updateDirectionUI(storage.getDirection());

  dirBtns.forEach(b => {
    b.addEventListener('click', () => {
      const dir = b.getAttribute('data-direction');
      storage.setDirection(dir);
      searchEngine.setDirection(dir);
      updateDirectionUI(dir);
      ui.showToast(`Mapping direction: ${dir === DIRECTIONS.IPC_TO_BNS ? 'Old → New' : 'New → Old'}`);

      const hash = window.location.hash || '#/';
      if (hash === '#/' || hash.startsWith('#/search')) {
        ui.renderSearchView({ query: ui.lastSearchQuery, filterChange: ui.activeFilterChange });
      } else if (hash.startsWith('#/chapters')) {
        ui.renderChaptersView();
      } else if (hash.startsWith('#/bookmarks')) {
        ui.renderBookmarksView();
      }
    });
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      } else {
        window.location.hash = '#/';
        setTimeout(() => {
          const input = document.getElementById('search-input');
          if (input) input.focus();
        }, 120);
      }
    }

    if (e.key === 'Escape') {
      const searchInput = document.getElementById('search-input');
      if (searchInput && document.activeElement === searchInput) {
        if (searchInput.value) {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input'));
        } else {
          searchInput.blur();
        }
      }
    }
  });
}

// Launch
bootstrap();
