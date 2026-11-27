/**
 * Quiz & Spaced Repetition Engine for BNS Mapper
 * Multi-type question generation, scenario tests, match-the-pairs, Leitner flashcards, and SVG dashboard
 */

import { storage } from './storage.js';

export const quizEngine = {
  sections: [],
  scenarios: [],
  activeSession: null,
  flashcardIndex: 0,
  flashcardPool: [],

  init(sections, scenarios) {
    this.sections = sections || [];
    this.scenarios = scenarios || [];
  },

  formatSectionArray(arr, fallback = '') {
    if (!arr) return fallback;
    if (Array.isArray(arr)) {
      return arr.filter(Boolean).join(' / ');
    }
    return String(arr);
  },

  // -------------------------------------------------------------------
  // 1. Question Generators
  // -------------------------------------------------------------------
  generateQuiz({ mode = 'mixed', chapter = 'all', difficulty = 'medium', questionCount = 8 } = {}) {
    let pool = this.sections.filter(s => {
      const hasIpc = Array.isArray(s.ipc) ? s.ipc.length > 0 && s.ipc[0] !== 'None' : (s.ipc && s.ipc !== 'None');
      const hasBns = Array.isArray(s.bns) ? s.bns.length > 0 && s.bns[0] !== 'Omitted' && s.bns[0] !== 'No direct BNS equivalent' : (s.bns && s.bns !== 'Omitted');
      return hasIpc && hasBns;
    });

    if (chapter !== 'all') {
      const filtered = pool.filter(s => s.chapter === chapter);
      if (filtered.length >= 2) {
        pool = filtered;
      }
    }

    const questions = [];
    const usedSections = new Set();

    // 1. Scenario Questions (draw from scenarios belonging to the chapter or all 87 scenarios)
    let scenarioPool = this.scenarios.slice();
    if (chapter !== 'all') {
      const matchScen = scenarioPool.filter(sc => sc.chapter === chapter);
      if (matchScen.length > 0) scenarioPool = matchScen;
    }
    // Shuffle scenarios
    scenarioPool.sort(() => 0.5 - Math.random());

    const scenarioQuota = Math.min(scenarioPool.length, Math.max(1, Math.floor(questionCount * 0.35)));
    for (let i = 0; i < scenarioQuota; i++) {
      const sc = scenarioPool[i];
      const targetSec = this.sections.find(s => s.id === sc.section) || null;
      const correctIdx = sc.correctIndex !== undefined
        ? sc.correctIndex
        : (sc.options.indexOf(sc.answer) !== -1 ? sc.options.indexOf(sc.answer) : 0);

      questions.push({
        type: 'scenario',
        title: sc.title || `Chapter ${sc.chapter || ''} Practical Scenario`,
        chapter: sc.chapter || (targetSec ? targetSec.chapter : 'all'),
        prompt: sc.scenario,
        options: sc.options,
        correctIndex: correctIdx,
        explanation: sc.explanation,
        bnsSection: sc.section,
        ipcSection: targetSec ? this.formatSectionArray(targetSec.ipc) : '',
        sectionId: sc.section
      });
      if (sc.section) usedSections.add(sc.section);
    }

    // 2. Auto-generate Section & True/False Questions across all chapters
    const shuffledSections = pool.slice().sort(() => 0.5 - Math.random());

    for (const sec of shuffledSections) {
      if (questions.length >= questionCount) break;
      if (usedSections.has(sec.id)) continue;
      usedSections.add(sec.id);

      const qTypeRand = Math.random();
      const bnsLabel = this.formatSectionArray(sec.bns);
      const ipcLabel = this.formatSectionArray(sec.ipc);

      if (qTypeRand < 0.4) {
        // Type A: Which BNS section replaces IPC X?
        const wrongOptions = this.getPlausibleBnsOptions(sec, pool, difficulty);
        const allOpts = [bnsLabel, ...wrongOptions].sort(() => 0.5 - Math.random());
        questions.push({
          type: 'ipc_to_bns',
          chapter: sec.chapter,
          prompt: `Which BNS section replaces IPC Section ${ipcLabel} ("${sec.title}")?`,
          options: allOpts.map(opt => `BNS Section ${opt}`),
          correctIndex: allOpts.indexOf(bnsLabel),
          explanation: sec.explanation,
          sectionId: sec.id
        });
      } else if (qTypeRand < 0.75) {
        // Type B: Which IPC section was this BNS section?
        const wrongOptions = this.getPlausibleIpcOptions(sec, pool, difficulty);
        const allOpts = [ipcLabel, ...wrongOptions].sort(() => 0.5 - Math.random());
        questions.push({
          type: 'bns_to_ipc',
          chapter: sec.chapter,
          prompt: `Under the old IPC, which section corresponded to BNS Section ${bnsLabel} ("${sec.title}")?`,
          options: allOpts.map(opt => `IPC Section ${opt}`),
          correctIndex: allOpts.indexOf(ipcLabel),
          explanation: sec.explanation,
          sectionId: sec.id
        });
      } else {
        // Type C: True / False on what changed
        const isTrue = Math.random() >= 0.5;
        let promptText = '';
        if (isTrue) {
          promptText = `Statement: Under BNS Section ${bnsLabel} ("${sec.title}"), the statutory transition from IPC ${ipcLabel} is categorized as "${sec.change}".`;
        } else {
          const fakeChange = sec.change === 'renumbered' ? 'omitted completely' : 'renumbered without alteration';
          promptText = `Statement: Under BNS Section ${bnsLabel} ("${sec.title}"), the provision was ${fakeChange}.`;
        }
        questions.push({
          type: 'true_false',
          chapter: sec.chapter,
          prompt: promptText,
          options: ['True', 'False'],
          correctIndex: isTrue ? 0 : 1,
          explanation: sec.explanation,
          sectionId: sec.id
        });
      }
    }

    // Shuffle questions
    questions.sort(() => 0.5 - Math.random());

    this.activeSession = {
      mode,
      chapter,
      difficulty,
      questions,
      currentIndex: 0,
      score: 0,
      answers: [], // { questionIndex, selectedIndex, isCorrect }
      timer: mode === 'timed' ? 60 : null,
      timerInterval: null
    };

    return this.activeSession;
  },

  getPlausibleBnsOptions(targetSec, pool, difficulty) {
    const targetBns = this.formatSectionArray(targetSec.bns);
    const options = [];

    // Same chapter first
    const sameChapter = pool.filter(s => s.id !== targetSec.id && s.chapter === targetSec.chapter);
    sameChapter.sort(() => 0.5 - Math.random());
    for (const s of sameChapter) {
      const bStr = this.formatSectionArray(s.bns);
      if (options.length < 3 && bStr && bStr !== 'Omitted' && bStr !== 'No direct BNS equivalent' && bStr !== targetBns && !options.includes(bStr)) {
        options.push(bStr);
      }
    }

    // Nearby / other pool across all chapters
    const otherPool = pool.filter(s => s.id !== targetSec.id);
    otherPool.sort(() => 0.5 - Math.random());
    for (const s of otherPool) {
      const bStr = this.formatSectionArray(s.bns);
      if (options.length < 3 && bStr && bStr !== 'Omitted' && bStr !== 'No direct BNS equivalent' && bStr !== targetBns && !options.includes(bStr)) {
        options.push(bStr);
      }
    }

    // Synthetic fallback if needed
    const numericBns = parseInt(targetBns.replace(/[^0-9]/g, ''), 10) || 100;
    while (options.length < 3) {
      const fake = String(numericBns + (options.length + 1) * 3);
      if (!options.includes(fake) && fake !== targetBns) options.push(fake);
    }

    return options.slice(0, 3);
  },

  getPlausibleIpcOptions(targetSec, pool, difficulty) {
    const targetIpc = this.formatSectionArray(targetSec.ipc);
    const options = [];

    const sameChapter = pool.filter(s => s.id !== targetSec.id && s.chapter === targetSec.chapter);
    sameChapter.sort(() => 0.5 - Math.random());
    for (const s of sameChapter) {
      const iStr = this.formatSectionArray(s.ipc);
      if (options.length < 3 && iStr && iStr !== 'None' && iStr !== targetIpc && !options.includes(iStr)) {
        options.push(iStr);
      }
    }

    const otherPool = pool.filter(s => s.id !== targetSec.id);
    otherPool.sort(() => 0.5 - Math.random());
    for (const s of otherPool) {
      const iStr = this.formatSectionArray(s.ipc);
      if (options.length < 3 && iStr && iStr !== 'None' && iStr !== targetIpc && !options.includes(iStr)) {
        options.push(iStr);
      }
    }

    const numericIpc = parseInt(targetIpc.replace(/[^0-9]/g, ''), 10) || 300;
    while (options.length < 3) {
      const fake = String(numericIpc + (options.length + 1) * 4);
      if (!options.includes(fake) && fake !== targetIpc) options.push(fake);
    }

    return options.slice(0, 3);
  },

  // -------------------------------------------------------------------
  // 2. Match the Pairs Generator
  // -------------------------------------------------------------------
  generateMatchPairs(count = 5) {
    const valid = this.sections
      .filter(s => {
        const hasIpc = Array.isArray(s.ipc) ? s.ipc.length > 0 && s.ipc[0] !== 'None' : (s.ipc && s.ipc !== 'None');
        const hasBns = Array.isArray(s.bns) ? s.bns.length > 0 && s.bns[0] !== 'Omitted' && s.bns[0] !== 'No direct BNS equivalent' : (s.bns && s.bns !== 'Omitted');
        return hasIpc && hasBns;
      })
      .sort(() => 0.5 - Math.random())
      .slice(0, count);

    const leftTiles = valid.map(s => ({
      id: s.id,
      text: `IPC § ${this.formatSectionArray(s.ipc)}`,
      subtext: s.title,
      type: 'left'
    }));

    const rightTiles = valid.map(s => ({
      id: s.id,
      text: `BNS § ${this.formatSectionArray(s.bns)}`,
      subtext: s.title,
      type: 'right'
    })).sort(() => 0.5 - Math.random());

    return { leftTiles, rightTiles, totalPairs: count };
  },

  // -------------------------------------------------------------------
  // 3. Leitner Flashcard Mode
  // -------------------------------------------------------------------
  initFlashcardSession() {
    const boxes = storage.getLeitnerBoxes();
    let poolIds = [];
    for (let b = 1; b <= 5; b++) {
      if (boxes[b] && boxes[b].length > 0) {
        poolIds = poolIds.concat(boxes[b]);
      }
    }

    if (poolIds.length === 0) {
      poolIds = this.sections.map(s => s.id);
      poolIds.forEach(id => storage.updateLeitnerCard(id, false));
    }

    this.flashcardPool = poolIds
      .map(id => this.sections.find(s => s.id === id))
      .filter(Boolean)
      .sort(() => 0.5 - Math.random());

    this.flashcardIndex = 0;
    return this.flashcardPool;
  },

  getCurrentFlashcard() {
    if (!this.flashcardPool || this.flashcardPool.length === 0) return null;
    return this.flashcardPool[this.flashcardIndex % this.flashcardPool.length];
  },

  answerFlashcard(isCorrect) {
    const card = this.getCurrentFlashcard();
    if (!card) return null;

    const newBox = storage.updateLeitnerCard(card.id, isCorrect);
    this.flashcardIndex++;
    return { newBox, nextCard: this.getCurrentFlashcard() };
  }
};
