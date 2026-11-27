/**
 * Application Bootstrap for BNS Mapper (Frontend Elevation)
 * Real chapter fetch progress tracking, command palette, shortcuts,
 * view transitions, offline caching notifications, and accessibility enhancements.
 */

import { storage, DIRECTIONS, STATUTES } from './storage.js';
import { searchEngine } from './search.js';
import { quizEngine } from './quiz.js';
import { Router } from './router.js';
import { ui } from './ui.js';

let appRouter = null;

async function bootstrap() {
  storage.initTheme();

  const container = document.getElementById('app');
  ui.init(container);

  const isFirstVisit = storage.isSplashNeeded();
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFastExit = !isFirstVisit || prefersReducedMotion || storage.isLowTierDevice();

  if (isFastExit) {
    ui.updateSplashProgress(100, 'Ready');
    setTimeout(() => ui.dismissSplash(), 220);
  } else {
    ui.updateSplashProgress(15, 'Indexing statutory chapters...');
  }

  // Register Service Worker for PWA Offline Support
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        // SW registered
      }).catch((err) => {
        console.warn('Service Worker registration skipped:', err);
      });
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'OFFLINE_READY') {
        ui.showToast('Offline ready: All chapters and sections cached locally', 'success');
      }
    });
  }

  // Fetch Chapters index and merge chapter files with live progress
  let ipcSections = [];
  let chaptersIndex = [];
  let bnssSections = [], bsaSections = [], quizScenarios = [], omittedIpc = [];

  try {
    const [chaptersRes, bnssRes, bsaRes, scenRes, omittedRes] = await Promise.all([
      fetch('./data/chapters.json'),
      fetch('./data/bnss_sections.json').catch(() => ({ ok: false })),
      fetch('./data/bsa_sections.json').catch(() => ({ ok: false })),
      fetch('./data/quiz_scenarios.json').catch(() => ({ ok: false })),
      fetch('./data/omitted_ipc.json').catch(() => ({ ok: false }))
    ]);

    if (chaptersRes.ok) {
      chaptersIndex = await chaptersRes.json();
      ui.setChaptersIndex(chaptersIndex);

      let loadedCount = 0;
      const totalChapters = chaptersIndex.length;

      // Fetch each chapter file listed in chapters.json in parallel while updating progress
      const chapterFetches = chaptersIndex.map(ch =>
        fetch(`./data/chapters/${ch.file}`)
          .then(r => r.ok ? r.json() : [])
          .then(data => {
            loadedCount++;
            if (!isFastExit) {
              const pct = 20 + Math.round((loadedCount / totalChapters) * 65);
              ui.updateSplashProgress(pct, `Loading Chapter ${ch.chapter} of ${totalChapters} (${ch.title})...`);
            }
            return data;
          })
          .catch(() => [])
      );

      const chapterResults = await Promise.all(chapterFetches);
      ipcSections = chapterResults.flat();
    }

    if (omittedRes.ok) {
      const omittedRaw = await omittedRes.json();
      const omittedFormatted = omittedRaw.map(om => ({
        id: `omitted-ipc-${om.ipc.toLowerCase()}`,
        ipc: [om.ipc],
        bns: ['No direct BNS equivalent'],
        title: om.title,
        chapter: 'Omitted',
        change: 'omitted',
        old_text: `IPC Section ${om.ipc}: ${om.title}`,
        new_text: 'No direct BNS equivalent in the Bharatiya Nyaya Sanhita, 2023.',
        punishment_old: 'Previously punishable under Indian Penal Code',
        punishment_new: om.status,
        explanation: om.reason,
        tags: om.tags || ['omitted'],
        verified: false,
        source: 'Official BNS Text & IPC Comparison Table',
        isOmittedIpc: true
      }));
      ipcSections = [...ipcSections, ...omittedFormatted];
    }

    // Fallback if chapter files are not yet fully available
    if (!ipcSections || ipcSections.length === 0) {
      const fallbackRes = await fetch('./data/sections.json');
      if (fallbackRes.ok) {
        const raw = await fallbackRes.json();
        ipcSections = raw.map(s => ({
          ...s,
          bns: Array.isArray(s.bns) ? s.bns : [s.bns],
          ipc: Array.isArray(s.ipc) ? s.ipc : [s.ipc]
        }));
      }
    }

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
    ui.dismissSplash();
    return;
  }

  if (!isFastExit) {
    ui.updateSplashProgress(92, 'Building instant Fuse search index...');
  }

  // Initialize Search & Quiz Engines
  const currentDirection = storage.getDirection();
  const currentStatute = storage.getActiveStatute();
  searchEngine.init(ipcSections, bnssSections, bsaSections, currentDirection, currentStatute);
  quizEngine.init(searchEngine.getAllSectionsCombined(), quizScenarios);

  // Setup Router with deep-linking & View Transitions
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
    })
    .addRoute('#/coverage', () => {
      ui.renderCoverageView();
    });

  bindGlobalControls();
  ui.initCommandPalette();
  ui.initShortcutsModal();

  appRouter.handleRouting();

  if (!isFastExit) {
    setTimeout(() => {
      ui.dismissSplash();
    }, 280);
  }
}

function bindGlobalControls() {
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
    ui.showToast(`Switched to ${next} theme`, 'info');
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

  // Sticky header scrolled state
  window.addEventListener('scroll', () => {
    const header = document.querySelector('.site-header');
    if (header) {
      header.classList.toggle('scrolled', window.scrollY > 10);
    }
  }, { passive: true });

  // Update bottom nav glider indicator on route changes
  window.addEventListener('route-changed', () => {
    ui.updateBottomNavGlider();
  });
  window.addEventListener('resize', () => {
    ui.updateBottomNavGlider();
  });
  setTimeout(() => ui.updateBottomNavGlider(), 100);

  // Statute Switcher Tabs
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
      ui.showToast(`Active Statute: ${label}`, 'info');

      const hash = window.location.hash || '#/';
      if (hash === '#/' || hash.startsWith('#/search')) {
        ui.renderSearchView({ query: ui.lastSearchQuery, filterChange: ui.activeFilterChange });
      } else if (hash.startsWith('#/chapters')) {
        ui.renderChaptersView();
      }
    });
  });

  // Direction Switcher
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
      ui.showToast(`Mapping direction: ${dir === DIRECTIONS.IPC_TO_BNS ? 'Old → New' : 'New → Old'}`, 'info');

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

  // Power-User Keyboard Shortcuts
  let gPressed = false;
  let gTimer = null;

  window.addEventListener('keydown', (e) => {
    const isInputActive = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

    // Command Palette: ⌘K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      ui.openCommandPalette();
      return;
    }

    // Quick Search Focus: /
    if (e.key === '/' && !isInputActive) {
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
      return;
    }

    // Help Shortcuts Modal: ?
    if (e.key === '?' && !isInputActive) {
      e.preventDefault();
      ui.openShortcutsModal();
      return;
    }

    // Theme Switch: t
    if (e.key.toLowerCase() === 't' && !isInputActive) {
      toggleThemeAction();
      return;
    }

    // Escape: close modal or clear search
    if (e.key === 'Escape') {
      ui.closeCommandPalette();
      ui.closeShortcutsModal();
      const searchInput = document.getElementById('search-input');
      if (searchInput && document.activeElement === searchInput) {
        if (searchInput.value) {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input'));
        } else {
          searchInput.blur();
        }
      }
      return;
    }

    // Multi-key sequences: g + q, g + c, g + w, g + s
    if (!isInputActive) {
      if (e.key.toLowerCase() === 'g') {
        gPressed = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 900);
        return;
      }

      if (gPressed) {
        gPressed = false;
        clearTimeout(gTimer);
        const k = e.key.toLowerCase();
        if (k === 'q') { window.location.hash = '#/quiz'; return; }
        if (k === 'c') { window.location.hash = '#/chapters'; return; }
        if (k === 'w') { window.location.hash = '#/whats-new'; return; }
        if (k === 's') { window.location.hash = '#/'; return; }
      }
    }
  });
}

bootstrap();
