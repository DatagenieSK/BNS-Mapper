/**
 * Application Bootstrap for BNS Mapper
 * Loads dataset, initializes search, routing, theme, and direction switches
 */

import { storage, DIRECTIONS } from './storage.js';
import { searchEngine } from './search.js';
import { Router } from './router.js';
import { ui } from './ui.js';

let appRouter = null;

async function bootstrap() {
  // 1. Initialize Theme from storage or system preferences
  storage.initTheme();

  // 2. Setup UI Container
  const container = document.getElementById('app');
  ui.init(container);

  // 3. Fetch dataset via relative path for GitHub Pages compatibility
  let sections = [];
  try {
    const res = await fetch('./data/sections.json');
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    sections = await res.json();
  } catch (err) {
    console.error('Failed to load sections data:', err);
    container.innerHTML = `
      <div class="empty-state" style="margin-top: 50px;">
        <h2>Error Loading Law Data</h2>
        <p>Could not fetch <code>./data/sections.json</code>. If running locally, please use a local web server (e.g., <code>npx serve</code> or VSCode Live Server) to allow JSON fetch.</p>
      </div>
    `;
    return;
  }

  // 4. Initialize Search Engine
  const currentDirection = storage.getDirection();
  searchEngine.init(sections, currentDirection);

  // 5. Setup Router
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
    });

  // 6. Bind Global Header Controls
  bindGlobalControls();

  // 7. Initial routing handle
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
      // If auto, flip based on current effective
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
      ui.showToast(`Mapping direction: ${dir === DIRECTIONS.IPC_TO_BNS ? 'IPC → BNS' : 'BNS → IPC'}`);

      // Re-render current view if on search or chapters
      if (!window.location.hash || window.location.hash === '#/' || window.location.hash.startsWith('#/search')) {
        ui.renderSearchView({ query: ui.lastSearchQuery, filterChange: ui.activeFilterChange });
      } else if (window.location.hash.startsWith('#/chapters')) {
        ui.renderChaptersView();
      } else if (window.location.hash.startsWith('#/bookmarks')) {
        ui.renderBookmarksView();
      }
    });
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // '/' key opens and focuses search bar when not typing in an input
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
        }, 100);
      }
    }

    // Esc clears search or defocuses
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

// Start app
bootstrap();
