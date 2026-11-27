/**
 * Storage module for BNS Mapper
 * Handles bookmarks, compare pins, active statute pair, theme, Leitner flashcards, and quiz statistics
 */

const STORAGE_KEYS = {
  BOOKMARKS: 'bns_mapper_bookmarks',
  DIRECTION: 'bns_mapper_direction',
  THEME: 'bns_mapper_theme',
  COMPARE: 'bns_mapper_compare',
  STATUTE: 'bns_mapper_statute',
  QUIZ_STATS: 'bns_mapper_quiz_stats',
  LEITNER_BOXES: 'bns_mapper_leitner_boxes',
  TOUR_COMPLETED: 'bns_mapper_tour_completed',
  SPLASH_SESSION: 'bns_mapper_splash_shown'
};

export const DIRECTIONS = {
  IPC_TO_BNS: 'ipc-to-bns',
  BNS_TO_IPC: 'bns-to-ipc'
};

export const STATUTES = {
  IPC_BNS: 'ipc_bns',
  CRPC_BNSS: 'crpc_bnss',
  IEA_BSA: 'iea_bsa'
};

export const storage = {
  // --- Bookmarks ---
  getBookmarks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Could not read bookmarks:', e);
      return [];
    }
  },

  isBookmarked(id) {
    return this.getBookmarks().includes(id);
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
      console.warn('Could not save bookmarks:', e);
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

  // --- Compare Mode (Pin up to 3 sections) ---
  getCompareSections() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMPARE);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  isComparing(id) {
    return this.getCompareSections().includes(id);
  },

  toggleCompare(id) {
    let list = this.getCompareSections();
    const index = list.indexOf(id);
    let added = false;

    if (index === -1) {
      if (list.length >= 3) {
        return { success: false, reason: 'max_reached', list };
      }
      list.push(id);
      added = true;
    } else {
      list.splice(index, 1);
      added = false;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.COMPARE, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('compare-updated', { detail: { list, id, added } }));
    } catch (e) {
      console.warn('Could not save compare list:', e);
    }

    return { success: true, added, list };
  },

  clearCompare() {
    try {
      localStorage.removeItem(STORAGE_KEYS.COMPARE);
      window.dispatchEvent(new CustomEvent('compare-updated', { detail: { list: [] } }));
    } catch (e) {}
  },

  // --- Active Statute Pair Selector ---
  getActiveStatute() {
    try {
      return localStorage.getItem(STORAGE_KEYS.STATUTE) || STATUTES.IPC_BNS;
    } catch (e) {
      return STATUTES.IPC_BNS;
    }
  },

  setActiveStatute(statute) {
    try {
      localStorage.setItem(STORAGE_KEYS.STATUTE, statute);
      window.dispatchEvent(new CustomEvent('statute-changed', { detail: { statute } }));
    } catch (e) {}
  },

  // --- Direction Toggle ---
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
    } catch (e) {}
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
    } catch (e) {}
  },

  applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
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
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.getTheme() === 'auto') {
          this.applyTheme('auto');
        }
      });
    }
  },

  // --- Leitner Spaced-Repetition System (Boxes 1 - 5) ---
  getLeitnerBoxes() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEITNER_BOXES);
      return data ? JSON.parse(data) : { 1: [], 2: [], 3: [], 4: [], 5: [] };
    } catch (e) {
      return { 1: [], 2: [], 3: [], 4: [], 5: [] };
    }
  },

  updateLeitnerCard(sectionId, isCorrect) {
    const boxes = this.getLeitnerBoxes();
    let currentBox = 1;

    // Find card's current box
    for (let b = 1; b <= 5; b++) {
      if (!boxes[b]) boxes[b] = [];
      const idx = boxes[b].indexOf(sectionId);
      if (idx !== -1) {
        currentBox = b;
        boxes[b].splice(idx, 1);
        break;
      }
    }

    let targetBox = 1;
    if (isCorrect) {
      targetBox = Math.min(5, currentBox + 1);
    } else {
      targetBox = 1; // Drop back to Box 1 on error
    }

    if (!boxes[targetBox]) boxes[targetBox] = [];
    boxes[targetBox].push(sectionId);

    try {
      localStorage.setItem(STORAGE_KEYS.LEITNER_BOXES, JSON.stringify(boxes));
      window.dispatchEvent(new CustomEvent('leitner-updated', { detail: { sectionId, targetBox, isCorrect } }));
    } catch (e) {}

    return targetBox;
  },

  resetLeitner() {
    try {
      localStorage.removeItem(STORAGE_KEYS.LEITNER_BOXES);
      window.dispatchEvent(new CustomEvent('leitner-updated', { detail: { reset: true } }));
    } catch (e) {}
  },

  // --- Quiz Stats, Streaks & Badges ---
  getQuizStats() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUIZ_STATS);
      return data ? JSON.parse(data) : {
        totalAttempted: 0,
        totalCorrect: 0,
        currentStreak: 0,
        maxStreak: 0,
        history: [], // { date, score, total, mode, chapter }
        chapterStats: {}, // { chapterName: { correct: 0, total: 0 } }
        badges: []
      };
    } catch (e) {
      return { totalAttempted: 0, totalCorrect: 0, currentStreak: 0, maxStreak: 0, history: [], chapterStats: {}, badges: [] };
    }
  },

  recordQuizSession({ score, total, mode = 'mixed', chapter = 'All Chapters' }) {
    const stats = this.getQuizStats();
    stats.totalAttempted += total;
    stats.totalCorrect += score;

    // Update streak based on session percentage >= 70%
    const passed = (score / total) >= 0.7;
    if (passed) {
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.maxStreak) {
        stats.maxStreak = stats.currentStreak;
      }
    } else {
      stats.currentStreak = 0;
    }

    // Add session history (keep last 12 for dashboard chart)
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}`;
    stats.history.push({
      date: dateStr,
      score,
      total,
      pct: Math.round((score / total) * 100),
      mode,
      chapter
    });
    if (stats.history.length > 15) {
      stats.history = stats.history.slice(-15);
    }

    // Track chapter accuracy
    if (chapter && chapter !== 'All Chapters' && chapter !== 'all') {
      if (!stats.chapterStats[chapter]) {
        stats.chapterStats[chapter] = { correct: 0, total: 0 };
      }
      stats.chapterStats[chapter].correct += score;
      stats.chapterStats[chapter].total += total;
    }

    // Check Badges
    const badgeList = stats.badges || [];
    const checkBadge = (id, name, desc) => {
      if (!badgeList.some(b => b.id === id)) {
        badgeList.push({ id, name, desc, date: dateStr });
      }
    };

    if (stats.totalAttempted >= 1) checkBadge('first_step', 'First Step', 'Completed your first quiz session');
    if (stats.totalCorrect >= 20) checkBadge('bns_novice', 'BNS Novice', 'Answered 20 questions correctly');
    if (stats.totalCorrect >= 50) checkBadge('bns_pro', 'Legal Scholar', 'Answered 50 questions correctly');
    if (stats.currentStreak >= 3) checkBadge('streak_3', 'On Fire', 'Maintained a 3-session streak (70%+)');
    if (stats.currentStreak >= 5) checkBadge('streak_master', 'Streak Master', 'Achieved a 5-session winning streak');
    if (score === total && total >= 5) checkBadge('perfect_score', 'Centurion', 'Scored 100% on a quiz with at least 5 questions');

    stats.badges = badgeList;

    try {
      localStorage.setItem(STORAGE_KEYS.QUIZ_STATS, JSON.stringify(stats));
      window.dispatchEvent(new CustomEvent('quiz-stats-updated', { detail: { stats } }));
    } catch (e) {}

    return stats;
  },

  recordQuestionAnswer(chapter, isCorrect) {
    if (!chapter || chapter === 'all' || chapter === 'All Chapters' || chapter === 'Omitted') return;
    const stats = this.getQuizStats();
    if (!stats.chapterStats) stats.chapterStats = {};
    if (!stats.chapterStats[chapter]) {
      stats.chapterStats[chapter] = { correct: 0, total: 0 };
    }
    stats.chapterStats[chapter].total += 1;
    if (isCorrect) stats.chapterStats[chapter].correct += 1;
    try {
      localStorage.setItem(STORAGE_KEYS.QUIZ_STATS, JSON.stringify(stats));
    } catch (e) {}
  },

  // --- Onboarding Tour State ---
  getTourCompleted() {
    try {
      return localStorage.getItem(STORAGE_KEYS.TOUR_COMPLETED) === 'true';
    } catch (e) {
      return false;
    }
  },

  setTourCompleted(completed = true) {
    try {
      localStorage.setItem(STORAGE_KEYS.TOUR_COMPLETED, completed ? 'true' : 'false');
    } catch (e) {}
  },

  // --- Session Splash State ---
  isSplashNeeded() {
    try {
      if (!window.sessionStorage) return true;
      return sessionStorage.getItem(STORAGE_KEYS.SPLASH_SESSION) !== 'true';
    } catch (e) {
      return true;
    }
  },

  markSplashShown() {
    try {
      if (window.sessionStorage) {
        sessionStorage.setItem(STORAGE_KEYS.SPLASH_SESSION, 'true');
      }
    } catch (e) {}
  },

  // --- Low-End Device Detection ---
  isLowTierDevice() {
    try {
      if (typeof navigator === 'undefined') return false;
      const isLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
      const isLowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
      const isSaveData = navigator.connection && navigator.connection.saveData === true;
      return Boolean(isLowMemory || isLowCores || isSaveData);
    } catch (e) {
      return false;
    }
  }
};
