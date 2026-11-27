/**
 * Storage module for BNS Mapper
 * Handles bookmarks, active search direction, and user theme preferences via localStorage
 */

const STORAGE_KEYS = {
  BOOKMARKS: 'bns_mapper_bookmarks',
  DIRECTION: 'bns_mapper_direction',
  THEME: 'bns_mapper_theme'
};

export const DIRECTIONS = {
  IPC_TO_BNS: 'ipc-to-bns',
  BNS_TO_IPC: 'bns-to-ipc'
};

export const storage = {
  // --- Bookmarks ---
  getBookmarks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Could not read bookmarks from localStorage:', e);
      return [];
    }
  },

  isBookmarked(id) {
    const list = this.getBookmarks();
    return list.includes(id);
  },

  toggleBookmark(id) {
    const list = this.getBookmarks();
    const index = list.indexOf(id);
    let newState = false;

    if (index === -1) {
      list.push(id);
      newState = true;
    } else {
      list.splice(index, 1);
      newState = false;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('bookmarks-updated', { detail: { id, isBookmarked: newState, count: list.length } }));
    } catch (e) {
      console.warn('Could not save bookmarks to localStorage:', e);
    }

    return newState;
  },

  clearBookmarks() {
    try {
      localStorage.removeItem(STORAGE_KEYS.BOOKMARKS);
      window.dispatchEvent(new CustomEvent('bookmarks-updated', { detail: { count: 0 } }));
    } catch (e) {
      console.warn('Could not clear bookmarks:', e);
    }
  },

  // --- Direction Toggle (IPC -> BNS vs BNS -> IPC) ---
  getDirection() {
    try {
      const dir = localStorage.getItem(STORAGE_KEYS.DIRECTION);
      return dir === DIRECTIONS.BNS_TO_IPC ? DIRECTIONS.BNS_TO_IPC : DIRECTIONS.IPC_TO_BNS;
    } catch (e) {
      return DIRECTIONS.IPC_TO_BNS;
    }
  },

  setDirection(direction) {
    try {
      localStorage.setItem(STORAGE_KEYS.DIRECTION, direction);
      window.dispatchEvent(new CustomEvent('direction-changed', { detail: { direction } }));
    } catch (e) {
      console.warn('Could not set direction in localStorage:', e);
    }
  },

  // --- Theme Toggle ---
  getTheme() {
    try {
      return localStorage.getItem(STORAGE_KEYS.THEME) || 'auto';
    } catch (e) {
      return 'auto';
    }
  },

  setTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
      this.applyTheme(theme);
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
    } catch (e) {
      console.warn('Could not set theme in localStorage:', e);
    }
  },

  applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      // Auto: follow system
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.removeAttribute('data-theme');
      }
    }
  },

  initTheme() {
    const savedTheme = this.getTheme();
    this.applyTheme(savedTheme);

    // Listen to OS theme changes if on auto
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (this.getTheme() === 'auto') {
          this.applyTheme('auto');
        }
      });
    }
  }
};
