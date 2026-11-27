/**
 * UI Renderer for BNS Mapper (Extended Round 2)
 * Editorial Law Layout, Animated Number Morph, Quiz, Leitner Flashcards, Compare Mode & What's New
 */

import { storage, DIRECTIONS, STATUTES } from './storage.js';
import { searchEngine } from './search.js';
import { quizEngine } from './quiz.js';

export const ui = {
  appContainer: null,
  activeFilterChange: 'all',
  lastSearchQuery: '',
  morphTimer: null,

  init(containerEl) {
    this.appContainer = containerEl;
  },

  // -------------------------------------------------------------
  // Toast Notifications
  // -------------------------------------------------------------
  showToast(message, duration = 2600) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      toastContainer.setAttribute('role', 'status');
      toastContainer.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      <span>${this.escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.2s ease-out';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  getBadgeHtml(changeType) {
    const type = (changeType || 'renumbered').toLowerCase();
    return `<span class="badge badge-${type}">${this.escapeHtml(type)}</span>`;
  },

  highlightSearchTerm(text, term) {
    if (!text || !term) return this.escapeHtml(text);
    const escapedText = this.escapeHtml(text);
    const cleanTerm = term.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (!cleanTerm) return escapedText;

    const regex = new RegExp(`(${cleanTerm})`, 'gi');
    return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
  },

  // -------------------------------------------------------------
  // Compare Tray Floating Helper
  // -------------------------------------------------------------
  renderCompareTray() {
    let tray = document.getElementById('compare-tray');
    const compareList = storage.getCompareSections();

    if (compareList.length === 0) {
      if (tray) tray.remove();
      return;
    }

    if (!tray) {
      tray = document.createElement('div');
      tray.id = 'compare-tray';
      tray.className = 'compare-tray';
      document.body.appendChild(tray);
    }

    tray.innerHTML = `
      <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary);">
        PINNED (${compareList.length}/3):
      </span>
      <div class="compare-tray-chips">
        ${compareList.map(id => `<span class="compare-chip">${this.escapeHtml(id.replace('ipc-', '§').replace('crpc-', '§').replace('iea-', '§'))}</span>`).join('')}
      </div>
      <a href="#/compare" class="btn btn-primary" style="padding: 4px 12px; font-size: 0.775rem;">
        Compare Now &rarr;
      </a>
      <button id="clear-compare-tray-btn" class="icon-btn" style="width: 26px; height: 26px; border: none;" title="Clear pinned sections">
        &times;
      </button>
    `;

    const clearBtn = document.getElementById('clear-compare-tray-btn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        storage.clearCompare();
        this.renderCompareTray();
        this.showToast('Cleared pinned sections');
      };
    }
  },

  // -------------------------------------------------------------
  // View 1: Search & Explorer View
  // -------------------------------------------------------------
  renderSearchView({ query = '', filterChange = 'all' } = {}) {
    document.title = 'BNS Mapper — Criminal Law Transition Navigator';
    this.activeFilterChange = filterChange;
    this.lastSearchQuery = query;

    const direction = storage.getDirection();
    const isIpcToBns = direction === DIRECTIONS.IPC_TO_BNS;
    const currentStatute = searchEngine.getStatute();
    const allSections = searchEngine.getAllSections();
    const results = searchEngine.search(query, { filterChange });

    const counts = { all: allSections.length, renumbered: 0, modified: 0, new: 0, omitted: 0, split: 0, merged: 0 };
    allSections.forEach(s => { if (counts[s.change] !== undefined) counts[s.change]++; });

    let statutePairName = 'IPC (1860) &harr; BNS (2023)';
    let primaryPlaceholder = isIpcToBns ? 'IPC number (e.g. 302, 420)' : 'BNS number (e.g. 103, 318)';
    if (currentStatute === STATUTES.CRPC_BNSS) {
      statutePairName = 'CrPC (1973) &harr; BNSS (2023)';
      primaryPlaceholder = isIpcToBns ? 'CrPC section (e.g. 41, 154, 167)' : 'BNSS section (e.g. 35, 173, 187)';
    } else if (currentStatute === STATUTES.IEA_BSA) {
      statutePairName = 'IEA (1872) &harr; BSA (2023)';
      primaryPlaceholder = isIpcToBns ? 'IEA section (e.g. 27, 65B)' : 'BSA section (e.g. 23, 63)';
    }

    this.appContainer.innerHTML = `
      <section class="search-hero" aria-labelledby="hero-title">
        <!-- Hero Number Morph -->
        <div class="hero-morph-banner" aria-hidden="true">
          <span>Old Code:</span>
          <span id="hero-morph-old" class="morph-pill">IPC 302</span>
          <span>&rarr;</span>
          <span>New Sanhita:</span>
          <span id="hero-morph-new" class="morph-pill">BNS 103</span>
        </div>

        <h2 id="hero-title" class="hero-title">Navigate Indian Criminal Law</h2>
        <p class="hero-subtitle">
          Instant cross-reference for <strong>${statutePairName}</strong> with full statutory text and plain-English analysis.
        </p>

        <div class="search-box-wrapper">
          <div class="search-input-container">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="search"
              id="search-input"
              class="search-input"
              placeholder="Search by ${primaryPlaceholder}, title, or tag..."
              value="${this.escapeHtml(query)}"
              autocomplete="off"
              spellcheck="false"
              aria-label="Search law sections"
            />
            <button
              id="search-clear-btn"
              class="search-clear-btn ${query ? 'visible' : ''}"
              title="Clear search"
              aria-label="Clear search input"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <span class="search-kbd-hint" title="Press / to focus">/</kbd></span>
          </div>

          <!-- Filter Pills -->
          <div class="filter-pills-row" role="radiogroup" aria-label="Filter by change type">
            ${['all', 'renumbered', 'modified', 'new', 'split', 'omitted'].map(type => `
              <button
                class="filter-pill ${filterChange === type ? 'active' : ''}"
                data-filter="${type}"
                role="radio"
                aria-checked="${filterChange === type}"
              >
                ${type.charAt(0).toUpperCase() + type.slice(1)}
                <span class="filter-count">${counts[type] || 0}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </section>

      <section class="results-section" aria-live="polite">
        <div class="results-meta-bar">
          <span class="results-count">
            Showing <strong>${results.length}</strong> ${results.length === 1 ? 'section' : 'sections'}
            ${filterChange !== 'all' ? `marked <em>${filterChange}</em>` : ''}
          </span>
          <div style="display: flex; gap: 12px; font-size: 0.85rem;">
            <a href="#/whats-new" class="back-link">What's New in BNS &nearr;</a>
            <a href="#/chapters" class="back-link">Chapters &rarr;</a>
          </div>
        </div>

        ${results.length === 0 ? `
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            <h3>No matching sections found</h3>
            <p>Try searching with a section number like <strong>302</strong>, <strong>420</strong>, <strong>41</strong>, or keywords like <strong>theft</strong>, <strong>mob lynching</strong>, <strong>e-fir</strong>.</p>
          </div>
        ` : `
          <div class="sections-grid">
            ${results.map(item => this.renderSectionCard(item, direction, query)).join('')}
          </div>
        `}
      </section>
    `;

    this.bindSearchEvents();
    this.startHeroMorph();
    this.renderCompareTray();
  },

  startHeroMorph() {
    clearInterval(this.morphTimer);
    const morphs = [
      { oldCode: 'IPC 302', newCode: 'BNS 103(1)' },
      { oldCode: 'IPC 420', newCode: 'BNS 318(4)' },
      { oldCode: 'IPC 124A', newCode: 'BNS 152' },
      { oldCode: 'IPC 379', newCode: 'BNS 303(2)' },
      { oldCode: 'IPC 304B', newCode: 'BNS 80' },
      { oldCode: 'IPC 498A', newCode: 'BNS 85 & 86' }
    ];
    let idx = 0;
    const oldEl = document.getElementById('hero-morph-old');
    const newEl = document.getElementById('hero-morph-new');

    if (!oldEl || !newEl) return;

    this.morphTimer = setInterval(() => {
      idx = (idx + 1) % morphs.length;
      oldEl.classList.add('morphing');
      newEl.classList.add('morphing');

      setTimeout(() => {
        oldEl.textContent = morphs[idx].oldCode;
        newEl.textContent = morphs[idx].newCode;
        oldEl.classList.remove('morphing');
        newEl.classList.remove('morphing');
      }, 250);
    }, 2800);
  },

  renderSectionCard(item, direction, query = '') {
    const isIpcToBns = direction === DIRECTIONS.IPC_TO_BNS;
    const isBookmarked = storage.isBookmarked(item.id);
    const isPinned = storage.isComparing(item.id);

    const statute = searchEngine.getStatute();
    let oldPrefix = 'IPC';
    let newPrefix = 'BNS';
    if (statute === STATUTES.CRPC_BNSS) { oldPrefix = 'CrPC'; newPrefix = 'BNSS'; }
    else if (statute === STATUTES.IEA_BSA) { oldPrefix = 'IEA'; newPrefix = 'BSA'; }

    const primaryNumber = isIpcToBns
      ? (item.ipc === 'None' ? `New in ${newPrefix}` : `${oldPrefix} § ${item.ipc}`)
      : (item.bns === 'Omitted' ? `Omitted in ${newPrefix}` : `${newPrefix} § ${item.bns}`);

    const secondaryNumber = isIpcToBns
      ? (item.bns === 'Omitted' ? 'Omitted' : `${newPrefix} § ${item.bns}`)
      : (item.ipc === 'None' ? 'New Provision' : `${oldPrefix} § ${item.ipc}`);

    const highlightedTitle = this.highlightSearchTerm(item.title, query);
    const highlightedExplanation = this.highlightSearchTerm(item.explanation, query);

    return `
      <article class="section-card" data-section-id="${item.id}">
        <div class="card-top">
          <div class="mapping-numbers">
            <span class="number-primary">${primaryNumber}</span>
            <span class="mapping-arrow">&rarr;</span>
            <span class="number-secondary">${secondaryNumber}</span>
          </div>
          <div class="card-actions">
            <button
              class="card-action-icon ${isPinned ? 'pinned' : ''}"
              data-pin-id="${item.id}"
              title="${isPinned ? 'Unpin from comparison' : 'Pin to compare (up to 3)'}"
              aria-label="Pin section ${item.id} to compare"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M16 12V4a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v8l-2 3v2h6v5l1 1 1-1v-5h6v-2l-2-3z"></path>
              </svg>
            </button>
            <button
              class="card-action-icon bookmark-btn ${isBookmarked ? 'active' : ''}"
              data-bookmark-id="${item.id}"
              title="${isBookmarked ? 'Remove bookmark' : 'Bookmark section'}"
              aria-label="Bookmark section ${item.title}"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
          </div>
        </div>

        <div style="margin-bottom: 8px;">
          ${this.getBadgeHtml(item.change)}
        </div>

        <h3 class="card-title">
          <a href="#/section/${item.id}">${highlightedTitle}</a>
        </h3>

        <p class="card-explanation">${highlightedExplanation}</p>

        <div class="card-footer">
          <span class="card-chapter-tag" title="${this.escapeHtml(item.chapter)}">${this.escapeHtml(item.chapter)}</span>
          <a href="#/section/${item.id}" class="card-read-more" aria-label="Compare Section ${item.id}">
            Compare &rarr;
          </a>
        </div>
      </article>
    `;
  },

  bindSearchEvents() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear-btn');

    if (input) {
      input.addEventListener('input', (e) => {
        const val = e.target.value;
        this.lastSearchQuery = val;
        clearBtn.classList.toggle('visible', !!val);

        const direction = storage.getDirection();
        const results = searchEngine.search(val, { filterChange: this.activeFilterChange });
        this.updateSearchResultsGrid(results, direction, val);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        this.lastSearchQuery = '';
        clearBtn.classList.remove('visible');
        input.focus();
        const direction = storage.getDirection();
        const results = searchEngine.search('', { filterChange: this.activeFilterChange });
        this.updateSearchResultsGrid(results, direction, '');
      });
    }

    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');
        this.activeFilterChange = filter;
        document.querySelectorAll('.filter-pill').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');

        const direction = storage.getDirection();
        const results = searchEngine.search(this.lastSearchQuery, { filterChange: filter });
        this.updateSearchResultsGrid(results, direction, this.lastSearchQuery);
      });
    });

    this.bindCardActions();
  },

  updateSearchResultsGrid(results, direction, query = '') {
    const metaBar = document.querySelector('.results-meta-bar');
    const resultsContainer = document.querySelector('.results-section');
    if (!resultsContainer) return;

    if (metaBar) {
      metaBar.innerHTML = `
        <span class="results-count">
          Showing <strong>${results.length}</strong> ${results.length === 1 ? 'section' : 'sections'}
          ${this.activeFilterChange !== 'all' ? `marked <em>${this.activeFilterChange}</em>` : ''}
        </span>
        <div style="display: flex; gap: 12px; font-size: 0.85rem;">
          <a href="#/whats-new" class="back-link">What's New in BNS &nearr;</a>
          <a href="#/chapters" class="back-link">Chapters &rarr;</a>
        </div>
      `;
    }

    const grid = resultsContainer.querySelector('.sections-grid');
    const empty = resultsContainer.querySelector('.empty-state');

    if (results.length === 0) {
      if (grid) grid.remove();
      if (!empty) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.innerHTML = `
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          <h3>No matching sections found</h3>
          <p>Try searching with another section number or keyword.</p>
        `;
        resultsContainer.appendChild(emptyDiv);
      }
    } else {
      if (empty) empty.remove();
      let targetGrid = grid;
      if (!targetGrid) {
        targetGrid = document.createElement('div');
        targetGrid.className = 'sections-grid';
        resultsContainer.appendChild(targetGrid);
      }
      targetGrid.innerHTML = results.map(item => this.renderSectionCard(item, direction, query)).join('');
      this.bindCardActions();
    }
  },

  bindCardActions() {
    // Bookmarks
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-bookmark-id');
        const newState = storage.toggleBookmark(id);
        btn.classList.toggle('active', newState);
        const svg = btn.querySelector('svg');
        if (svg) svg.setAttribute('fill', newState ? 'currentColor' : 'none');
        this.showToast(newState ? 'Added to My Sections' : 'Removed from My Sections');
      };
    });

    // Pin to Compare
    document.querySelectorAll('[data-pin-id]').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-pin-id');
        const res = storage.toggleCompare(id);
        if (!res.success && res.reason === 'max_reached') {
          this.showToast('Maximum 3 sections can be pinned at once.');
          return;
        }
        btn.classList.toggle('pinned', res.added);
        const svg = btn.querySelector('svg');
        if (svg) svg.setAttribute('fill', res.added ? 'currentColor' : 'none');
        this.showToast(res.added ? 'Pinned for side-by-side comparison' : 'Unpinned from comparison');
        this.renderCompareTray();
      };
    });
  },

  // -------------------------------------------------------------
  // View 2: Section Detail Page
  // -------------------------------------------------------------
  renderSectionDetail(idOrNumber) {
    const item = searchEngine.getSectionById(idOrNumber);

    if (!item) {
      document.title = 'Section Not Found — BNS Mapper';
      this.appContainer.innerHTML = `
        <div class="empty-state" style="margin-top: 40px;">
          <h2>Section Not Found</h2>
          <p style="margin-bottom: 24px;">Could not locate section "${this.escapeHtml(idOrNumber)}" in current database.</p>
          <a href="#/" class="btn btn-primary">&larr; Back to Search</a>
        </div>
      `;
      return;
    }

    document.title = `IPC ${item.ipc} → BNS ${item.bns}: ${item.title} — BNS Mapper`;
    const isBookmarked = storage.isBookmarked(item.id);
    const isPinned = storage.isComparing(item.id);

    const all = searchEngine.getAllSections();
    const curIndex = all.findIndex(s => s.id === item.id);
    const prevItem = curIndex > 0 ? all[curIndex - 1] : null;
    const nextItem = curIndex < all.length - 1 ? all[curIndex + 1] : null;

    this.appContainer.innerHTML = `
      <article class="detail-view" aria-labelledby="detail-title">
        <nav class="detail-nav-bar" aria-label="Breadcrumb and actions">
          <a href="#/" class="back-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Search
          </a>

          <div class="detail-action-group">
            <button id="detail-pin-btn" class="btn btn-outline ${isPinned ? 'pinned' : ''}" title="Pin to compare side by side">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M16 12V4a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v8l-2 3v2h6v5l1 1 1-1v-5h6v-2l-2-3z"></path>
              </svg>
              ${isPinned ? 'Pinned' : 'Pin to Compare'}
            </button>
            <button id="detail-share-btn" class="btn btn-outline" title="Copy link to clipboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              Share
            </button>
            <button id="detail-bookmark-btn" class="btn btn-outline ${isBookmarked ? 'active' : ''}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${isBookmarked ? '#D97706' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              ${isBookmarked ? 'Saved' : 'Bookmark'}
            </button>
          </div>
        </nav>

        <header class="detail-header-card">
          <div class="detail-chapter">${this.escapeHtml(item.chapter)}</div>
          <div class="detail-badges">
            ${this.getBadgeHtml(item.change)}
            ${item.verified ? `
              <span class="badge badge-verified">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Gazette Verified
              </span>
            ` : `
              <span class="badge badge-unverified">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Sample Data &bull; Unverified
              </span>
            `}
          </div>

          <h2 id="detail-title" class="detail-title">${this.escapeHtml(item.title)}</h2>

          <div class="mapping-banner-box">
            <div>
              <div class="map-col-title">Old Law Provision</div>
              <div class="map-col-sec">${item.ipc === 'None' ? 'None (New)' : `Section ${this.escapeHtml(item.ipc)}`}</div>
            </div>
            <div class="map-arrow-icon">&rarr;</div>
            <div>
              <div class="map-col-title">New Sanhita Provision</div>
              <div class="map-col-sec">${item.bns === 'Omitted' ? 'Omitted' : `Section ${this.escapeHtml(item.bns)}`}</div>
            </div>
          </div>
        </header>

        <section aria-labelledby="comparison-heading">
          <div class="section-label" id="comparison-heading">Statutory Text Comparison</div>
          <div class="comparison-container">
            <div class="comparison-box">
              <div class="comparison-header">
                <span>Old Law extract &bull; § ${this.escapeHtml(item.ipc)}</span>
                <span class="badge" style="font-size: 0.65rem;">Repealed</span>
              </div>
              <div class="comparison-body">
                <div class="law-text-content">${this.escapeHtml(item.old_text)}</div>
              </div>
            </div>

            <div class="comparison-box">
              <div class="comparison-header">
                <span>New Sanhita extract &bull; § ${this.escapeHtml(item.bns)}</span>
                <span class="badge badge-new" style="font-size: 0.65rem;">In Force</span>
              </div>
              <div class="comparison-body">
                <div class="law-text-content">${this.escapeHtml(item.new_text)}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="punishment-section" aria-labelledby="punishment-heading">
          <div class="section-label" id="punishment-heading">Punishment Comparison</div>
          <div class="punishment-grid">
            <div class="punishment-box">
              <div class="punishment-tag">Old Punishment</div>
              <div class="punishment-text">${this.escapeHtml(item.punishment_old)}</div>
            </div>
            <div class="punishment-box">
              <div class="punishment-tag">New Punishment</div>
              <div class="punishment-text">${this.escapeHtml(item.punishment_new)}</div>
            </div>
          </div>
        </section>

        <section class="explanation-card" aria-labelledby="explanation-heading">
          <div class="section-label" id="explanation-heading">Plain-English Legal Analysis</div>
          <p class="explanation-text">${this.escapeHtml(item.explanation)}</p>

          <div class="tags-row">
            ${(item.tags || []).map(t => `<span class="tag-item">#${this.escapeHtml(t)}</span>`).join('')}
          </div>

          <div class="verification-footer">
            <span class="source-citation">
              <strong>Source:</strong> ${this.escapeHtml(item.source || 'The Gazette of India')}
            </span>
            <span>
              <a href="https://egazette.gov.in" target="_blank" rel="noopener noreferrer" style="font-size: 0.825rem;">
                Official Gazette Portal &nearr;
              </a>
            </span>
          </div>
        </section>

        <nav style="display: flex; justify-content: space-between; gap: 16px; margin-top: 32px;" aria-label="Adjacent provisions">
          ${prevItem ? `
            <a href="#/section/${prevItem.id}" class="btn btn-outline">
              &larr; Prev (§ ${prevItem.ipc})
            </a>
          ` : '<div></div>'}
          ${nextItem ? `
            <a href="#/section/${nextItem.id}" class="btn btn-outline">
              Next (§ ${nextItem.ipc}) &rarr;
            </a>
          ` : '<div></div>'}
        </nav>
      </article>
    `;

    // Bind Detail actions
    const shareBtn = document.getElementById('detail-share-btn');
    if (shareBtn) {
      shareBtn.onclick = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
          this.showToast('Section link copied to clipboard!');
        });
      };
    }

    const pinBtn = document.getElementById('detail-pin-btn');
    if (pinBtn) {
      pinBtn.onclick = () => {
        const res = storage.toggleCompare(item.id);
        if (!res.success && res.reason === 'max_reached') {
          this.showToast('Maximum 3 sections can be pinned.');
          return;
        }
        pinBtn.classList.toggle('pinned', res.added);
        pinBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${res.added ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M16 12V4a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v8l-2 3v2h6v5l1 1 1-1v-5h6v-2l-2-3z"></path>
          </svg>
          ${res.added ? 'Pinned' : 'Pin to Compare'}
        `;
        this.showToast(res.added ? 'Pinned for side-by-side comparison' : 'Unpinned from comparison');
        this.renderCompareTray();
      };
    }

    const bookmarkBtn = document.getElementById('detail-bookmark-btn');
    if (bookmarkBtn) {
      bookmarkBtn.onclick = () => {
        const newState = storage.toggleBookmark(item.id);
        bookmarkBtn.classList.toggle('active', newState);
        bookmarkBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${newState ? '#D97706' : 'none'}" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          ${newState ? 'Saved' : 'Bookmark'}
        `;
        this.showToast(newState ? 'Added to My Sections' : 'Removed from My Sections');
      };
    }

    this.renderCompareTray();
  },

  // -------------------------------------------------------------
  // View 3: Chapter Browser
  // -------------------------------------------------------------
  renderChaptersView({ filterChange = 'all' } = {}) {
    document.title = 'Chapters & Categories — BNS Mapper';
    const allSections = searchEngine.getAllSections();
    const filtered = filterChange === 'all'
      ? allSections
      : allSections.filter(s => s.change === filterChange);

    const chaptersMap = new Map();
    filtered.forEach(item => {
      const ch = item.chapter || 'Other Provisions';
      if (!chaptersMap.has(ch)) chaptersMap.set(ch, []);
      chaptersMap.get(ch).push(item);
    });

    const direction = storage.getDirection();
    const isIpcToBns = direction === DIRECTIONS.IPC_TO_BNS;

    this.appContainer.innerHTML = `
      <section class="chapters-view-container" aria-labelledby="chapters-title">
        <div style="margin-bottom: 20px;">
          <h2 id="chapters-title" style="font-size: 2rem; margin-bottom: 8px;">Chapter Browser</h2>
          <p>Explore provisions organized by legal subject areas and statutory chapters.</p>
        </div>

        <div class="filter-pills-row" style="justify-content: flex-start; margin-bottom: 24px;" role="radiogroup" aria-label="Filter chapters by change type">
          ${['all', 'renumbered', 'modified', 'new', 'split', 'omitted'].map(type => `
            <button class="filter-pill ${filterChange === type ? 'active' : ''}" data-chapter-filter="${type}" role="radio" aria-checked="${filterChange === type}">
              ${type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          `).join('')}
        </div>

        <div class="chapters-container">
          ${Array.from(chaptersMap.entries()).map(([chapterName, items]) => `
            <div class="chapter-group">
              <div class="chapter-header">
                <h3 class="chapter-title">${this.escapeHtml(chapterName)}</h3>
                <span class="chapter-count-badge">${items.length} ${items.length === 1 ? 'section' : 'sections'}</span>
              </div>
              <div class="chapter-sections-list">
                ${items.map(item => `
                  <a href="#/section/${item.id}" class="chapter-section-item">
                    <div class="sec-info-left">
                      <span class="sec-pill-num">
                        ${isIpcToBns ? `§ ${item.ipc} &rarr; § ${item.bns}` : `§ ${item.bns} &rarr; § ${item.ipc}`}
                      </span>
                      <span class="sec-title-text">${this.escapeHtml(item.title)}</span>
                    </div>
                    <div>${this.getBadgeHtml(item.change)}</div>
                  </a>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;

    document.querySelectorAll('[data-chapter-filter]').forEach(btn => {
      btn.onclick = () => {
        const filter = btn.getAttribute('data-chapter-filter');
        this.renderChaptersView({ filterChange: filter });
      };
    });
    this.renderCompareTray();
  },

  // -------------------------------------------------------------
  // View 4: Bookmarks & Printable Cheat Sheet View
  // -------------------------------------------------------------
  renderBookmarksView() {
    document.title = 'My Sections & Cheat Sheet — BNS Mapper';
    const bookmarkedIds = storage.getBookmarks();
    const allSections = searchEngine.getAllSectionsCombined();
    const savedSections = allSections.filter(s => bookmarkedIds.includes(s.id));
    const direction = storage.getDirection();

    this.appContainer.innerHTML = `
      <section class="bookmarks-view" aria-labelledby="bookmarks-title">
        <div class="print-header">
          <h1>BNS Mapper — My Sections Cheat Sheet</h1>
          <p>Indian Penal Code &harr; Bharatiya Nyaya Sanhita Quick Reference Guide</p>
        </div>

        <div class="bookmarks-view-header">
          <div>
            <h2 id="bookmarks-title" style="font-size: 2rem; margin-bottom: 4px;">My Saved Sections</h2>
            <p>Your custom study list saved locally on this browser.</p>
          </div>

          <div style="display: flex; gap: 8px;">
            ${savedSections.length > 0 ? `
              <button id="print-cheat-sheet-btn" class="btn btn-primary" title="Print as quick reference cheat sheet">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                Print Cheat Sheet
              </button>
              <button id="clear-bookmarks-btn" class="btn btn-outline" title="Clear all saved bookmarks">
                Clear All
              </button>
            ` : ''}
          </div>
        </div>

        ${savedSections.length === 0 ? `
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <h3>No Bookmarked Sections Yet</h3>
            <p>Click the star icon on any section card or detail page to build your custom cheat sheet.</p>
            <div style="margin-top: 20px;">
              <a href="#/" class="btn btn-primary">Browse & Search Sections</a>
            </div>
          </div>
        ` : `
          <div class="cheat-sheet-table-wrap">
            <table class="cheat-sheet-table" aria-label="Bookmarked sections cheat sheet">
              <thead>
                <tr>
                  <th>Old Section</th>
                  <th>New Sanhita</th>
                  <th>Offence / Provision</th>
                  <th>Change Type</th>
                  <th>New Punishment</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                ${savedSections.map(item => `
                  <tr>
                    <td><strong>§ ${item.ipc}</strong></td>
                    <td><strong style="color: var(--accent);">§ ${item.bns}</strong></td>
                    <td><a href="#/section/${item.id}"><strong>${this.escapeHtml(item.title)}</strong></a></td>
                    <td>${this.getBadgeHtml(item.change)}</td>
                    <td style="font-size: 0.825rem;">${this.escapeHtml(item.punishment_new)}</td>
                    <td style="font-size: 0.825rem;">${this.escapeHtml(item.explanation)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div style="margin-top: 36px;">
            <div class="section-label">Detailed Saved Cards</div>
            <div class="sections-grid">
              ${savedSections.map(item => this.renderSectionCard(item, direction)).join('')}
            </div>
          </div>
        `}
      </section>
    `;

    const printBtn = document.getElementById('print-cheat-sheet-btn');
    if (printBtn) printBtn.onclick = () => window.print();

    const clearBtn = document.getElementById('clear-bookmarks-btn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        if (confirm('Clear all your saved bookmarks?')) {
          storage.clearBookmarks();
          this.renderBookmarksView();
        }
      };
    }
    this.bindCardActions();
    this.renderCompareTray();
  },

  // -------------------------------------------------------------
  // View 5: QUIZ MODE & PROGRESS DASHBOARD
  // -------------------------------------------------------------
  renderQuizView({ mode = 'mixed', chapter = 'all', difficulty = 'medium' } = {}) {
    document.title = 'Quiz & Exam Practice — BNS Mapper';
    const stats = storage.getQuizStats();
    const allChapters = [...new Set(searchEngine.getAllSections().map(s => s.chapter))];

    this.appContainer.innerHTML = `
      <section class="quiz-container" aria-labelledby="quiz-page-title">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
          <div>
            <h2 id="quiz-page-title" style="font-size: 2rem; margin-bottom: 4px;">Law Student Quiz Mode</h2>
            <p>Test your knowledge of the transition from IPC to BNS with instant feedback.</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="#/flashcards" class="btn btn-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <path d="M7 15h10M7 9h10"></path>
              </svg>
              Leitner Flashcards
            </a>
          </div>
        </div>

        <!-- Quiz Setup Card -->
        <div class="detail-header-card" style="margin-bottom: 24px; padding: 20px;">
          <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
            <div>
              <div class="section-label">Select Mode</div>
              <div class="filter-pills-row" style="justify-content: flex-start;">
                <button class="filter-pill ${mode === 'mixed' ? 'active' : ''}" data-quiz-mode="mixed">Mixed Exam (8 Qs)</button>
                <button class="filter-pill ${mode === 'timed' ? 'active' : ''}" data-quiz-mode="timed">Timed 60s Challenge</button>
                <button class="filter-pill ${mode === 'match' ? 'active' : ''}" data-quiz-mode="match">Match the Pairs Game</button>
              </div>
            </div>

            ${mode !== 'match' ? `
              <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                <div>
                  <div class="section-label">Chapter Filter</div>
                  <select id="quiz-chapter-select" style="padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 0.9rem;">
                    <option value="all">All Chapters</option>
                    ${allChapters.map(ch => `<option value="${this.escapeHtml(ch)}" ${chapter === ch ? 'selected' : ''}>${this.escapeHtml(ch)}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <div class="section-label">Difficulty</div>
                  <div class="filter-pills-row" style="margin: 0; justify-content: flex-start;">
                    ${['easy', 'medium', 'hard'].map(d => `
                      <button class="filter-pill ${difficulty === d ? 'active' : ''}" data-quiz-diff="${d}">
                        ${d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : ''}

            <div>
              <button id="start-quiz-btn" class="btn btn-primary" style="padding: 10px 24px; font-size: 1rem;">
                Start Practice Session &rarr;
              </button>
            </div>
          </div>
        </div>

        <!-- Active Quiz Play Area -->
        <div id="quiz-play-area"></div>

        <!-- Progress Dashboard -->
        <section style="margin-top: 40px;" aria-labelledby="dashboard-title">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <h3 id="dashboard-title" style="font-size: 1.5rem;">Study Performance Dashboard</h3>
            <div class="streak-flame ${stats.currentStreak >= 3 ? 'celebration-burst' : ''}" title="Consecutive sessions with 70%+ score">
              🔥 <span>${stats.currentStreak} Session Streak</span> (Max: ${stats.maxStreak})
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
            <div class="punishment-box">
              <div class="punishment-tag">Total Questions Attempted</div>
              <div style="font-size: 1.6rem; font-weight: 700; color: var(--accent);">${stats.totalAttempted}</div>
            </div>
            <div class="punishment-box">
              <div class="punishment-tag">Overall Accuracy</div>
              <div style="font-size: 1.6rem; font-weight: 700; color: #19682C;">
                ${stats.totalAttempted > 0 ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0}%
              </div>
            </div>
            <div class="punishment-box">
              <div class="punishment-tag">Badges Unlocked</div>
              <div style="font-size: 1.6rem; font-weight: 700; color: #D97706;">${(stats.badges || []).length}</div>
            </div>
          </div>

          <!-- Score History Chart (Inline SVG) -->
          <div class="chart-container">
            <div class="section-label" style="margin-bottom: 8px;">Recent Session Accuracy (%)</div>
            ${this.renderHistorySvgChart(stats.history)}
          </div>

          <!-- Badges Collection -->
          <div style="margin-top: 24px;">
            <div class="section-label">Earned Achievement Badges</div>
            <div class="badges-grid">
              ${(stats.badges || []).length === 0 ? `
                <p style="font-size: 0.85rem; color: var(--text-muted);">Complete quiz sessions to unlock achievement badges.</p>
              ` : (stats.badges || []).map(b => `
                <div class="badge-item-card">
                  <div class="badge-icon-gold">🏆</div>
                  <div>
                    <strong style="font-size: 0.9rem; display: block;">${this.escapeHtml(b.name)}</strong>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${this.escapeHtml(b.desc)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </section>
      </section>
    `;

    // Bind Setup Events
    document.querySelectorAll('[data-quiz-mode]').forEach(btn => {
      btn.onclick = () => {
        const m = btn.getAttribute('data-quiz-mode');
        this.renderQuizView({ mode: m, chapter, difficulty });
      };
    });

    document.querySelectorAll('[data-quiz-diff]').forEach(btn => {
      btn.onclick = () => {
        const d = btn.getAttribute('data-quiz-diff');
        this.renderQuizView({ mode, chapter, difficulty: d });
      };
    });

    const startBtn = document.getElementById('start-quiz-btn');
    if (startBtn) {
      startBtn.onclick = () => {
        const chSelect = document.getElementById('quiz-chapter-select');
        const selectedCh = chSelect ? chSelect.value : 'all';
        if (mode === 'match') {
          this.startMatchGame();
        } else {
          this.startStandardQuiz({ mode, chapter: selectedCh, difficulty });
        }
      };
    }
  },

  renderHistorySvgChart(history) {
    if (!history || history.length === 0) {
      return `<p style="font-size: 0.85rem; color: var(--text-muted); padding: 20px 0; text-align: center;">No completed sessions yet. Start a session above to view your progress trend!</p>`;
    }

    const data = history.slice(-10);
    const width = 640;
    const height = 140;
    const padding = 28;

    const xStep = (width - padding * 2) / (data.length - 1 || 1);
    const points = data.map((d, i) => {
      const x = padding + i * xStep;
      const y = height - padding - (d.pct / 100) * (height - padding * 2);
      return { x, y, pct: d.pct, date: d.date };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    return `
      <svg class="svg-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--border-strong)" stroke-width="1" />
        <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="var(--border-light)" stroke-dasharray="4" />
        <text x="4" y="${padding + 4}" fill="var(--text-muted)" font-size="9" font-family="sans-serif">100%</text>
        <text x="4" y="${height - padding}" fill="var(--text-muted)" font-size="9" font-family="sans-serif">0%</text>
        
        <path d="${pathD}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        
        ${points.map(p => `
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="var(--accent)" />
          <text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="bold" fill="var(--text-primary)">
            ${p.pct}%
          </text>
          <text x="${p.x.toFixed(1)}" y="${height - 8}" text-anchor="middle" font-size="8" fill="var(--text-muted)">
            ${p.date}
          </text>
        `).join('')}
      </svg>
    `;
  },

  startStandardQuiz({ mode, chapter, difficulty }) {
    const playArea = document.getElementById('quiz-play-area');
    if (!playArea) return;

    const session = quizEngine.generateQuiz({ mode, chapter, difficulty, questionCount: 8 });
    if (!session || session.questions.length === 0) {
      playArea.innerHTML = `<p>Not enough questions available for this chapter.</p>`;
      return;
    }

    this.renderCurrentQuestion(session, playArea);

    if (mode === 'timed') {
      session.timeLeft = 60;
      session.timerInterval = setInterval(() => {
        session.timeLeft--;
        const timerEl = document.getElementById('quiz-countdown-num');
        const badge = document.querySelector('.quiz-timer-badge');
        if (timerEl) timerEl.textContent = session.timeLeft;
        if (badge && session.timeLeft <= 15) badge.classList.add('urgent');

        if (session.timeLeft <= 0) {
          clearInterval(session.timerInterval);
          this.finishQuizSession(session, playArea);
        }
      }, 1000);
    }
  },

  renderCurrentQuestion(session, container) {
    const q = session.questions[session.currentIndex];
    const progressPct = ((session.currentIndex) / session.questions.length) * 100;

    container.innerHTML = `
      <div class="question-card" style="margin-top: 16px;">
        <div class="quiz-header-bar">
          <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted);">
            QUESTION ${session.currentIndex + 1} OF ${session.questions.length}
          </span>
          ${session.mode === 'timed' ? `
            <div class="quiz-timer-badge">
              ⏳ <span id="quiz-countdown-num">${session.timeLeft || 60}</span>s left
            </div>
          ` : `
            <span style="font-size: 0.85rem; font-weight: 700; color: var(--accent);">Score: ${session.score}</span>
          `}
        </div>

        <div class="quiz-progress-track">
          <div class="quiz-progress-fill" style="width: ${progressPct}%;"></div>
        </div>

        <div class="question-type-label">
          ${q.type === 'scenario' ? `Case Scenario: ${this.escapeHtml(q.title)}` : (q.type === 'true_false' ? 'True or False' : 'Section Mapping')}
        </div>

        <h3 class="question-prompt">${this.escapeHtml(q.prompt)}</h3>

        <div class="options-list">
          ${q.options.map((opt, i) => `
            <button class="quiz-option-btn" data-option-idx="${i}">
              <span>${this.escapeHtml(opt)}</span>
              <span class="option-check-icon"></span>
            </button>
          `).join('')}
        </div>

        <div id="quiz-feedback-container"></div>
      </div>
    `;

    document.querySelectorAll('[data-option-idx]').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute('data-option-idx'), 10);
        this.submitAnswer(session, q, idx, container);
      };
    });
  },

  submitAnswer(session, question, selectedIdx, container) {
    const isCorrect = selectedIdx === question.correctIndex;
    if (isCorrect) session.score++;

    // Disable all options
    document.querySelectorAll('.quiz-option-btn').forEach((b, i) => {
      b.disabled = true;
      if (i === question.correctIndex) {
        b.classList.add('correct');
      } else if (i === selectedIdx && !isCorrect) {
        b.classList.add('wrong');
      }
    });

    const feedbackContainer = document.getElementById('quiz-feedback-container');
    if (feedbackContainer) {
      feedbackContainer.innerHTML = `
        <div class="quiz-feedback-box">
          <div class="feedback-title" style="color: ${isCorrect ? '#19682C' : '#8E2323'};">
            ${isCorrect ? '✔ Correct Answer!' : '✘ Incorrect.'}
          </div>
          <p class="feedback-text">${this.escapeHtml(question.explanation)}</p>
          <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
            ${question.sectionId ? `
              <a href="#/section/${question.sectionId}" class="back-link" style="font-size: 0.85rem;" target="_blank">
                Review § ${question.sectionId} &rarr;
              </a>
            ` : '<div></div>'}
            <button id="quiz-next-btn" class="btn btn-primary" style="padding: 6px 18px;">
              ${session.currentIndex < session.questions.length - 1 ? 'Next Question &rarr;' : 'View Results &rarr;'}
            </button>
          </div>
        </div>
      `;

      const nextBtn = document.getElementById('quiz-next-btn');
      if (nextBtn) {
        nextBtn.onclick = () => {
          session.currentIndex++;
          if (session.currentIndex < session.questions.length) {
            this.renderCurrentQuestion(session, container);
          } else {
            if (session.timerInterval) clearInterval(session.timerInterval);
            this.finishQuizSession(session, container);
          }
        };
      }
    }
  },

  finishQuizSession(session, container) {
    const total = session.questions.length;
    const score = session.score;
    const pct = Math.round((score / total) * 100);

    // Save to storage
    const updatedStats = storage.recordQuizSession({
      score,
      total,
      mode: session.mode,
      chapter: session.chapter
    });

    container.innerHTML = `
      <div class="question-card" style="text-align: center; padding: 40px 20px;">
        <h3 style="font-size: 2rem; margin-bottom: 8px;">Session Complete!</h3>
        <p style="margin-bottom: 24px;">Here is how you performed on this practice set:</p>

        <div style="display: inline-flex; align-items: center; justify-content: center; width: 110px; height: 110px; border-radius: var(--radius-pill); background: var(--bg-subtle); border: 4px solid var(--accent); font-size: 2rem; font-weight: 700; color: var(--accent); margin-bottom: 20px;">
          ${pct}%
        </div>

        <div style="font-size: 1.15rem; margin-bottom: 24px;">
          You got <strong>${score}</strong> out of <strong>${total}</strong> questions correct.
        </div>

        <div style="display: flex; justify-content: center; gap: 12px;">
          <button id="retry-quiz-btn" class="btn btn-primary">Try Another Set</button>
          <a href="#/flashcards" class="btn btn-outline">Review with Flashcards</a>
        </div>
      </div>
    `;

    const retryBtn = document.getElementById('retry-quiz-btn');
    if (retryBtn) {
      retryBtn.onclick = () => {
        this.renderQuizView({ mode: session.mode, chapter: session.chapter, difficulty: session.difficulty });
      };
    }
  },

  // -------------------------------------------------------------
  // Match-the-Pairs Game
  // -------------------------------------------------------------
  startMatchGame() {
    const playArea = document.getElementById('quiz-play-area');
    if (!playArea) return;

    const game = quizEngine.generateMatchPairs(5);
    let selectedLeft = null;
    let selectedRight = null;
    let matchedCount = 0;

    playArea.innerHTML = `
      <div class="question-card" style="margin-top: 16px;">
        <div class="section-label">Interactive Match-the-Pairs</div>
        <p style="font-size: 0.95rem; margin-bottom: 16px;">Click an <strong>Old Law tile</strong> on the left, then click its corresponding <strong>New Sanhita tile</strong> on the right.</p>

        <div class="pairs-grid-container">
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Old Law Provisions</div>
            ${game.leftTiles.map(tile => `
              <div class="pairs-tile" data-pair-id="${tile.id}" data-tile-type="left">
                <div style="font-family: var(--font-mono); font-weight: 700; font-size: 1.1rem; color: var(--text-primary);">${this.escapeHtml(tile.text)}</div>
                <div style="font-size: 0.775rem; color: var(--text-muted);">${this.escapeHtml(tile.subtext)}</div>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">New Sanhita Provisions</div>
            ${game.rightTiles.map(tile => `
              <div class="pairs-tile" data-pair-id="${tile.id}" data-tile-type="right">
                <div style="font-family: var(--font-mono); font-weight: 700; font-size: 1.1rem; color: var(--accent);">${this.escapeHtml(tile.text)}</div>
                <div style="font-size: 0.775rem; color: var(--text-muted);">${this.escapeHtml(tile.subtext)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div id="pairs-status-message" style="text-align: center; font-weight: 600; font-size: 0.95rem; color: var(--accent); margin-top: 12px;"></div>
      </div>
    `;

    const statusMsg = document.getElementById('pairs-status-message');

    document.querySelectorAll('.pairs-tile').forEach(tile => {
      tile.onclick = () => {
        if (tile.classList.contains('matched')) return;

        const tileType = tile.getAttribute('data-tile-type');
        const pairId = tile.getAttribute('data-pair-id');

        if (tileType === 'left') {
          document.querySelectorAll('[data-tile-type="left"]').forEach(t => t.classList.remove('selected'));
          tile.classList.add('selected');
          selectedLeft = pairId;
        } else {
          document.querySelectorAll('[data-tile-type="right"]').forEach(t => t.classList.remove('selected'));
          tile.classList.add('selected');
          selectedRight = pairId;
        }

        if (selectedLeft && selectedRight) {
          if (selectedLeft === selectedRight) {
            // Match found!
            document.querySelectorAll(`[data-pair-id="${selectedLeft}"]`).forEach(t => {
              t.classList.remove('selected');
              t.classList.add('matched');
            });
            matchedCount++;
            this.showToast('✔ Correct Pair!');
            selectedLeft = null;
            selectedRight = null;

            if (matchedCount === game.totalPairs) {
              storage.recordQuizSession({ score: 5, total: 5, mode: 'match' });
              statusMsg.innerHTML = `<span style="color: #19682C;">🎉 Fantastic! All pairs matched correctly!</span>`;
            }
          } else {
            statusMsg.innerHTML = `<span style="color: #C62828;">Not a match. Try again!</span>`;
            setTimeout(() => {
              document.querySelectorAll('.pairs-tile.selected').forEach(t => t.classList.remove('selected'));
              selectedLeft = null;
              selectedRight = null;
              statusMsg.textContent = '';
            }, 700);
          }
        }
      };
    });
  },

  // -------------------------------------------------------------
  // View 6: LEITNER FLASHCARDS VIEW
  // -------------------------------------------------------------
  renderFlashcardsView() {
    document.title = 'Leitner Spaced Repetition Flashcards — BNS Mapper';
    quizEngine.initFlashcardSession();
    const card = quizEngine.getCurrentFlashcard();
    const boxes = storage.getLeitnerBoxes();

    this.appContainer.innerHTML = `
      <section class="detail-view" aria-labelledby="flashcards-title">
        <nav class="detail-nav-bar">
          <a href="#/quiz" class="back-link">&larr; Back to Quiz Mode</a>
          <button id="reset-leitner-btn" class="btn btn-outline" style="font-size: 0.8rem;">Reset Leitner Boxes</button>
        </nav>

        <div style="text-align: center; margin-bottom: 20px;">
          <h2 id="flashcards-title" style="font-size: 2rem; margin-bottom: 6px;">Leitner Spaced Repetition</h2>
          <p>Click card to flip between Old Law and New Sanhita. Cards advance to Box 5 as you master them.</p>
        </div>

        <!-- 5 Leitner Box Counters -->
        <div class="leitner-boxes-bar">
          ${[1, 2, 3, 4, 5].map(b => `
            <div class="leitner-box-col">
              <div class="leitner-box-title">Box ${b}</div>
              <div class="leitner-box-count">${(boxes[b] || []).length}</div>
            </div>
          `).join('')}
        </div>

        ${!card ? `
          <div class="empty-state">
            <h3>All Flashcards Reviewed!</h3>
            <p>You have mastered your current pool of cards.</p>
          </div>
        ` : `
          <!-- 3D Flip Flashcard -->
          <div class="flashcard-wrapper">
            <div id="active-flashcard" class="flashcard" role="button" aria-label="Flashcard: click to flip" tabindex="0">
              <!-- Front Face (Prompt) -->
              <div class="card-face front">
                <div>
                  <span class="badge badge-renumbered" style="margin-bottom: 12px;">Front: Old Law</span>
                  <div style="font-size: 0.85rem; color: var(--text-muted);">${this.escapeHtml(card.chapter)}</div>
                </div>
                <div style="text-align: center; margin: 32px 0;">
                  <div style="font-family: var(--font-mono); font-size: 2.2rem; font-weight: 700; color: var(--accent); margin-bottom: 8px;">
                    § ${this.escapeHtml(card.ipc)}
                  </div>
                  <h3 style="font-size: 1.3rem;">${this.escapeHtml(card.title)}</h3>
                </div>
                <div style="text-align: center; font-size: 0.8rem; color: var(--text-muted);">
                  (Tap or press Space to reveal New BNS Section &amp; Changes)
                </div>
              </div>

              <!-- Back Face (Answer) -->
              <div class="card-face back">
                <div>
                  <span class="badge badge-new" style="margin-bottom: 12px;">Back: New Sanhita</span>
                  <div style="font-family: var(--font-mono); font-size: 1.8rem; font-weight: 700; color: var(--accent);">
                    BNS Section ${this.escapeHtml(card.bns)}
                  </div>
                </div>
                <div style="margin: 16px 0;">
                  <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">KEY CHANGE:</div>
                  <p style="font-size: 0.95rem; line-height: 1.5;">${this.escapeHtml(card.explanation)}</p>
                </div>
                <div style="text-align: center; font-size: 0.8rem; color: var(--text-muted);">
                  New Punishment: <strong>${this.escapeHtml(card.punishment_new)}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Controls -->
          <div style="display: flex; justify-content: center; gap: 16px; margin-top: 24px;">
            <button id="flashcard-wrong-btn" class="btn btn-outline" style="color: #C62828; border-color: #FECACA;">
              ✘ Need Practice (Drop to Box 1)
            </button>
            <button id="flashcard-correct-btn" class="btn btn-primary" style="background: #2E7D32;">
              ✔ I Knew It (Advance Box)
            </button>
          </div>
        `}
      </section>
    `;

    const cardEl = document.getElementById('active-flashcard');
    if (cardEl) {
      const flip = () => cardEl.classList.toggle('flipped');
      cardEl.onclick = flip;
      cardEl.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          flip();
        }
      };
    }

    const wrongBtn = document.getElementById('flashcard-wrong-btn');
    const correctBtn = document.getElementById('flashcard-correct-btn');

    if (wrongBtn) {
      wrongBtn.onclick = () => {
        quizEngine.answerFlashcard(false);
        this.renderFlashcardsView();
        this.showToast('Card moved back to Box 1');
      };
    }

    if (correctBtn) {
      correctBtn.onclick = () => {
        const res = quizEngine.answerFlashcard(true);
        this.renderFlashcardsView();
        this.showToast(`Card promoted to Box ${res.newBox}!`);
      };
    }

    const resetBtn = document.getElementById('reset-leitner-btn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (confirm('Reset all flashcards back to Box 1?')) {
          storage.resetLeitner();
          this.renderFlashcardsView();
        }
      };
    }
  },

  // -------------------------------------------------------------
  // View 7: WHAT'S NEW IN BNS (BRAND-NEW OFFENCES)
  // -------------------------------------------------------------
  renderWhatsNew() {
    document.title = "What's New in Bharatiya Nyaya Sanhita — BNS Mapper";
    const all = searchEngine.getAllSectionsCombined();
    const newProvisions = all.filter(s => s.change === 'new' || s.change === 'modified' || s.explanation.includes('community service'));

    this.appContainer.innerHTML = `
      <section class="detail-view" aria-labelledby="whats-new-title">
        <div style="margin-bottom: 24px;">
          <h2 id="whats-new-title" style="font-size: 2.2rem; margin-bottom: 8px;">What's New in the Sanhitas?</h2>
          <p>Key statutory innovations, brand-new criminal offences, and reformative sentencing models introduced in 2023.</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div class="detail-header-card">
            <span class="badge badge-new" style="margin-bottom: 12px;">Brand New Offence</span>
            <h3 style="font-size: 1.4rem; margin-bottom: 8px;">
              <a href="#/section/bns-304">Section 304 BNS &mdash; Snatching</a>
            </h3>
            <p style="margin-bottom: 12px;">
              IPC had no dedicated offence for street snatching of phones, purses, and gold chains; police had to choose between simple theft or violent robbery. BNS 304 creates an express category for sudden/forcible seizing.
            </p>
            <div class="punishment-box">
              <span class="punishment-tag">Punishment:</span>
              <span class="punishment-text">Imprisonment up to 3 years and fine.</span>
            </div>
          </div>

          <div class="detail-header-card">
            <span class="badge badge-new" style="margin-bottom: 12px;">Brand New Provision</span>
            <h3 style="font-size: 1.4rem; margin-bottom: 8px;">
              <a href="#/section/bns-103-2">Section 103(2) BNS &mdash; Mob Lynching / Group Hate Murder</a>
            </h3>
            <p style="margin-bottom: 12px;">
              Expressly codifies group murder committed by five or more persons on grounds of race, caste, community, sex, place of birth, language, or personal belief.
            </p>
            <div class="punishment-box">
              <span class="punishment-tag">Punishment:</span>
              <span class="punishment-text">Capital punishment (Death) or Life Imprisonment, and fine.</span>
            </div>
          </div>

          <div class="detail-header-card">
            <span class="badge badge-new" style="margin-bottom: 12px;">Brand New Provision</span>
            <h3 style="font-size: 1.4rem; margin-bottom: 8px;">
              <a href="#/section/bns-111">Section 111 BNS &mdash; Organised Crime</a>
            </h3>
            <p style="margin-bottom: 12px;">
              Establishes a unified central penal code offence for criminal syndicates, contract killings, kidnapping rackets, and land grabbing, ending sole reliance on state laws like MCOCA.
            </p>
            <div class="punishment-box">
              <span class="punishment-tag">Punishment:</span>
              <span class="punishment-text">Death or life imprisonment if death ensues; otherwise 5 years to life, minimum ₹5 lakh fine.</span>
            </div>
          </div>

          <div class="detail-header-card">
            <span class="badge badge-modified" style="margin-bottom: 12px;">Sentencing Reform</span>
            <h3 style="font-size: 1.4rem; margin-bottom: 8px;">
              <a href="#/section/ipc-379">Community Service as Alternative Sentence</a>
            </h3>
            <p style="margin-bottom: 12px;">
              For first-time petty theft under ₹5,000 (Section 303(2)) and defamation (Section 356(2)), judges can now award reformative community service instead of jail time.
            </p>
          </div>
        </div>
      </section>
    `;
    this.renderCompareTray();
  },

  // -------------------------------------------------------------
  // View 8: COMPARE MODE (UP TO 3 SECTIONS PINNED)
  // -------------------------------------------------------------
  renderCompareView() {
    document.title = 'Side-by-Side Comparison Mode — BNS Mapper';
    const pinnedIds = storage.getCompareSections();
    const all = searchEngine.getAllSectionsCombined();
    const pinnedSections = all.filter(s => pinnedIds.includes(s.id));

    this.appContainer.innerHTML = `
      <section class="detail-view" style="max-width: 1100px;" aria-labelledby="compare-mode-title">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 24px;">
          <div>
            <h2 id="compare-mode-title" style="font-size: 2rem; margin-bottom: 4px;">Side-by-Side Comparison Mode</h2>
            <p>Pin up to 3 provisions from search results to evaluate differences simultaneously.</p>
          </div>
          ${pinnedSections.length > 0 ? `
            <button id="clear-all-compare-btn" class="btn btn-outline">Clear Pins</button>
          ` : ''}
        </div>

        ${pinnedSections.length === 0 ? `
          <div class="empty-state">
            <h3>No Sections Pinned Yet</h3>
            <p>Use the pin icon (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle;"><path d="M16 12V4a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v8l-2 3v2h6v5l1 1 1-1v-5h6v-2l-2-3z"></path></svg>) on any section card or detail page to pin up to 3 sections here.</p>
            <div style="margin-top: 16px;">
              <a href="#/" class="btn btn-primary">Browse Sections &rarr;</a>
            </div>
          </div>
        ` : `
          <div class="compare-grid cols-${pinnedSections.length}">
            ${pinnedSections.map(sec => `
              <div class="compare-col">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <div style="font-family: var(--font-mono); font-size: 1.3rem; font-weight: 700; color: var(--accent);">
                      § ${sec.ipc} &rarr; § ${sec.bns}
                    </div>
                    ${this.getBadgeHtml(sec.change)}
                  </div>
                  <button class="remove-pin-btn icon-btn" data-unpin-id="${sec.id}" title="Remove from comparison">&times;</button>
                </div>

                <h3 style="font-size: 1.15rem;"><a href="#/section/${sec.id}">${this.escapeHtml(sec.title)}</a></h3>

                <div class="punishment-box">
                  <div class="punishment-tag">New Punishment:</div>
                  <div class="punishment-text" style="font-size: 0.85rem;">${this.escapeHtml(sec.punishment_new)}</div>
                </div>

                <div>
                  <div class="section-label">Plain-English Explainer:</div>
                  <p style="font-size: 0.85rem; line-height: 1.5;">${this.escapeHtml(sec.explanation)}</p>
                </div>

                <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border-color);">
                  <a href="#/section/${sec.id}" class="card-read-more">Full Section Comparison &rarr;</a>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </section>
    `;

    document.querySelectorAll('[data-unpin-id]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-unpin-id');
        storage.toggleCompare(id);
        this.renderCompareView();
        this.renderCompareTray();
      };
    });

    const clearAll = document.getElementById('clear-all-compare-btn');
    if (clearAll) {
      clearAll.onclick = () => {
        storage.clearCompare();
        this.renderCompareView();
        this.renderCompareTray();
      };
    }
  }
};
