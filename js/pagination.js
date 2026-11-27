/**
 * Reusable Pagination Module for BNS Mapper
 * Handles client-side pagination, URL query synchronisation, accessible controls,
 * responsive mobile 'Load more', smooth scrolling, and screen-reader announcements.
 */

export const STORAGE_KEYS = {
  PAGE_SIZE: 'bns_mapper_page_size',
  PAGINATION_STYLE: 'bns_mapper_pagination_style'
};

export const PAGE_SIZES = [10, 20, 50];

/**
 * Calculates total page count. Minimum 1 page.
 */
export function getPageCount(totalItems, pageSize) {
  if (totalItems <= 0) return 1;
  const size = Math.max(1, parseInt(pageSize, 10) || 20);
  return Math.max(1, Math.ceil(totalItems / size));
}

/**
 * Clamps page number to range [1, totalPages].
 */
export function clampPage(page, totalPages) {
  const p = parseInt(page, 10);
  if (isNaN(p) || p < 1) return 1;
  const max = Math.max(1, parseInt(totalPages, 10) || 1);
  if (p > max) return max;
  return p;
}

/**
 * Computes 0-based start and end slice indices for a given page.
 */
export function getSliceBounds(page, pageSize, totalItems) {
  const total = Math.max(0, parseInt(totalItems, 10) || 0);
  const size = Math.max(1, parseInt(pageSize, 10) || 20);
  const totalPages = getPageCount(total, size);
  const clampedPage = clampPage(page, totalPages);

  if (total === 0) {
    return { startIndex: 0, endIndex: 0, length: 0 };
  }

  const startIndex = (clampedPage - 1) * size;
  const endIndex = Math.min(startIndex + size, total);
  return { startIndex, endIndex, length: Math.max(0, endIndex - startIndex) };
}

/**
 * Slices an array based on page and pageSize.
 * In 'loadMore' mode, slices from index 0 to endIndex.
 */
export function sliceArray(array, page, pageSize, isLoadMore = false) {
  if (!Array.isArray(array)) return [];
  const bounds = getSliceBounds(page, pageSize, array.length);
  if (isLoadMore) {
    return array.slice(0, bounds.endIndex);
  }
  return array.slice(bounds.startIndex, bounds.endIndex);
}

/**
 * Generates an array of page numbers and ellipsis tokens.
 * Example for page 6 of 18: [1, '...', 4, 5, 6, 7, 8, '...', 18]
 */
export function generateEllipsis(currentPage, totalPages, maxVisible = 7) {
  const current = clampPage(currentPage, totalPages);
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const delta = 2; // Number of items on each side of active page
  const left = current - delta;
  const right = current + delta;

  // Case 1: Active page is near the start
  if (left <= 3) {
    const pages = [];
    const rightBound = Math.min(totalPages - 1, 1 + delta * 2);
    for (let i = 1; i <= rightBound; i++) {
      pages.push(i);
    }
    pages.push('...');
    pages.push(totalPages);
    return pages;
  }

  // Case 2: Active page is near the end
  if (right >= totalPages - 2) {
    const pages = [1, '...'];
    const leftBound = Math.max(2, totalPages - delta * 2);
    for (let i = leftBound; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Case 3: Active page is in the middle
  const pages = [1, '...'];
  for (let i = left; i <= right; i++) {
    pages.push(i);
  }
  pages.push('...');
  pages.push(totalPages);
  return pages;
}

/**
 * Generates summary text, e.g. "Showing 41-60 of 358 sections"
 */
export function getResultSummary(page, pageSize, totalItems, itemLabel = 'sections', isLoadMore = false) {
  const total = Math.max(0, parseInt(totalItems, 10) || 0);
  if (total === 0) {
    return `Showing 0 of 0 ${itemLabel}`;
  }
  const bounds = getSliceBounds(page, pageSize, total);
  if (isLoadMore) {
    return `Showing 1-${bounds.endIndex} of ${total} ${itemLabel}`;
  }
  return `Showing ${bounds.startIndex + 1}-${bounds.endIndex} of ${total} ${itemLabel}`;
}

/**
 * Calculates new page number when page size changes so the first visible item stays in view.
 */
export function calculatePageForNewPageSize(currentPage, oldPageSize, newPageSize) {
  const oldSize = Math.max(1, parseInt(oldPageSize, 10) || 20);
  const newSize = Math.max(1, parseInt(newPageSize, 10) || 20);
  const firstVisibleIndex = (clampPage(currentPage, 999999) - 1) * oldSize;
  return Math.floor(firstVisibleIndex / newSize) + 1;
}

/**
 * Reads preferred page size from localStorage or determines sensible responsive default.
 */
export function getStoredPageSize() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PAGE_SIZE);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (PAGE_SIZES.includes(parsed)) return parsed;
    }
  } catch (e) {}

  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return 10;
  }
  return 20;
}

/**
 * Persists page size choice in localStorage.
 */
export function setStoredPageSize(size) {
  const parsed = parseInt(size, 10);
  if (PAGE_SIZES.includes(parsed)) {
    try {
      localStorage.setItem(STORAGE_KEYS.PAGE_SIZE, String(parsed));
    } catch (e) {}
  }
}

/**
 * Reads preferred pagination style ('pages' | 'loadMore').
 */
export function getStoredPaginationStyle() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PAGINATION_STYLE);
    if (saved === 'pages' || saved === 'loadMore') return saved;
  } catch (e) {}

  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return 'loadMore';
  }
  return 'pages';
}

/**
 * Persists pagination style choice in localStorage.
 */
export function setStoredPaginationStyle(style) {
  if (style === 'pages' || style === 'loadMore') {
    try {
      localStorage.setItem(STORAGE_KEYS.PAGINATION_STYLE, style);
    } catch (e) {}
  }
}

/**
 * Renders the HTML markup for pagination controls.
 */
export function renderPaginationHtml({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 20,
  paginationStyle = 'pages',
  itemLabel = 'sections',
  showSizeSelector = true,
  showStyleSelector = true
} = {}) {
  const page = clampPage(currentPage, totalPages);
  const summaryText = getResultSummary(page, pageSize, totalItems, itemLabel, paginationStyle === 'loadMore');

  const bounds = getSliceBounds(page, pageSize, totalItems);
  const isLastPage = page >= totalPages;
  const isFirstPage = page <= 1;
  const remainingTotal = Math.max(0, totalItems - bounds.endIndex);
  const nextChunkSize = Math.min(pageSize, remainingTotal);

  const pagesArray = generateEllipsis(page, totalPages);

  // If there is only one page and no items, or just 1 page in standard view:
  const isSinglePage = totalPages <= 1;

  return `
    <nav aria-label="Pagination" class="pagination-nav ${paginationStyle === 'loadMore' ? 'is-load-more' : ''}">
      <div class="pagination-top-bar">
        <div class="pagination-summary" role="status" aria-atomic="true">
          ${summaryText}
        </div>

        <div class="pagination-settings">
          ${showSizeSelector ? `
            <div class="pagination-size-select-wrap">
              <label for="pagination-size-select" class="pagination-size-label">Per page:</label>
              <select id="pagination-size-select" class="pagination-select" aria-label="Select items per page">
                ${PAGE_SIZES.map(s => `
                  <option value="${s}" ${s === pageSize ? 'selected' : ''}>${s}</option>
                `).join('')}
              </select>
            </div>
          ` : ''}

          ${showStyleSelector ? `
            <div class="pagination-style-toggle" role="group" aria-label="Pagination layout style">
              <button
                type="button"
                class="pagination-style-btn ${paginationStyle === 'pages' ? 'active' : ''}"
                data-style="pages"
                title="Standard numbered pages"
                aria-pressed="${paginationStyle === 'pages'}"
              >
                Pages
              </button>
              <button
                type="button"
                class="pagination-style-btn ${paginationStyle === 'loadMore' ? 'active' : ''}"
                data-style="loadMore"
                title="Incremental load more"
                aria-pressed="${paginationStyle === 'loadMore'}"
              >
                Load More
              </button>
            </div>
          ` : ''}
        </div>
      </div>

      ${isSinglePage ? '' : (
        paginationStyle === 'loadMore' ? `
          <div class="pagination-load-more-wrap">
            ${remainingTotal > 0 ? `
              <button
                type="button"
                class="btn btn-outline pagination-load-more-btn"
                data-page="${page + 1}"
                aria-label="Load ${nextChunkSize} more ${itemLabel}, ${remainingTotal} remaining"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                Load ${nextChunkSize} more (${remainingTotal} remaining)
              </button>
            ` : `
              <div class="pagination-all-loaded">
                <span>&#10003; All ${totalItems} ${itemLabel} displayed</span>
              </div>
            `}
          </div>
        ` : `
          <div class="pagination-controls">
            <!-- Desktop Full Controls -->
            <div class="pagination-desktop-group">
              <button
                type="button"
                class="pagination-btn pagination-first-btn"
                data-page="1"
                ${isFirstPage ? 'disabled aria-disabled="true"' : ''}
                aria-label="Go to first page"
                title="First page"
              >
                <span aria-hidden="true">&laquo;</span>
                <span class="pagination-btn-text">First</span>
              </button>

              <button
                type="button"
                class="pagination-btn pagination-prev-btn"
                data-page="${Math.max(1, page - 1)}"
                ${isFirstPage ? 'disabled aria-disabled="true"' : ''}
                aria-label="Go to previous page (Page ${Math.max(1, page - 1)})"
                title="Previous page"
              >
                <span aria-hidden="true">&lsaquo;</span>
                <span class="pagination-btn-text">Prev</span>
              </button>

              <div class="pagination-pages-list" role="list">
                ${pagesArray.map(item => {
                  if (item === '...') {
                    return `<span class="pagination-ellipsis" aria-hidden="true">&hellip;</span>`;
                  }
                  const isCurrent = item === page;
                  return `
                    <button
                      type="button"
                      class="pagination-btn pagination-num-btn ${isCurrent ? 'active' : ''}"
                      data-page="${item}"
                      ${isCurrent ? 'aria-current="page"' : ''}
                      aria-label="Go to page ${item}"
                    >
                      ${item}
                    </button>
                  `;
                }).join('')}
              </div>

              <button
                type="button"
                class="pagination-btn pagination-next-btn"
                data-page="${Math.min(totalPages, page + 1)}"
                ${isLastPage ? 'disabled aria-disabled="true"' : ''}
                aria-label="Go to next page (Page ${Math.min(totalPages, page + 1)})"
                title="Next page"
              >
                <span class="pagination-btn-text">Next</span>
                <span aria-hidden="true">&rsaquo;</span>
              </button>

              <button
                type="button"
                class="pagination-btn pagination-last-btn"
                data-page="${totalPages}"
                ${isLastPage ? 'disabled aria-disabled="true"' : ''}
                aria-label="Go to last page (Page ${totalPages})"
                title="Last page"
              >
                <span class="pagination-btn-text">Last</span>
                <span aria-hidden="true">&raquo;</span>
              </button>
            </div>

            <!-- Mobile Compact Controls -->
            <div class="pagination-mobile-group">
              <button
                type="button"
                class="pagination-btn pagination-mobile-prev-btn"
                data-page="${Math.max(1, page - 1)}"
                ${isFirstPage ? 'disabled aria-disabled="true"' : ''}
                aria-label="Previous page"
              >
                &lsaquo; Prev
              </button>

              <span class="pagination-mobile-indicator" aria-live="polite">
                Page <strong>${page}</strong> of <strong>${totalPages}</strong>
              </span>

              <button
                type="button"
                class="pagination-btn pagination-mobile-next-btn"
                data-page="${Math.min(totalPages, page + 1)}"
                ${isLastPage ? 'disabled aria-disabled="true"' : ''}
                aria-label="Next page"
              >
                Next &rsaquo;
              </button>
            </div>

            <!-- Jump to Page Input -->
            <form class="pagination-jump-form" aria-label="Jump directly to a page">
              <label for="pagination-jump-input" class="pagination-jump-label">Go to:</label>
              <input
                type="number"
                id="pagination-jump-input"
                class="pagination-jump-input"
                min="1"
                max="${totalPages}"
                value="${page}"
                aria-label="Enter page number from 1 to ${totalPages}"
              />
              <button type="submit" class="btn btn-outline pagination-jump-btn" aria-label="Submit page jump">
                Go
              </button>
            </form>
          </div>
        `
      )}
    </nav>
  `;
}

/**
 * Attaches event listeners to the pagination container and triggers callbacks.
 */
export function bindPaginationEvents(container, {
  onPageChange,
  onPageSizeChange,
  onStyleChange,
  onPrefetchNext,
  scrollTarget = null,
  listHeading = null
} = {}) {
  if (!container) return;

  // Page clicks
  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = parseInt(btn.getAttribute('data-page'), 10);
      if (!isNaN(targetPage) && onPageChange) {
        onPageChange(targetPage);
        handlePostPageScrollAndFocus(scrollTarget, listHeading);
      }
    });

    // Prefetch next page on hover or focus of next button
    if (btn.classList.contains('pagination-next-btn') || btn.classList.contains('pagination-mobile-next-btn')) {
      const prefetch = () => {
        const targetPage = parseInt(btn.getAttribute('data-page'), 10);
        if (!isNaN(targetPage) && onPrefetchNext) {
          onPrefetchNext(targetPage);
        }
      };
      btn.addEventListener('mouseenter', prefetch, { once: true });
      btn.addEventListener('focus', prefetch, { once: true });
    }
  });

  // Page size select change
  const sizeSelect = container.querySelector('#pagination-size-select');
  if (sizeSelect) {
    sizeSelect.addEventListener('change', () => {
      const newSize = parseInt(sizeSelect.value, 10);
      setStoredPageSize(newSize);
      if (onPageSizeChange) {
        onPageSizeChange(newSize);
        handlePostPageScrollAndFocus(scrollTarget, listHeading);
      }
    });
  }

  // Pagination style button clicks
  container.querySelectorAll('.pagination-style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const style = btn.getAttribute('data-style');
      if (style) {
        setStoredPaginationStyle(style);
        if (onStyleChange) {
          onStyleChange(style);
        }
      }
    });
  });

  // Jump to page form
  const jumpForm = container.querySelector('.pagination-jump-form');
  if (jumpForm) {
    jumpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = jumpForm.querySelector('#pagination-jump-input');
      if (input) {
        const targetPage = parseInt(input.value, 10);
        if (!isNaN(targetPage) && onPageChange) {
          onPageChange(targetPage);
          handlePostPageScrollAndFocus(scrollTarget, listHeading);
        }
      }
    });
  }
}

/**
 * Handles smooth scrolling to the top of the list and announces page update to screen readers.
 */
function handlePostPageScrollAndFocus(scrollTarget, listHeading) {
  const prefersReduced = typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (scrollTarget) {
    try {
      scrollTarget.scrollIntoView({
        behavior: prefersReduced ? 'auto' : 'smooth',
        block: 'start'
      });
    } catch (e) {
      scrollTarget.scrollIntoView();
    }
  }

  if (listHeading) {
    listHeading.setAttribute('tabindex', '-1');
    listHeading.focus({ preventScroll: true });
  }
}

/**
 * Announces a page change message through the site live region.
 */
export function announcePaginationChange(page, totalPages, totalItems, pageSize, itemLabel = 'sections') {
  const bounds = getSliceBounds(page, pageSize, totalItems);
  const msg = `Page ${page} of ${totalPages}, showing ${bounds.startIndex + 1}-${bounds.endIndex} of ${totalItems} ${itemLabel}`;
  const srEl = document.getElementById('sr-announcements');
  if (srEl) {
    srEl.textContent = msg;
  }
}
