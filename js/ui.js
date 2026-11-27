/**
 * UI Renderer for BNS Mapper
 * Plain HTML, Accessible, Mobile-first and Clean Editorial Design
 */

import { storage, DIRECTIONS } from './storage.js';
import { searchEngine } from './search.js';

export const ui = {
  appContainer: null,
  activeFilterChange: 'all',
  lastSearchQuery: '',

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

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
  escapeHtml(str) {
    if (!str) return '';
    return str
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

  // -------------------------------------------------------------
  // View 1: Search & Explorer View
  // -------------------------------------------------------------
  renderSearchView({ query = '', filterChange = 'all' } = {}) {
    document.title = 'BNS Mapper — IPC to BNS Law Navigator';
    this.activeFilterChange = filterChange;
    this.lastSearchQuery = query;

    const direction = storage.getDirection();
    const isIpcToBns = direction === DIRECTIONS.IPC_TO_BNS;
    const allSections = searchEngine.getAllSections();
    const results = searchEngine.search(query, { filterChange });

    // Calculate filter counts
    const counts = {
      all: allSections.length,
      renumbered: 0,
      modified: 0,
      new: 0,
      omitted: 0,
      split: 0,
      merged: 0
    };
    allSections.forEach(s => {
      if (counts[s.change] !== undefined) counts[s.change]++;
    });

    const primaryLabel = isIpcToBns ? 'IPC Section' : 'BNS Section';
    const secondaryLabel = isIpcToBns ? 'BNS' : 'IPC';

    this.appContainer.innerHTML = `
      <section class="search-hero" aria-labelledby="hero-title">
        <h2 id="hero-title" class="hero-title">Navigate Indian Criminal Law</h2>
        <p class="hero-subtitle">
          Instant cross-reference between the Indian Penal Code (1860) and Bharatiya Nyaya Sanhita (2023).
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
              placeholder="Search by ${isIpcToBns ? 'IPC number (e.g. 302, 420)' : 'BNS number (e.g. 103, 318)'}, title or tag..."
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
          <a href="#/chapters" class="back-link" style="font-size: 0.85rem;">
            Browse by Chapter &rarr;
          </a>
        </div>

        ${results.length === 0 ? `
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            <h3>No matching sections found</h3>
            <p>Try searching with section numbers like <strong>302</strong>, <strong>420</strong>, or keywords like <strong>theft</strong>, <strong>mob lynching</strong>.</p>
          </div>
        ` : `
          <div class="sections-grid">
            ${results.map(item => this.renderSectionCard(item, direction)).join('')}
          </div>
        `}
      </section>
    `;

    this.bindSearchEvents();
  },

  renderSectionCard(item, direction) {
    const isIpcToBns = direction === DIRECTIONS.IPC_TO_BNS;
    const isBookmarked = storage.isBookmarked(item.id);

    const primaryNumber = isIpcToBns
      ? (item.ipc === 'None' ? 'New in BNS' : `IPC § ${item.ipc}`)
      : (item.bns === 'Omitted' ? 'Omitted in BNS' : `BNS § ${item.bns}`);

    const secondaryNumber = isIpcToBns
      ? (item.bns === 'Omitted' ? 'Omitted' : `BNS § ${item.bns}`)
      : (item.ipc === 'None' ? 'New Provision' : `IPC § ${item.ipc}`);

    return `
      <article class="section-card" data-section-id="${item.id}">
        <div class="card-top">
          <div class="mapping-numbers">
            <span class="number-primary">${this.escapeHtml(primaryNumber)}</span>
            <span class="mapping-arrow">&rarr;</span>
            <span class="number-secondary">${this.escapeHtml(secondaryNumber)}</span>
          </div>
          <div class="card-actions">
            <button
              class="bookmark-btn ${isBookmarked ? 'active' : ''}"
              data-bookmark-id="${item.id}"
              title="${isBookmarked ? 'Remove bookmark' : 'Bookmark section'}"
              aria-label="${isBookmarked ? 'Remove bookmark' : 'Bookmark section'} for ${item.title}"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
          </div>
        </div>

        <div style="margin-bottom: 8px;">
          ${this.getBadgeHtml(item.change)}
        </div>

        <h3 class="card-title">
          <a href="#/section/${item.id}">${this.escapeHtml(item.title)}</a>
        </h3>

        <p class="card-explanation">${this.escapeHtml(item.explanation)}</p>

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
        this.updateSearchResultsGrid(results, direction);
      });

      // Maintain focus if re-rendered
      if (document.activeElement !== input && this.lastSearchQuery) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        this.lastSearchQuery = '';
        clearBtn.classList.remove('visible');
        input.focus();
        const direction = storage.getDirection();
        const results = searchEngine.search('', { filterChange: this.activeFilterChange });
        this.updateSearchResultsGrid(results, direction);
      });
    }

    // Filter pill buttons
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
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
        this.updateSearchResultsGrid(results, direction);
      });
    });

    // Bookmark buttons on cards
    this.bindBookmarkButtons();
  },

  updateSearchResultsGrid(results, direction) {
    const metaBar = document.querySelector('.results-meta-bar');
    const resultsContainer = document.querySelector('.results-section');
    if (!resultsContainer) return;

    if (metaBar) {
      metaBar.innerHTML = `
        <span class="results-count">
          Showing <strong>${results.length}</strong> ${results.length === 1 ? 'section' : 'sections'}
          ${this.activeFilterChange !== 'all' ? `marked <em>${this.activeFilterChange}</em>` : ''}
        </span>
        <a href="#/chapters" class="back-link" style="font-size: 0.85rem;">
          Browse by Chapter &rarr;
        </a>
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
          <p>Try searching with another section number or change type filter.</p>
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
      targetGrid.innerHTML = results.map(item => this.renderSectionCard(item, direction)).join('');
      this.bindBookmarkButtons();
    }
  },

  bindBookmarkButtons() {
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
          <h2 style="font-size: 1.8rem; margin-bottom: 12px;">Section Not Found</h2>
          <p style="margin-bottom: 24px;">Could not locate section "${this.escapeHtml(idOrNumber)}" in current database.</p>
          <a href="#/" class="btn btn-primary">&larr; Back to Search</a>
        </div>
      `;
      return;
    }

    document.title = `IPC ${item.ipc} → BNS ${item.bns}: ${item.title} — BNS Mapper`;
    const isBookmarked = storage.isBookmarked(item.id);
    const direction = storage.getDirection();
    const isIpcToBns = direction === DIRECTIONS.IPC_TO_BNS;

    // Previous and Next section in dataset
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

        <!-- Header Card -->
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
              <div class="map-col-title">Old Indian Penal Code (1860)</div>
              <div class="map-col-sec">${item.ipc === 'None' ? 'None (New)' : `Section ${this.escapeHtml(item.ipc)}`}</div>
            </div>
            <div class="map-arrow-icon">&rarr;</div>
            <div>
              <div class="map-col-title">Bharatiya Nyaya Sanhita (2023)</div>
              <div class="map-col-sec">${item.bns === 'Omitted' ? 'Omitted' : `Section ${this.escapeHtml(item.bns)}`}</div>
            </div>
          </div>
        </header>

        <!-- Side-by-Side Legal Text -->
        <section aria-labelledby="comparison-heading">
          <div class="section-label" id="comparison-heading">Statutory Text Comparison</div>
          <div class="comparison-container">
            <div class="comparison-box">
              <div class="comparison-header">
                <span>IPC 1860 &bull; Section ${this.escapeHtml(item.ipc)}</span>
                <span class="badge" style="font-size: 0.65rem;">Repealed</span>
              </div>
              <div class="comparison-body">
                <div class="law-text-content">${this.escapeHtml(item.old_text)}</div>
              </div>
            </div>

            <div class="comparison-box">
              <div class="comparison-header">
                <span>BNS 2023 &bull; Section ${this.escapeHtml(item.bns)}</span>
                <span class="badge badge-new" style="font-size: 0.65rem;">In Force</span>
              </div>
              <div class="comparison-body">
                <div class="law-text-content">${this.escapeHtml(item.new_text)}</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Punishment Comparison -->
        <section class="punishment-section" aria-labelledby="punishment-heading">
          <div class="section-label" id="punishment-heading">Punishment Comparison</div>
          <div class="punishment-grid">
            <div class="punishment-box">
              <div class="punishment-tag">Old Punishment (IPC)</div>
              <div class="punishment-text">${this.escapeHtml(item.punishment_old)}</div>
            </div>
            <div class="punishment-box">
              <div class="punishment-tag">New Punishment (BNS)</div>
              <div class="punishment-text">${this.escapeHtml(item.punishment_new)}</div>
            </div>
          </div>
        </section>

        <!-- Plain English Explanation & Verification -->
        <section class="explanation-card" aria-labelledby="explanation-heading">
          <div class="section-label" id="explanation-heading">Plain-English Legal Analysis</div>
          <p class="explanation-text">${this.escapeHtml(item.explanation)}</p>

          <div class="tags-row">
            ${(item.tags || []).map(t => `<span class="tag-item">#${this.escapeHtml(t)}</span>`).join('')}
          </div>

          <div class="verification-footer">
            <span class="source-citation">
              <strong>Source:</strong> ${this.escapeHtml(item.source || 'The Gazette of India, Extraordinary (Act No. 45 of 2023)')}
            </span>
            <span>
              <a href="https://egazette.gov.in" target="_blank" rel="noopener noreferrer" style="font-size: 0.825rem;">
                Official Gazette Portal &nearr;
              </a>
            </span>
          </div>
        </section>

        <!-- Next / Previous Links -->
        <nav style="display: flex; justify-content: space-between; gap: 16px; margin-top: 32px;" aria-label="Adjacent provisions">
          ${prevItem ? `
            <a href="#/section/${prevItem.id}" class="btn btn-outline" style="text-align: left;">
              &larr; Prev: IPC §${prevItem.ipc} (${this.escapeHtml(prevItem.title.substring(0, 20))}...)
            </a>
          ` : '<div></div>'}
          ${nextItem ? `
            <a href="#/section/${nextItem.id}" class="btn btn-outline" style="text-align: right;">
              Next: IPC §${nextItem.ipc} (${this.escapeHtml(nextItem.title.substring(0, 20))}...) &rarr;
            </a>
          ` : '<div></div>'}
        </nav>
      </article>
    `;

    // Bind Detail actions
    const shareBtn = document.getElementById('detail-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
          this.showToast('Section link copied to clipboard!');
        }).catch(() => {
          this.showToast('URL: ' + url);
        });
      });
    }

    const bookmarkBtn = document.getElementById('detail-bookmark-btn');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', () => {
        const newState = storage.toggleBookmark(item.id);
        bookmarkBtn.classList.toggle('active', newState);
        const svg = bookmarkBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', newState ? '#D97706' : 'none');
        bookmarkBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${newState ? '#D97706' : 'none'}" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          ${newState ? 'Saved' : 'Bookmark'}
        `;
        this.showToast(newState ? 'Added to My Sections' : 'Removed from My Sections');
      });
    }
  },

  // -------------------------------------------------------------
  // View 3: Chapter Browser with Change Type Filters
  // -------------------------------------------------------------
  renderChaptersView({ filterChange = 'all' } = {}) {
    document.title = 'Chapters & Categories — BNS Mapper';
    const allSections = searchEngine.getAllSections();
    const filtered = filterChange === 'all'
      ? allSections
      : allSections.filter(s => s.change === filterChange);

    // Group by chapter
    const chaptersMap = new Map();
    filtered.forEach(item => {
      const ch = item.chapter || 'Other Provisions';
      if (!chaptersMap.has(ch)) {
        chaptersMap.set(ch, []);
      }
      chaptersMap.get(ch).push(item);
    });

    const direction = storage.getDirection();
    const isIpcToBns = direction === DIRECTIONS.IPC_TO_BNS;

    this.appContainer.innerHTML = `
      <section class="chapters-view-container" aria-labelledby="chapters-title">
        <div style="margin-bottom: 24px;">
          <h2 id="chapters-title" style="font-size: 2rem; margin-bottom: 8px;">Chapter Browser</h2>
          <p>Explore provisions organized by legal subject area and chapter groupings.</p>
        </div>

        <!-- Filter bar -->
        <div class="filter-pills-row" style="justify-content: flex-start; margin-bottom: 24px;" role="radiogroup" aria-label="Filter chapters by change type">
          ${['all', 'renumbered', 'modified', 'new', 'split', 'omitted'].map(type => `
            <button
              class="filter-pill ${filterChange === type ? 'active' : ''}"
              data-chapter-filter="${type}"
              role="radio"
              aria-checked="${filterChange === type}"
            >
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
                        ${isIpcToBns
                          ? `IPC §${item.ipc} &rarr; BNS §${item.bns}`
                          : `BNS §${item.bns} &rarr; IPC §${item.ipc}`}
                      </span>
                      <span class="sec-title-text">${this.escapeHtml(item.title)}</span>
                    </div>
                    <div>
                      ${this.getBadgeHtml(item.change)}
                    </div>
                  </a>
                `).join('')}
              </div>
            </div>
          `).join('')}

          ${chaptersMap.size === 0 ? `
            <div class="empty-state">
              <h3>No provisions found</h3>
              <p>No sections matching the change filter "<strong>${filterChange}</strong>".</p>
            </div>
          ` : ''}
        </div>
      </section>
    `;

    document.querySelectorAll('[data-chapter-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-chapter-filter');
        this.renderChaptersView({ filterChange: filter });
      });
    });
  },

  // -------------------------------------------------------------
  // View 4: Bookmarks & Printable Cheat Sheet View
  // -------------------------------------------------------------
  renderBookmarksView() {
    document.title = 'My Sections & Cheat Sheet — BNS Mapper';
    const bookmarkedIds = storage.getBookmarks();
    const allSections = searchEngine.getAllSections();
    const savedSections = allSections.filter(s => bookmarkedIds.includes(s.id));
    const direction = storage.getDirection();

    this.appContainer.innerHTML = `
      <section class="bookmarks-view" aria-labelledby="bookmarks-title">
        <!-- Printable Header (Hidden in screen mode, visible when printing) -->
        <div class="print-header">
          <h1>BNS Mapper — My Sections Cheat Sheet</h1>
          <p>Indian Penal Code (1860) &harr; Bharatiya Nyaya Sanhita (2023) Quick Reference Guide</p>
        </div>

        <div class="bookmarks-view-header">
          <div>
            <h2 id="bookmarks-title" style="font-size: 2rem; margin-bottom: 4px;">My Saved Sections</h2>
            <p>Your personal bookmarked provisions saved locally on this browser.</p>
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
          <!-- Cheat Sheet Table (Perfect for Quick Reference & Printing) -->
          <div class="cheat-sheet-table-wrap">
            <table class="cheat-sheet-table" aria-label="Bookmarked sections cheat sheet">
              <thead>
                <tr>
                  <th>IPC (Old)</th>
                  <th>BNS (New)</th>
                  <th>Offence / Subject</th>
                  <th>Change Type</th>
                  <th>New Punishment</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                ${savedSections.map(item => `
                  <tr>
                    <td><strong>${item.ipc === 'None' ? '—' : `§ ${item.ipc}`}</strong></td>
                    <td><strong style="color: var(--accent);">${item.bns === 'Omitted' ? 'Omitted' : `§ ${item.bns}`}</strong></td>
                    <td><a href="#/section/${item.id}"><strong>${this.escapeHtml(item.title)}</strong></a></td>
                    <td>${this.getBadgeHtml(item.change)}</td>
                    <td style="font-size: 0.825rem;">${this.escapeHtml(item.punishment_new)}</td>
                    <td style="font-size: 0.825rem;">${this.escapeHtml(item.explanation)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Section Cards Grid for Screen View -->
          <div style="margin-top: 36px;">
            <div class="section-label">Detailed Saved Cards</div>
            <div class="sections-grid">
              ${savedSections.map(item => this.renderSectionCard(item, direction)).join('')}
            </div>
          </div>
        `}
      </section>
    `;

    // Bind Print Button
    const printBtn = document.getElementById('print-cheat-sheet-btn');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Bind Clear Button
    const clearBtn = document.getElementById('clear-bookmarks-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all your saved bookmarks?')) {
          storage.clearBookmarks();
          this.renderBookmarksView();
          this.showToast('Bookmarks cleared');
        }
      });
    }

    this.bindBookmarkButtons();
  }
};
