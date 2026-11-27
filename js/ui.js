/**
 * UI Renderer for BNS Mapper (Round 1 Upgrade)
 * Supports multi-section array mappings (e.g., "IPC 300 + 302 -> BNS 103"),
 * chapters index metadata, quiz, Leitner flashcards, compare mode & What's New.
 */

import { storage, DIRECTIONS, STATUTES } from './storage.js';
import { searchEngine } from './search.js';
import { quizEngine } from './quiz.js';

export const ui = {
  appContainer: null,
  activeFilterChange: 'all',
  lastSearchQuery: '',
  morphTimer: null,
  chaptersIndex: [],

  init(containerEl) {
    this.appContainer = containerEl;
  },

  setChaptersIndex(index) {
    this.chaptersIndex = index || [];
  },

  getChapterTitle(chNum) {
    const found = this.chaptersIndex.find(c => c.chapter === chNum);
    return found ? `${found.title} (Sections ${found.range})` : `Chapter ${chNum}`;
  },

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
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

  // Multi-Section Format Helper (e.g. IPC 300 + 302 -> BNS 103)
  formatSections(arr, prefix = '') {
    if (!arr) return 'None';
    const list = Array.isArray(arr) ? arr : [arr];
    if (list.length === 0 || (list.length === 1 && list[0] === 'None')) return `None (New)`;
    if (list.length === 1 && list[0] === 'Omitted') return `Omitted`;
    if (list.length === 1 && list[0] === 'No direct BNS equivalent') return `No direct BNS equivalent`;

    const joined = list.map(num => `§ ${num}`).join(' + ');
    return prefix ? `${prefix} ${joined}` : joined;
  },

  // -------------------------------------------------------------
  // Real Splash Loader Controller
  // -------------------------------------------------------------
  updateSplashProgress(pct, statusText) {
    const fill = document.getElementById('splash-progress-fill');
    const status = document.getElementById('splash-status-text');
    if (fill) fill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    if (status && statusText) status.textContent = statusText;
  },

  dismissSplash() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    this.updateSplashProgress(100, 'Codification loaded');
    storage.markSplashShown();
    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.remove();
        if (!storage.getTourCompleted()) {
          setTimeout(() => this.startTour(), 700);
        }
      }, 450);
    }, 200);
  },

  // -------------------------------------------------------------
  // Upgraded Stacking Toast Notifications
  // -------------------------------------------------------------
  showToast(message, type = 'info', duration = 2800) {
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
    toast.className = `toast-item toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <span>${this.escapeHtml(message)}</span>
    `;

    toast.onclick = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 200);
    };

    toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => toast.remove(), 250);
      }
    }, duration);
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
        ${compareList.map(id => `<span class="compare-chip">${this.escapeHtml(id.replace('ipc-', '§').replace('bns-', '§'))}</span>`).join('')}
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

    const sotd = this.getSectionOfTheDay();

    let statutePairName = 'IPC (1860) &harr; BNS (2023)';
    let primaryPlaceholder = isIpcToBns ? 'IPC number (e.g. 34, 76, 302)' : 'BNS number (e.g. 1, 4, 14, 103)';
    if (currentStatute === STATUTES.CRPC_BNSS) {
      statutePairName = 'CrPC (1973) &harr; BNSS (2023)';
      primaryPlaceholder = isIpcToBns ? 'CrPC section (e.g. 41, 154)' : 'BNSS section (e.g. 35, 173)';
    } else if (currentStatute === STATUTES.IEA_BSA) {
      statutePairName = 'IEA (1872) &harr; BSA (2023)';
      primaryPlaceholder = isIpcToBns ? 'IEA section (e.g. 27, 65B)' : 'BSA section (e.g. 23, 63)';
    }

    this.appContainer.innerHTML = `
      <section class="search-hero" aria-labelledby="hero-title">
        <div class="hero-drifting-bg" aria-hidden="true">
          <span class="drifting-glyph">§ 302</span>
          <span class="drifting-glyph">§ 103</span>
          <span class="drifting-glyph">§ 420</span>
          <span class="drifting-glyph">§ 69</span>
        </div>

        <div class="hero-morph-banner" aria-hidden="true">
          <span>Old Code:</span>
          <span id="hero-morph-old" class="morph-pill">IPC 1 to 5</span>
          <span>&rarr;</span>
          <span>New Sanhita:</span>
          <span id="hero-morph-new" class="morph-pill">BNS 1</span>
        </div>

        <h2 id="hero-title" class="hero-title">Navigate Indian Criminal Law</h2>
        <p class="hero-subtitle">
          Instant multi-section cross-reference for <strong>${statutePairName}</strong> with full operative extracts and plain-English analysis.
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
              placeholder="Search by ${primaryPlaceholder}, title, or keyword..."
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

          <div class="quick-chips-wrapper" aria-label="Popular searches">
            <span class="quick-chip-label">Popular:</span>
            <button class="quick-chip" data-quick-search="302">Murder (302)</button>
            <button class="quick-chip" data-quick-search="snatching">Snatching (304)</button>
            <button class="quick-chip" data-quick-search="376">Rape (376)</button>
            <button class="quick-chip" data-quick-search="420">Cheating (420)</button>
            <button class="quick-chip" data-quick-search="69">Deceitful Promise (§ 69)</button>
            <button class="quick-chip" data-quick-search="hit and run">Hit &amp; Run</button>
            <button class="quick-chip" data-quick-search="defamation">Defamation</button>
          </div>

          <div class="filter-pills-row" role="radiogroup" aria-label="Filter by change type">
            ${['all', 'renumbered', 'modified', 'merged', 'split', 'new', 'omitted'].map(type => `
              <button
                class="filter-pill ${filterChange === type ? 'active' : ''}"
                data-filter="${type}"
                role="radio"
                aria-checked="${filterChange === type}"
              >
                ${type.charAt(0).toUpperCase() + type.slice(1)}
                <span class="filter-count count-up-target" data-target="${counts[type] || 0}">${counts[type] || 0}</span>
              </button>
            `).join('')}
          </div>
        </div>

        ${(!query && filterChange === 'all' && sotd) ? `
          <div class="sotd-card" role="region" aria-label="Section of the Day">
            <div>
              <div class="sotd-badge-label">Section of the Day</div>
              <div class="sotd-title">${this.formatSections(sotd.ipc, 'IPC')} &rarr; ${this.formatSections(sotd.bns, 'BNS')}: ${this.escapeHtml(sotd.title)}</div>
              <p class="sotd-desc">${this.escapeHtml(sotd.explanation)}</p>
            </div>
            <a href="#/section/${sotd.id}" class="btn btn-primary" style="white-space: nowrap; font-size: 0.8rem; padding: 6px 14px;">
              Explore &rarr;
            </a>
          </div>
        ` : ''}
      </section>

      ${(!query && filterChange === 'all') ? `
        <section class="explainer-section" aria-label="How IPC became BNS">
          <div class="explainer-header">
            <h3>How the Indian Penal Code Became BNS</h3>
            <p>Three core architectural shifts defining India's substantive criminal law transition</p>
          </div>
          <div class="explainer-steps">
            <div class="explainer-step-card">
              <div class="explainer-step-num">1</div>
              <div class="explainer-step-title">Streamlined &amp; Consolidated</div>
              <div class="explainer-step-text">511 sections pruned and renumbered into 358 cohesive sections across 20 thematic chapters, eliminating archaic colonial repetition.</div>
            </div>
            <div class="explainer-step-card">
              <div class="explainer-step-num">2</div>
              <div class="explainer-step-title">Modernized Offences</div>
              <div class="explainer-step-text">Added modern statutory provisions: Snatching (§ 304), Organized Crime (§ 111), Terrorist Acts (§ 113), and Deceitful Promise of Marriage (§ 69).</div>
            </div>
            <div class="explainer-step-card">
              <div class="explainer-step-num">3</div>
              <div class="explainer-step-title">Community Service &amp; Gender Focus</div>
              <div class="explainer-step-text">Introduced Community Service as a reformative penalty (§ 4) and instituted stringent priority protections for women and children (Chapter V).</div>
            </div>
          </div>
        </section>
      ` : ''}

      <section class="results-section" aria-live="polite">
        <div class="results-meta-bar">
          <span class="results-count">
            Showing <strong>${results.length}</strong> ${results.length === 1 ? 'provision' : 'provisions'}
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
            <p>Try searching with a section number like <strong>4</strong>, <strong>14</strong>, <strong>34</strong>, <strong>302</strong>, or keywords like <strong>common intention</strong>, <strong>private defence</strong>, <strong>mistake of fact</strong>.</p>
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
      { oldCode: 'IPC 1 to 5', newCode: 'BNS 1' },
      { oldCode: 'IPC 34', newCode: 'BNS 3(5)' },
      { oldCode: 'IPC 53', newCode: 'BNS 4' },
      { oldCode: 'IPC 76', newCode: 'BNS 14' },
      { oldCode: 'IPC 84', newCode: 'BNS 22' },
      { oldCode: 'IPC 96', newCode: 'BNS 34' }
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

    // Multi-section formatted labels
    const formattedIpc = this.formatSections(item.ipc, oldPrefix);
    const formattedBns = this.formatSections(item.bns, newPrefix);

    const primaryNumber = isIpcToBns ? formattedIpc : formattedBns;
    const secondaryNumber = isIpcToBns ? formattedBns : formattedIpc;

    const highlightedTitle = this.highlightSearchTerm(item.title, query);
    const highlightedExplanation = this.highlightSearchTerm(item.explanation, query);

    // Format chapter display
    const chLabel = item.chapter ? `Chapter ${item.chapter}` : '';

    if (item.isOmittedIpc || (Array.isArray(item.bns) && item.bns.includes('No direct BNS equivalent'))) {
      return `
        <article class="section-card" data-section-id="${item.id}" style="border-left: 4px solid #C62828;">
          <div class="card-top">
            <div class="mapping-numbers">
              <span class="number-primary">${formattedIpc}</span>
              <span class="mapping-arrow">&rarr;</span>
              <span class="number-secondary" style="color: #C62828; font-size: 0.85rem; font-weight: 700;">No direct BNS equivalent</span>
            </div>
            <div class="card-actions">
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
            <span class="badge badge-omitted">No direct BNS equivalent</span>
          </div>

          <h3 class="card-title">
            <a href="#/section/${item.id}">${highlightedTitle}</a>
          </h3>

          <p class="card-explanation">${highlightedExplanation}</p>

          <div class="card-footer">
            <span class="card-chapter-tag" title="IPC Provision Dropped or Subsumed">Omitted in BNS</span>
            <a href="#/section/${item.id}" class="card-read-more" aria-label="View Omission Note">
              Omission Note &rarr;
            </a>
          </div>
        </article>
      `;
    }

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
          <span class="card-chapter-tag" title="${chLabel}">${chLabel}</span>
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

    document.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const term = chip.getAttribute('data-quick-search');
        if (input) {
          input.value = term;
          input.dispatchEvent(new Event('input'));
          input.focus();
        }
      });
    });

    this.bindCardActions();
    this.initTypewriter();
    this.initCardTilt();
    this.initCountUp();
  },

  updateSearchResultsGrid(results, direction, query = '') {
    const metaBar = document.querySelector('.results-meta-bar');
    const resultsContainer = document.querySelector('.results-section');
    if (!resultsContainer) return;

    if (metaBar) {
      metaBar.innerHTML = `
        <span class="results-count">
          Showing <strong>${results.length}</strong> ${results.length === 1 ? 'provision' : 'provisions'}
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
      this.initCardTilt();
    }
  },

  bindCardActions() {
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
  // View 2: Section Detail Page (Multi-Section Support)
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

    const bnsLabel = this.formatSections(item.bns);
    const ipcLabel = this.formatSections(item.ipc);

    document.title = `IPC ${ipcLabel} → BNS ${bnsLabel}: ${item.title} — BNS Mapper`;
    const isBookmarked = storage.isBookmarked(item.id);
    const isPinned = storage.isComparing(item.id);

    const all = searchEngine.getAllSections();
    const curIndex = all.findIndex(s => s.id === item.id);
    const prevItem = curIndex > 0 ? all[curIndex - 1] : null;
    const nextItem = curIndex < all.length - 1 ? all[curIndex + 1] : null;

    const chFullTitle = this.getChapterTitle(item.chapter);
    const diff = this.computeTextDiff(item.old_text, item.new_text);

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
          <div class="detail-chapter">Chapter ${this.escapeHtml(item.chapter)} &bull; ${this.escapeHtml(chFullTitle)}</div>
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
              <div class="map-col-title">Old Indian Penal Code (1860)</div>
              <div class="map-col-sec">${this.formatSections(item.ipc)}</div>
            </div>
            <div class="map-arrow-icon">&rarr;</div>
            <div>
              <div class="map-col-title">Bharatiya Nyaya Sanhita (2023)</div>
              <div class="map-col-sec">${this.formatSections(item.bns)}</div>
            </div>
          </div>
        </header>

        <section aria-labelledby="comparison-heading">
          <div class="section-label" id="comparison-heading">Statutory Text Comparison</div>
          <div class="comparison-container">
            <div class="comparison-box">
              <div class="comparison-header">
                <span>IPC 1860 &bull; ${this.formatSections(item.ipc)}</span>
                <span class="badge" style="font-size: 0.65rem;">Repealed</span>
              </div>
              <div class="comparison-body">
                <div class="law-text-content">${diff.oldHtml}</div>
              </div>
            </div>

            <div class="comparison-box">
              <div class="comparison-header">
                <span>BNS 2023 &bull; ${this.formatSections(item.bns)}</span>
                <span class="badge badge-new" style="font-size: 0.65rem;">In Force</span>
              </div>
              <div class="comparison-body">
                <div class="law-text-content">${diff.newHtml}</div>
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
              &larr; Prev: ${this.formatSections(prevItem.bns)}
            </a>
          ` : '<div></div>'}
          ${nextItem ? `
            <a href="#/section/${nextItem.id}" class="btn btn-outline">
              Next: ${this.formatSections(nextItem.bns)} &rarr;
            </a>
          ` : '<div></div>'}
        </nav>
      </article>
    `;

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

    this.initReadingProgressBar();
    this.renderCompareTray();
  },

  // -------------------------------------------------------------
  // View 3: Chapter Browser (Chapters Index Grouping)
  // -------------------------------------------------------------
  renderChaptersView({ filterChange = 'all' } = {}) {
    document.title = 'Chapters & Categories — BNS Mapper';
    const allSections = searchEngine.getAllSections();
    const filtered = filterChange === 'all'
      ? allSections
      : allSections.filter(s => s.change === filterChange);

    const chaptersMap = new Map();
    filtered.forEach(item => {
      const ch = item.chapter || 'I';
      if (!chaptersMap.has(ch)) chaptersMap.set(ch, []);
      chaptersMap.get(ch).push(item);
    });

    const direction = storage.getDirection();
    const isIpcToBns = direction === DIRECTIONS.IPC_TO_BNS;

    this.appContainer.innerHTML = `
      <section class="chapters-view-container" aria-labelledby="chapters-title">
        <div style="margin-bottom: 20px;">
          <h2 id="chapters-title" style="font-size: 2rem; margin-bottom: 8px;">Chapter Browser</h2>
          <p>Explore provisions organized by BNS chapters (Chapters I to XX) with multi-section mappings.</p>
        </div>

        <div class="filter-pills-row" style="justify-content: flex-start; margin-bottom: 24px;" role="radiogroup" aria-label="Filter chapters by change type">
          ${['all', 'renumbered', 'modified', 'merged', 'split', 'new', 'omitted'].map(type => `
            <button class="filter-pill ${filterChange === type ? 'active' : ''}" data-chapter-filter="${type}" role="radio" aria-checked="${filterChange === type}">
              ${type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          `).join('')}
        </div>

        <div class="chapters-container">
          ${Array.from(chaptersMap.entries()).map(([chKey, items]) => {
            const chTitle = this.getChapterTitle(chKey);
            return `
              <div class="chapter-group">
                <div class="chapter-header">
                  <h3 class="chapter-title">Chapter ${this.escapeHtml(chKey)}: ${this.escapeHtml(chTitle)}</h3>
                  <span class="chapter-count-badge">${items.length} ${items.length === 1 ? 'section' : 'sections'}</span>
                </div>
                <div class="chapter-sections-list">
                  ${items.map(item => `
                    <a href="#/section/${item.id}" class="chapter-section-item">
                      <div class="sec-info-left">
                        <span class="sec-pill-num">
                          ${isIpcToBns
                            ? `${this.formatSections(item.ipc, 'IPC')} &rarr; ${this.formatSections(item.bns, 'BNS')}`
                            : `${this.formatSections(item.bns, 'BNS')} &rarr; ${this.formatSections(item.ipc, 'IPC')}`}
                        </span>
                        <span class="sec-title-text">${this.escapeHtml(item.title)}</span>
                      </div>
                      <div>${this.getBadgeHtml(item.change)}</div>
                    </a>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
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
                    <td><strong>${this.formatSections(item.ipc)}</strong></td>
                    <td><strong style="color: var(--accent);">${this.formatSections(item.bns)}</strong></td>
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
                    ${allChapters.map(ch => `<option value="${this.escapeHtml(ch)}" ${chapter === ch ? 'selected' : ''}>Chapter ${this.escapeHtml(ch)}</option>`).join('')}
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

        <div id="quiz-play-area"></div>

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

          <div class="chart-container">
            <div class="section-label" style="margin-bottom: 8px;">Recent Session Accuracy (%)</div>
            ${this.renderHistorySvgChart(stats.history)}
          </div>

          <div class="chart-container" style="margin-top: 24px;">
            <div class="section-label" style="margin-bottom: 12px;">Weak Chapters &amp; Focused Revision</div>
            ${this.renderWeakChaptersDashboard(stats, allChapters)}
          </div>
        </section>
      </section>
    `;

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

  renderWeakChaptersDashboard(stats, allChapters) {
    const chapterStats = stats.chapterStats || {};
    const attempted = [];

    for (const ch of (allChapters || [])) {
      if (!ch || ch === 'Omitted') continue;
      const cs = chapterStats[ch];
      if (cs && cs.total > 0) {
        const acc = Math.round((cs.correct / cs.total) * 100);
        attempted.push({
          chapter: ch,
          accuracy: acc,
          correct: cs.correct,
          total: cs.total
        });
      }
    }

    if (attempted.length > 0) {
      // Sort by lowest accuracy first (weakest first)
      attempted.sort((a, b) => a.accuracy - b.accuracy);
      const weakest = attempted.filter(a => a.accuracy < 75);

      return `
        <div style="margin-bottom: 8px;">
          ${weakest.length > 0 ? `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #C62828; font-weight: 600; font-size: 0.95rem;">
              <span>⚠️ Need Attention: ${weakest.length} ${weakest.length === 1 ? 'Chapter has' : 'Chapters have'} accuracy below 75%</span>
            </div>
          ` : `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #19682C; font-weight: 600; font-size: 0.95rem;">
              <span>✔ Strong Performance across all attempted chapters!</span>
            </div>
          `}
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;">
            ${attempted.map(item => `
              <div class="punishment-box" style="padding: 12px 16px; border-left: 4px solid ${item.accuracy < 60 ? '#C62828' : (item.accuracy < 80 ? '#D97706' : '#19682C')};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <strong style="font-size: 1rem;">Chapter ${item.chapter}</strong>
                  <span class="badge ${item.accuracy < 60 ? 'badge-omitted' : (item.accuracy < 80 ? 'badge-modified' : 'badge-renumbered')}">
                    ${item.accuracy}% (${item.correct}/${item.total})
                  </span>
                </div>
                <div class="quiz-progress-track" style="height: 6px; margin: 8px 0;">
                  <div class="quiz-progress-fill" style="width: ${item.accuracy}%; background: ${item.accuracy < 60 ? '#C62828' : (item.accuracy < 80 ? '#D97706' : '#19682C')};"></div>
                </div>
                <a href="#/quiz?mode=mixed&chapter=${item.chapter}&diff=medium" class="btn btn-outline" style="width: 100%; text-align: center; padding: 4px 10px; font-size: 0.8rem; margin-top: 6px;">
                  Practice Chapter ${item.chapter} &rarr;
                </a>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Default suggestions when user hasn't attempted specific chapters yet
    const recommendedChapters = [
      { ch: 'VI', title: 'Offences Affecting Human Body (ss. 100-146)', desc: 'High traffic: Culpable homicide, murder, mob lynching, grievous hurt' },
      { ch: 'XVII', title: 'Offences Against Property (ss. 303-334)', desc: 'High traffic: Theft, new snatching offence, extortion, robbery, cheating' },
      { ch: 'V', title: 'Offences Against Woman & Child (ss. 63-99)', desc: 'Crucial changes: Deceitful marriage promise, gang rape minors, child hiring' },
      { ch: 'XIV', title: 'Public Justice & False Evidence (ss. 227-269)', desc: 'Fabricating evidence, witness intimidation, harbouring, custody escape' }
    ];

    return `
      <div>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 12px;">
          Practice chapter-specific quizzes above to unlock detailed diagnostic accuracy metrics. Recommended high-yield focus chapters for judicial exams:
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
          ${recommendedChapters.map(r => `
            <div class="punishment-box" style="padding: 12px 16px; border-left: 4px solid var(--accent);">
              <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 2px;">Chapter ${r.ch}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px;">${r.title}</div>
              <p style="font-size: 0.8rem; margin-bottom: 10px; line-height: 1.4;">${r.desc}</p>
              <a href="#/quiz?mode=mixed&chapter=${r.ch}&diff=medium" class="btn btn-outline" style="width: 100%; text-align: center; padding: 4px 10px; font-size: 0.8rem;">
                Target Chapter ${r.ch} &rarr;
              </a>
            </div>
          `).join('')}
        </div>
      </div>
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
      <div class="question-card quiz-card-animated" style="margin-top: 16px;">
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
          ${q.type === 'scenario' ? `Case Scenario: ${this.escapeHtml(q.title || 'Practical Legal Application')}` : (q.type === 'true_false' ? 'True or False' : 'Section Mapping')}
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

    session.answers.push({
      questionIndex: session.currentIndex,
      selectedIndex: selectedIdx,
      isCorrect
    });

    document.querySelectorAll('.quiz-option-btn').forEach((b, i) => {
      b.disabled = true;
      if (i === question.correctIndex) {
        b.classList.add('correct', 'correct-reveal');
      } else if (i === selectedIdx && !isCorrect) {
        b.classList.add('wrong', 'wrong-reveal');
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

    const savedStats = storage.recordQuizSession({
      score,
      total,
      mode: session.mode,
      chapter: session.chapter
    });

    if (session.answers && session.answers.length > 0) {
      session.answers.forEach(a => {
        const q = session.questions[a.questionIndex];
        if (q && q.chapter) {
          storage.recordQuestionAnswer(q.chapter, a.isCorrect);
        }
      });
    }

    if (pct >= 80 || (savedStats && savedStats.currentStreak >= 3)) {
      this.triggerConfetti();
    }

    container.innerHTML = `
      <div class="question-card quiz-card-animated" style="text-align: center; padding: 40px 20px;">
        <h3 style="font-size: 2rem; margin-bottom: 8px;">Session Complete!</h3>
        <p style="margin-bottom: 24px;">Here is how you performed on this practice set:</p>

        <div style="position: relative; width: 120px; height: 120px; margin: 0 auto 20px;">
          <svg width="120" height="120" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" stroke="var(--bg-muted)" stroke-width="8" fill="none" />
            <circle id="quiz-score-circle" cx="50" cy="50" r="42" stroke="${pct >= 70 ? 'var(--color-success)' : 'var(--accent)'}" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="264" stroke-dashoffset="264" transform="rotate(-90 50 50)" style="transition: stroke-dashoffset 1s ease-out;" />
          </svg>
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 700; color: var(--text-primary);">
            ${pct}%
          </div>
        </div>

        <div style="font-size: 1.15rem; margin-bottom: 24px;">
          You got <strong>${score}</strong> out of <strong>${total}</strong> questions correct.
          ${pct >= 80 ? '<div style="margin-top: 6px; color: var(--color-success); font-weight: 600;">Outstanding mastery! 🔥</div>' : ''}
        </div>

        <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
          <button id="retry-quiz-btn" class="btn btn-primary">Try Another Set</button>
          <a href="#/flashcards" class="btn btn-outline">Review with Flashcards</a>
        </div>
      </div>
    `;

    setTimeout(() => {
      const circle = document.getElementById('quiz-score-circle');
      if (circle) {
        circle.style.strokeDashoffset = String(264 - Math.round((264 * pct) / 100));
      }
    }, 60);

    const retryBtn = document.getElementById('retry-quiz-btn');
    if (retryBtn) {
      retryBtn.onclick = () => {
        this.renderQuizView({ mode: session.mode, chapter: session.chapter, difficulty: session.difficulty });
      };
    }
  },

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
          <div class="flashcard-wrapper">
            <div id="active-flashcard" class="flashcard" role="button" aria-label="Flashcard: click to flip" tabindex="0">
              <div class="card-face front">
                <div>
                  <span class="badge badge-renumbered" style="margin-bottom: 12px;">Front: Old Law</span>
                  <div style="font-size: 0.85rem; color: var(--text-muted);">${card.chapter ? `Chapter ${card.chapter}` : ''}</div>
                </div>
                <div style="text-align: center; margin: 32px 0;">
                  <div style="font-family: var(--font-mono); font-size: 2rem; font-weight: 700; color: var(--accent); margin-bottom: 8px;">
                    ${this.formatSections(card.ipc, 'IPC')}
                  </div>
                  <h3 style="font-size: 1.25rem;">${this.escapeHtml(card.title)}</h3>
                </div>
                <div style="text-align: center; font-size: 0.8rem; color: var(--text-muted);">
                  (Tap or press Space to reveal New BNS Section &amp; Changes)
                </div>
              </div>

              <div class="card-face back">
                <div>
                  <span class="badge badge-new" style="margin-bottom: 12px;">Back: New Sanhita</span>
                  <div style="font-family: var(--font-mono); font-size: 1.8rem; font-weight: 700; color: var(--accent);">
                    ${this.formatSections(card.bns, 'BNS')}
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

    const allCombined = searchEngine.getAllSectionsCombined();
    // Rebuild automatically from every entry with change = "new"
    const newSections = allCombined.filter(s => s.change === 'new');

    this.appContainer.innerHTML = `
      <section class="detail-view" aria-labelledby="whats-new-title">
        <div style="margin-bottom: 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 8px;">
            <h2 id="whats-new-title" style="font-size: 2.2rem; margin: 0;">What's New in Bharatiya Nyaya Sanhita, 2023</h2>
            <span class="badge badge-new" style="font-size: 0.9rem; padding: 6px 14px;">
              ${newSections.length} Brand-New Statutory Provisions
            </span>
          </div>
          <p style="font-size: 1.05rem; color: var(--text-secondary); max-width: 820px; line-height: 1.6;">
            The Bharatiya Nyaya Sanhita, 2023 codified unprecedented statutory offences with no direct IPC predecessor, modernizing criminal law for contemporary society. Below are all <strong>${newSections.length} codified provisions marked as brand-new</strong>, generated directly from the Sanhita dataset.
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 20px;">
          ${newSections.map(sec => `
            <article class="detail-header-card" style="border-left: 4px solid var(--accent); transition: transform 0.2s ease;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
                <div>
                  <span class="badge badge-new" style="margin-right: 8px;">NEW OFFENCE</span>
                  <span class="card-chapter-tag">${sec.chapter ? `Chapter ${sec.chapter}` : ''}</span>
                </div>
                <div style="font-family: var(--font-mono); font-weight: 700; color: var(--accent); font-size: 1.1rem;">
                  ${this.formatSections(sec.bns, 'BNS')}
                </div>
              </div>

              <h3 style="font-size: 1.35rem; margin-bottom: 8px;">
                <a href="#/section/${sec.id}" style="color: var(--text-primary); text-decoration: none;">
                  ${this.escapeHtml(sec.title)} &rarr;
                </a>
              </h3>

              <div style="margin-bottom: 12px; font-size: 0.95rem; line-height: 1.5; color: var(--text-secondary);">
                ${this.escapeHtml(sec.new_text)}
              </div>

              <div style="background: var(--bg-subtle); padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 14px; font-size: 0.9rem;">
                <strong style="color: var(--text-primary);">Prescribed Punishment:</strong>
                <span style="color: var(--accent); font-weight: 600;">${this.escapeHtml(sec.punishment_new)}</span>
              </div>

              <p style="font-size: 0.95rem; line-height: 1.5; margin-bottom: 14px; color: var(--text-primary);">
                <strong>Why This Was Added:</strong> ${this.escapeHtml(sec.explanation)}
              </p>

              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div class="tags-list">
                  ${(sec.tags || []).map(t => `<span class="tag-chip">#${this.escapeHtml(t)}</span>`).join('')}
                </div>
                <a href="#/section/${sec.id}" class="btn btn-outline" style="font-size: 0.85rem; padding: 6px 14px;">
                  View Provision Details &rarr;
                </a>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;
    this.renderCompareTray();
  },

  // -------------------------------------------------------------
  // View 8: BNS COVERAGE & VERIFICATION DASHBOARD
  // -------------------------------------------------------------
  renderCoverageView() {
    document.title = "BNS Coverage & Gazette Verification Dashboard — BNS Mapper";

    const allSections = searchEngine.getAllSections();
    const chaptersIndex = this.chaptersIndex || [];

    // Calculate total BNS sections from 1 to 358
    const totalTarget = 358;
    const bnsInDataset = allSections.filter(s => {
      if (!s.bns || !Array.isArray(s.bns)) return false;
      return s.bns.some(n => {
        const num = parseInt(String(n).replace(/[^0-9]/g, ''), 10);
        return !isNaN(num) && num >= 1 && num <= 358;
      });
    });

    const totalPresent = bnsInDataset.length;
    const verifiedCount = bnsInDataset.filter(s => s.verified === true).length;
    const todoList = bnsInDataset.filter(s => {
      const str = JSON.stringify(s);
      return str.includes('TODO');
    });
    const todoCount = todoList.length;

    const codifiedPct = Math.round((totalPresent / totalTarget) * 100);
    const verifiedPct = Math.round((verifiedCount / totalTarget) * 100);

    // Compute metrics per chapter
    const chapterRows = chaptersIndex.map(ch => {
      const chSecs = bnsInDataset.filter(s => s.chapter === ch.chapter);
      const chVerified = chSecs.filter(s => s.verified === true).length;
      const chTodos = chSecs.filter(s => JSON.stringify(s).includes('TODO')).length;
      const targetSecs = ch.sections_count || (ch.end - ch.start + 1);
      const presentCount = chSecs.length;
      const chPct = Math.min(100, Math.round((presentCount / targetSecs) * 100));

      return {
        ...ch,
        targetSecs,
        presentCount,
        verifiedCount: chVerified,
        todoCount: chTodos,
        pct: chPct
      };
    });

    this.appContainer.innerHTML = `
      <section class="detail-view" aria-labelledby="coverage-page-title">
        <div style="margin-bottom: 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 8px;">
            <h2 id="coverage-page-title" style="font-size: 2.2rem; margin: 0;">BNS Codification &amp; Verification Dashboard</h2>
            <span class="badge badge-modified" style="font-size: 0.9rem; padding: 6px 14px;">
              All 20 Chapters Accounted For
            </span>
          </div>
          <p style="font-size: 1.05rem; color: var(--text-secondary); max-width: 820px; line-height: 1.6;">
            Real-time verification tracker monitoring all 358 sections of the Bharatiya Nyaya Sanhita, 2023 across Chapters I to XX against the official Gazette of India.
          </p>
        </div>

        <!-- High Level Metrics Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-bottom: 28px;">
          <div class="punishment-box" style="border-top: 4px solid #19682C;">
            <div class="punishment-tag">Total BNS Sections</div>
            <div style="font-size: 2rem; font-weight: 700; color: #19682C; margin-top: 4px;">
              ${totalPresent} / ${totalTarget}
            </div>
            <div style="font-size: 0.825rem; color: var(--text-muted); margin-top: 4px;">
              ${codifiedPct}% codified in dataset
            </div>
          </div>

          <div class="punishment-box" style="border-top: 4px solid var(--accent);">
            <div class="punishment-tag">Chapters Complete</div>
            <div style="font-size: 2rem; font-weight: 700; color: var(--accent); margin-top: 4px;">
              ${chaptersIndex.length} / 20
            </div>
            <div style="font-size: 0.825rem; color: var(--text-muted); margin-top: 4px;">
              100% chapter coverage (ss. 1–358)
            </div>
          </div>

          <div class="punishment-box" style="border-top: 4px solid #D97706;">
            <div class="punishment-tag">Verified by Gazette</div>
            <div style="font-size: 2rem; font-weight: 700; color: #D97706; margin-top: 4px;">
              ${verifiedCount} / ${totalTarget}
            </div>
            <div style="font-size: 0.825rem; color: var(--text-muted); margin-top: 4px;">
              ${verifiedPct}% formally verified
            </div>
          </div>

          <div class="punishment-box" style="border-top: 4px solid ${todoCount > 0 ? '#C62828' : '#2E7D32'};">
            <div class="punishment-tag">Open TODOs</div>
            <div style="font-size: 2rem; font-weight: 700; color: ${todoCount > 0 ? '#C62828' : '#2E7D32'}; margin-top: 4px;">
              ${todoCount}
            </div>
            <div style="font-size: 0.825rem; color: var(--text-muted); margin-top: 4px;">
              ${todoCount === 0 ? 'Clean dataset &mdash; zero open TODOs' : 'Provisions requiring resolution'}
            </div>
          </div>
        </div>

        <!-- Verification Workflow Banner -->
        <div class="detail-header-card" style="background: var(--bg-subtle); border-left: 4px solid var(--accent); margin-bottom: 28px;">
          <h3 style="font-size: 1.25rem; margin-bottom: 8px;">Community Gazette Verification Workflow</h3>
          <p style="font-size: 0.95rem; line-height: 1.6; margin-bottom: 12px;">
            Law students and advocates: help verify provisions against the official Ministry of Law &amp; Justice Gazette (Act No. 45 of 2023). Pick any chapter below, check the operative summaries and punishment terms, and submit a pull request flipping <code>"verified": true</code>!
          </p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <a href="https://github.com/DatagenieSK/BNS-Mapper/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener" class="btn btn-primary" style="font-size: 0.85rem;">
              Read Verification Guide &rarr;
            </a>
            <a href="https://github.com/DatagenieSK/BNS-Mapper" target="_blank" rel="noopener" class="btn btn-outline" style="font-size: 0.85rem;">
              View Repository on GitHub &nearr;
            </a>
          </div>
        </div>

        <!-- Chapter-by-Chapter Coverage Breakdown -->
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 1.4rem; margin-bottom: 16px;">Chapter-by-Chapter Codification &amp; Verification Status</h3>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${chapterRows.map(ch => `
            <div class="chapter-card" style="padding: 16px 20px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
                <div>
                  <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
                    Chapter ${ch.chapter} &bull; Sections ${ch.range}
                  </div>
                  <h4 style="font-size: 1.15rem; margin-top: 2px;">
                    <a href="#/chapters" style="color: var(--text-primary); text-decoration: none;">
                      ${this.escapeHtml(ch.title)}
                    </a>
                  </h4>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge ${ch.pct === 100 ? 'badge-renumbered' : 'badge-modified'}">
                    ${ch.presentCount} / ${ch.targetSecs} sections (${ch.pct}%)
                  </span>
                  ${ch.verifiedCount > 0 ? `
                    <span class="badge badge-renumbered" title="Verified against Gazette">
                      ✔ ${ch.verifiedCount} Verified
                    </span>
                  ` : `
                    <span class="badge badge-modified" title="Pending manual gazette review">
                      Pending Verification
                    </span>
                  `}
                  ${ch.todoCount > 0 ? `
                    <span class="badge badge-omitted" title="Open TODO items">
                      ${ch.todoCount} TODOs
                    </span>
                  ` : ''}
                </div>
              </div>

              <!-- Animated Progress Bar -->
              <div class="quiz-progress-track" style="height: 10px; margin-bottom: 8px;" title="${ch.pct}% Codified">
                <div class="quiz-progress-fill" style="width: ${ch.pct}%; background: ${ch.pct === 100 ? '#19682C' : 'var(--accent)'}; transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);"></div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.825rem; color: var(--text-muted);">
                <span>Dataset: <code>data/chapters/${ch.file}</code></span>
                <a href="#/search?chapter=${ch.chapter}" class="card-read-more" style="font-size: 0.825rem;">
                  Browse Chapter Sections &rarr;
                </a>
              </div>
            </div>
          `).join('')}
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
                    <div style="font-family: var(--font-mono); font-size: 1.15rem; font-weight: 700; color: var(--accent);">
                      ${this.formatSections(sec.ipc, 'IPC')} &rarr; ${this.formatSections(sec.bns, 'BNS')}
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
  },

  // -------------------------------------------------------------
  // Dynamic Diff Highlighting
  // -------------------------------------------------------------
  computeTextDiff(oldText, newText) {
    if (!oldText || !newText) return { oldHtml: this.escapeHtml(oldText), newHtml: this.escapeHtml(newText) };
    const oldWords = oldText.split(/\s+/);
    const newWords = newText.split(/\s+/);
    const oldSet = new Set(oldWords.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')));
    const newSet = new Set(newWords.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')));

    const oldHtml = oldWords.map(w => {
      const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean && !newSet.has(clean) && oldWords.length < 120) {
        return `<span class="diff-del">${this.escapeHtml(w)}</span>`;
      }
      return this.escapeHtml(w);
    }).join(' ');

    const newHtml = newWords.map(w => {
      const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean && !oldSet.has(clean) && newWords.length < 120) {
        return `<span class="diff-ins">${this.escapeHtml(w)}</span>`;
      }
      return this.escapeHtml(w);
    }).join(' ');

    return { oldHtml, newHtml };
  },

  // -------------------------------------------------------------
  // Reading Progress Bar
  // -------------------------------------------------------------
  initReadingProgressBar() {
    const bar = document.getElementById('reading-progress');
    if (!bar) return;
    bar.classList.add('visible');

    const onScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) {
        bar.style.width = '0%';
        return;
      }
      const scrolled = (window.scrollY / totalHeight) * 100;
      bar.style.width = `${Math.min(100, Math.max(0, scrolled))}%`;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  },

  // -------------------------------------------------------------
  // Section of the Day
  // -------------------------------------------------------------
  getSectionOfTheDay() {
    const all = searchEngine.getAllSections();
    if (!all || all.length === 0) return null;
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const featuredPool = all.filter(s => ['bns-103', 'bns-304', 'bns-69', 'bns-111', 'bns-316', 'bns-189', 'bns-351', 'bns-14'].includes(s.id));
    if (featuredPool.length > 0) {
      return featuredPool[dayOfYear % featuredPool.length];
    }
    return all[dayOfYear % all.length];
  },

  // -------------------------------------------------------------
  // Typewriter Placeholder
  // -------------------------------------------------------------
  initTypewriter() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    const queries = ['302', 'murder', 'snatching', 'BNS 103', 'cheating', 'Section 69', 'affray', 'private defence'];
    let queryIdx = 0;
    let charIdx = 0;
    let isDeleting = false;

    const tick = () => {
      if (document.activeElement === searchInput || searchInput.value) {
        setTimeout(tick, 1000);
        return;
      }

      const currentWord = queries[queryIdx];
      if (isDeleting) {
        charIdx--;
      } else {
        charIdx++;
      }

      searchInput.setAttribute('placeholder', `Try searching "${currentWord.substring(0, charIdx)}"...`);

      let delta = isDeleting ? 50 : 110;
      if (!isDeleting && charIdx === currentWord.length) {
        delta = 2000;
        isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        queryIdx = (queryIdx + 1) % queries.length;
        delta = 350;
      }

      setTimeout(tick, delta);
    };

    tick();
  },

  // -------------------------------------------------------------
  // Desktop 3D Card Tilt
  // -------------------------------------------------------------
  initCardTilt() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    document.querySelectorAll('.section-card').forEach(card => {
      card.onmousemove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const rotateX = -(y / (rect.height / 2)) * 4.5;
        const rotateY = (x / (rect.width / 2)) * 4.5;
        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
      };
      card.onmouseleave = () => {
        card.style.transform = '';
      };
    });
  },

  // -------------------------------------------------------------
  // Stats Count-Up Animation
  // -------------------------------------------------------------
  initCountUp() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const elements = document.querySelectorAll('.count-up-target');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-target') || el.textContent, 10);
          if (isNaN(target)) return;
          obs.unobserve(el);

          let current = 0;
          const step = Math.max(1, Math.floor(target / 20));
          const interval = setInterval(() => {
            current += step;
            if (current >= target) {
              el.textContent = target;
              clearInterval(interval);
            } else {
              el.textContent = current;
            }
          }, 25);
        }
      });
    }, { threshold: 0.15 });

    elements.forEach(el => observer.observe(el));
  },

  // -------------------------------------------------------------
  // Celebratory Canvas Confetti Burst Engine
  // -------------------------------------------------------------
  triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#883B1B', '#D97706', '#19682C', '#2C4B75', '#5E328A', '#DC2626'];
    const particleCount = 70;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 240,
        y: canvas.height * 0.4 + (Math.random() - 0.5) * 120,
        vx: (Math.random() - 0.5) * 15,
        vy: -Math.random() * 12 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let animationId = null;
    const start = performance.now();

    const render = (time) => {
      const elapsed = time - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, 1 - elapsed / 2200);

        if (p.opacity > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
        }
      });

      if (alive && elapsed < 2300) {
        animationId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationId);
      }
    };

    requestAnimationFrame(render);
  },

  // -------------------------------------------------------------
  // Command Palette (⌘K / Ctrl+K)
  // -------------------------------------------------------------
  initCommandPalette() {
    const modal = document.getElementById('command-palette-modal');
    const input = document.getElementById('cmd-input');
    const resultsContainer = document.getElementById('cmd-results');
    const triggerBtn = document.getElementById('command-palette-btn');

    if (!modal || !input || !resultsContainer) return;

    let selectedIndex = 0;
    let currentItems = [];

    const openPalette = () => {
      modal.classList.add('open');
      input.value = '';
      input.focus();
      renderItems('');
    };

    const closePalette = () => {
      modal.classList.remove('open');
    };

    this.openCommandPalette = openPalette;
    this.closeCommandPalette = closePalette;

    if (triggerBtn) triggerBtn.onclick = openPalette;

    modal.onclick = (e) => {
      if (e.target === modal) closePalette();
    };

    const renderItems = (query) => {
      const cleanQ = (query || '').trim().toLowerCase();
      const allSecs = searchEngine.getAllSectionsCombined();
      const items = [];

      // Static navigation actions
      const actions = [
        { label: 'Go to Search & Explorer', hash: '#/', badge: 'Route' },
        { label: 'Browse 20 Chapters', hash: '#/chapters', badge: 'Route' },
        { label: 'What\'s New in BNS', hash: '#/whats-new', badge: 'Route' },
        { label: 'Scenario Quiz & Practice', hash: '#/quiz', badge: 'Route' },
        { label: 'Flashcards (Leitner System)', hash: '#/flashcards', badge: 'Route' },
        { label: 'Side-by-Side Compare Mode', hash: '#/compare', badge: 'Route' },
        { label: 'Codification & Verification Coverage', hash: '#/coverage', badge: 'Route' },
        { label: 'My Saved Sections Cheat Sheet', hash: '#/bookmarks', badge: 'Route' }
      ];

      actions.forEach(a => {
        if (!cleanQ || a.label.toLowerCase().includes(cleanQ)) {
          items.push({ type: 'action', ...a });
        }
      });

      // Search matching sections
      if (cleanQ) {
        const matches = allSecs.filter(s => {
          const ipcMatch = Array.isArray(s.ipc) ? s.ipc.some(i => i.toLowerCase().includes(cleanQ)) : s.ipc?.toLowerCase().includes(cleanQ);
          const bnsMatch = Array.isArray(s.bns) ? s.bns.some(b => b.toLowerCase().includes(cleanQ)) : s.bns?.toLowerCase().includes(cleanQ);
          const titleMatch = s.title?.toLowerCase().includes(cleanQ);
          return ipcMatch || bnsMatch || titleMatch;
        }).slice(0, 10);

        matches.forEach(s => {
          items.push({
            type: 'section',
            label: `${this.formatSections(s.ipc, 'IPC')} → ${this.formatSections(s.bns, 'BNS')}: ${s.title}`,
            hash: `#/section/${s.id}`,
            badge: s.change
          });
        });
      }

      currentItems = items;
      selectedIndex = 0;

      if (items.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No results found.</div>';
        return;
      }

      resultsContainer.innerHTML = items.map((it, idx) => `
        <div class="cmd-item ${idx === 0 ? 'selected' : ''}" data-idx="${idx}" data-hash="${it.hash}">
          <div class="cmd-item-left">
            <span>${this.escapeHtml(it.label)}</span>
          </div>
          <span class="cmd-item-badge">${this.escapeHtml(it.badge)}</span>
        </div>
      `).join('');

      resultsContainer.querySelectorAll('.cmd-item').forEach(el => {
        el.onmouseenter = () => {
          resultsContainer.querySelectorAll('.cmd-item').forEach(c => c.classList.remove('selected'));
          el.classList.add('selected');
          selectedIndex = parseInt(el.getAttribute('data-idx'), 10);
        };
        el.onclick = () => {
          window.location.hash = el.getAttribute('data-hash');
          closePalette();
        };
      });
    };

    input.oninput = (e) => {
      renderItems(e.target.value);
    };

    input.onkeydown = (e) => {
      if (e.key === 'Escape') {
        closePalette();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentItems.length > 0) {
          selectedIndex = (selectedIndex + 1) % currentItems.length;
          updateSelected();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentItems.length > 0) {
          selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
          updateSelected();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentItems[selectedIndex]) {
          window.location.hash = currentItems[selectedIndex].hash;
          closePalette();
        }
      }
    };

    const updateSelected = () => {
      const allEls = resultsContainer.querySelectorAll('.cmd-item');
      allEls.forEach((el, idx) => {
        if (idx === selectedIndex) {
          el.classList.add('selected');
          el.scrollIntoView({ block: 'nearest' });
        } else {
          el.classList.remove('selected');
        }
      });
    };
  },

  // -------------------------------------------------------------
  // Keyboard Shortcuts Modal (? key)
  // -------------------------------------------------------------
  initShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    const closeBtn = document.getElementById('close-shortcuts-btn');
    const triggerBtn = document.getElementById('shortcuts-help-btn');

    if (!modal) return;

    const openModal = () => modal.classList.add('open');
    const closeModal = () => modal.classList.remove('open');

    this.openShortcutsModal = openModal;
    this.closeShortcutsModal = closeModal;

    if (triggerBtn) triggerBtn.onclick = openModal;
    if (closeBtn) closeBtn.onclick = closeModal;

    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  },

  // -------------------------------------------------------------
  // First-Time Onboarding Spotlight Tour
  // -------------------------------------------------------------
  tourStep: 0,
  tourSteps: [
    {
      targetSelector: '.search-input-container',
      title: 'Instant Multi-Code Search',
      text: 'Type IPC section numbers (e.g., 302, 420), BNS section numbers (103, 316), or keywords to look up statutory comparisons immediately.'
    },
    {
      targetSelector: '.direction-toggle',
      title: 'Bidirectional Mapping',
      text: 'Toggle between Old (IPC) → New (BNS) and New (BNS) → Old (IPC) to inspect numbering conversions both ways.'
    },
    {
      targetSelector: '.header-nav',
      title: 'Interactive Learning & Tools',
      text: 'Access scenario quizzes with practical judicial problems, spaced-repetition flashcards, and side-by-side comparison mode.'
    }
  ],

  startTour(force = false) {
    if (!force && storage.getTourCompleted()) return;
    const overlay = document.getElementById('tour-overlay');
    if (!overlay) return;

    this.tourStep = 0;
    overlay.classList.add('open');
    this.renderTourStep();

    const skipBtn = document.getElementById('tour-skip-btn');
    const nextBtn = document.getElementById('tour-next-btn');

    if (skipBtn) {
      skipBtn.onclick = () => {
        overlay.classList.remove('open');
        storage.setTourCompleted(true);
      };
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        this.tourStep++;
        if (this.tourStep >= this.tourSteps.length) {
          overlay.classList.remove('open');
          storage.setTourCompleted(true);
          this.showToast('Tour completed! Press ? anytime for shortcuts.', 'success');
        } else {
          this.renderTourStep();
        }
      };
    }
  },

  renderTourStep() {
    const step = this.tourSteps[this.tourStep];
    const spotlight = document.getElementById('tour-spotlight-box');
    const card = document.getElementById('tour-card');
    const titleEl = document.getElementById('tour-title');
    const textEl = document.getElementById('tour-text');
    const indicator = document.getElementById('tour-step-indicator');
    const nextBtn = document.getElementById('tour-next-btn');

    if (!step || !spotlight || !card) return;

    titleEl.textContent = step.title;
    textEl.textContent = step.text;
    indicator.textContent = `Step ${this.tourStep + 1} of ${this.tourSteps.length}`;
    if (nextBtn) {
      nextBtn.textContent = this.tourStep === this.tourSteps.length - 1 ? 'Finish' : 'Next →';
    }

    const target = document.querySelector(step.targetSelector);
    if (target) {
      const rect = target.getBoundingClientRect();
      const pad = 6;
      spotlight.style.top = `${rect.top + window.scrollY - pad}px`;
      spotlight.style.left = `${rect.left + window.scrollX - pad}px`;
      spotlight.style.width = `${rect.width + pad * 2}px`;
      spotlight.style.height = `${rect.height + pad * 2}px`;

      // Position card below or above target
      const cardTop = rect.bottom + window.scrollY + 14;
      card.style.top = `${cardTop}px`;
      card.style.left = `${Math.max(16, Math.min(window.innerWidth - 340, rect.left + window.scrollX))}px`;
    } else {
      // Fallback center position
      spotlight.style.top = '20%';
      spotlight.style.left = '50%';
      spotlight.style.width = '0px';
      spotlight.style.height = '0px';
      card.style.top = '30%';
      card.style.left = '50%';
      card.style.transform = 'translateX(-50%)';
    }
  },

  // -------------------------------------------------------------
  // Mobile Bottom Nav Indicator
  // -------------------------------------------------------------
  updateBottomNavGlider() {
    const activeItem = document.querySelector('.bottom-nav-item.active');
    const indicator = document.getElementById('bottom-nav-indicator');
    if (!activeItem || !indicator) return;
    const rect = activeItem.getBoundingClientRect();
    const parentRect = activeItem.parentElement.getBoundingClientRect();
    indicator.style.left = `${rect.left - parentRect.left}px`;
    indicator.style.width = `${rect.width}px`;
  }
};
