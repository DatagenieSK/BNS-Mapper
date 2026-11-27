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

  // -------------------------------------------------------------------
  // 1. Question Generators
  // -------------------------------------------------------------------
  generateQuiz({ mode = 'mixed', chapter = 'all', difficulty = 'medium', questionCount = 8 } = {}) {
    let pool = this.sections.filter(s => s.ipc && s.ipc !== 'None' && s.bns && s.bns !== 'Omitted');
    if (chapter !== 'all') {
      pool = pool.filter(s => s.chapter === chapter);
      if (pool.length < 4) {
        // Fallback to all if chapter too small
        pool = this.sections.slice();
      }
    }

    const questions = [];
    const usedSections = new Set();

    // 1. Scenario Questions (if available in this chapter or mixed)
    let scenarioPool = this.scenarios.slice();
    if (chapter !== 'all') {
      const matchScen = scenarioPool.filter(sc => sc.chapter === chapter);
      if (matchScen.length > 0) scenarioPool = matchScen;
    }
    // Shuffle scenarios
    scenarioPool.sort(() => 0.5 - Math.random());

    const scenarioQuota = Math.min(scenarioPool.length, Math.max(1, Math.floor(questionCount * 0.3)));
    for (let i = 0; i < scenarioQuota; i++) {
      const sc = scenarioPool[i];
      questions.push({
        type: 'scenario',
        title: sc.title,
        prompt: sc.scenario,
        options: sc.options,
        correctIndex: sc.correctIndex,
        explanation: sc.explanation,
        bnsSection: sc.bns_section,
        ipcSection: sc.ipc_section,
        sectionId: `ipc-${sc.ipc_section.split('/')[0].toLowerCase()}`
      });
    }

    // 2. Auto-generate Section & True/False Questions
    const shuffledSections = pool.slice().sort(() => 0.5 - Math.random());

    for (const sec of shuffledSections) {
      if (questions.length >= questionCount) break;
      if (usedSections.has(sec.id)) continue;
      usedSections.add(sec.id);

      const qTypeRand = Math.random();

      if (qTypeRand < 0.4) {
        // Type A: Which BNS section replaces IPC X?
        const wrongOptions = this.getPlausibleBnsOptions(sec, pool, difficulty);
        const allOpts = [sec.bns, ...wrongOptions].sort(() => 0.5 - Math.random());
        questions.push({
          type: 'ipc_to_bns',
          prompt: `Which BNS section replaces IPC Section ${sec.ipc} ("${sec.title}")?`,
          options: allOpts.map(opt => `BNS Section ${opt}`),
          correctIndex: allOpts.indexOf(sec.bns),
          explanation: sec.explanation,
          sectionId: sec.id
        });
      } else if (qTypeRand < 0.75) {
        // Type B: Which IPC section was this BNS section?
        const wrongOptions = this.getPlausibleIpcOptions(sec, pool, difficulty);
        const allOpts = [sec.ipc, ...wrongOptions].sort(() => 0.5 - Math.random());
        questions.push({
          type: 'bns_to_ipc',
          prompt: `Under the old IPC, which section corresponded to BNS Section ${sec.bns} ("${sec.title}")?`,
          options: allOpts.map(opt => `IPC Section ${opt}`),
          correctIndex: allOpts.indexOf(sec.ipc),
          explanation: sec.explanation,
          sectionId: sec.id
        });
      } else {
        // Type C: True / False on what changed
        const isTrue = Math.random() >= 0.5;
        let promptText = '';
        if (isTrue) {
          promptText = `Statement: Under BNS Section ${sec.bns} ("${sec.title}"), the change from IPC ${sec.ipc} is categorized as "${sec.change}".`;
        } else {
          const fakeChange = sec.change === 'renumbered' ? 'omitted completely' : 'renumbered without change';
          promptText = `Statement: Under BNS Section ${sec.bns} ("${sec.title}"), the provision was ${fakeChange}.`;
        }
        questions.push({
          type: 'true_false',
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
    // Pick options from the same chapter first or nearby sections
    const sameChapter = pool.filter(s => s.id !== targetSec.id && s.chapter === targetSec.chapter && s.bns && s.bns !== 'Omitted');
    const options = [];

    sameChapter.sort(() => 0.5 - Math.random());
    for (const s of sameChapter) {
      if (options.length < 3 && !options.includes(s.bns) && s.bns !== targetSec.bns) {
        options.push(s.bns);
      }
    }

    // Fill up from rest of pool if needed
    const otherPool = pool.filter(s => s.id !== targetSec.id && !options.includes(s.bns) && s.bns !== targetSec.bns);
    otherPool.sort(() => 0.5 - Math.random());
    for (const s of otherPool) {
      if (options.length < 3 && s.bns && s.bns !== 'Omitted') {
        options.push(s.bns);
      }
    }

    // Fallbacks if pool is small
    const numericBns = parseInt(targetSec.bns, 10) || 100;
    while (options.length < 3) {
      const fake = String(numericBns + (options.length + 1) * 3);
      if (!options.includes(fake) && fake !== targetSec.bns) options.push(fake);
    }

    return options.slice(0, 3);
  },

  getPlausibleIpcOptions(targetSec, pool, difficulty) {
    const sameChapter = pool.filter(s => s.id !== targetSec.id && s.chapter === targetSec.chapter && s.ipc && s.ipc !== 'None');
    const options = [];

    sameChapter.sort(() => 0.5 - Math.random());
    for (const s of sameChapter) {
      if (options.length < 3 && !options.includes(s.ipc) && s.ipc !== targetSec.ipc) {
        options.push(s.ipc);
      }
    }

    const otherPool = pool.filter(s => s.id !== targetSec.id && !options.includes(s.ipc) && s.ipc !== targetSec.ipc);
    otherPool.sort(() => 0.5 - Math.random());
    for (const s of otherPool) {
      if (options.length < 3 && s.ipc && s.ipc !== 'None') {
        options.push(s.ipc);
      }
    }

    const numericIpc = parseInt(targetSec.ipc, 10) || 300;
    while (options.length < 3) {
      const fake = String(numericIpc + (options.length + 1) * 4);
      if (!options.includes(fake) && fake !== targetSec.ipc) options.push(fake);
    }

    return options.slice(0, 3);
  },

  // -------------------------------------------------------------------
  // 2. Match the Pairs Generator
  // -------------------------------------------------------------------
  generateMatchPairs(count = 5) {
    const valid = this.sections
      .filter(s => s.ipc && s.ipc !== 'None' && s.bns && s.bns !== 'Omitted')
      .sort(() => 0.5 - Math.random())
      .slice(0, count);

    const leftTiles = valid.map(s => ({
      id: s.id,
      text: `IPC § ${s.ipc}`,
      subtext: s.title,
      type: 'left'
    }));

    const rightTiles = valid.map(s => ({
      id: s.id,
      text: `BNS § ${s.bns}`,
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
    // Prioritize Box 1, then Box 2, then Box 3...
    let poolIds = [];
    for (let b = 1; b <= 5; b++) {
      if (boxes[b] && boxes[b].length > 0) {
        poolIds = poolIds.concat(boxes[b]);
      }
    }

    // If empty, populate Box 1 with all sections
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
