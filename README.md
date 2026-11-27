# BNS Mapper

> **IPC &harr; BNS Criminal Law Navigator**  
> An open-source, client-side educational reference tool helping law students, advocates, and researchers in India transition from the old **Indian Penal Code (IPC, 1860)** to the new **Bharatiya Nyaya Sanhita (BNS, 2023)**, alongside **CrPC &harr; BNSS** and **IEA &harr; BSA**.

Hosted on **GitHub Pages**: [https://datageniesk.github.io/BNS-Mapper/](https://datageniesk.github.io/BNS-Mapper/)

---

## Dataset Status: 100% Codified (358 / 358 Sections)

The BNS Mapper dataset has achieved complete statutory coverage across all **20 chapters** and all **358 sections** of the Bharatiya Nyaya Sanhita, 2023:

- **Total BNS Sections:** **358 / 358 (100% Present)**
- **Chapters Codified:** **20 / 20 (Chapters I to XX)**
- **Quiz Scenarios:** **87 Hand-Crafted Practical Legal Case Scenarios**
- **Omitted IPC Provisions:** **13 Documented Sections** (e.g. sedition, adultery, suicide attempts, unnatural offences) in `data/omitted_ipc.json`
- **Data Integrity:** Validated strictly with `node scripts/validate.js` (ensuring every integer from 1 to 358 is present exactly once with zero duplicates and zero range boundary errors).

---

## Key Features

1. **Complete 358-Section Statutory Mapping**
   - Every single section from Section 1 (Short title & commencement) to Section 358 (Repeal and savings) is mapped with operative summaries, punishment changes, and plain-English legal explanations.

2. **Omitted IPC Provisions Lookup**
   - Sections dropped or struck down from the IPC (such as Section 124A Sedition, Section 309 Suicide Attempt, Section 497 Adultery, and Section 377 Unnatural Offences) are clearly catalogued in the IPC &rarr; BNS search as **"No direct BNS equivalent"** with explanatory commentary citing Supreme Court judgments and legislative rationale.

3. **"What's New in BNS" Showcase**
   - Automatically aggregated registry of all provisions marked with `change = "new"`, highlighting brand-new offences such as:
     - **Section 304:** Snatching (newly codified street crime)
     - **Section 69:** Sexual intercourse by deceitful promise of marriage
     - **Section 95:** Hiring or employing a child to commit an offence
     - **Section 111 & 112:** Organized crime and petty organized crime
     - **Section 113:** Terrorist acts
     - **Section 4 & Section 303(2):** Community service as a statutory reformative sentencing alternative

4. **Codification & Verification Coverage Dashboard (`#/coverage`)**
   - Chapter-by-chapter progress indicators tracking how many sections are codified, verified, and clean of TODOs.
   - Real-time animated progress bars for each of the 20 chapters.

5. **Multi-Mode Quiz & Exam Practice (`#/quiz`)**
   - **Mixed Exam Practice:** 8 randomized questions drawing from all 20 chapters.
   - **Timed 60s Challenge:** Fast-paced speed drills for preliminary exams.
   - **Interactive Match-the-Pairs:** Drag-and-drop / click-to-match game pairing Old IPC provisions with New BNS sections.
   - **Weak Chapters Diagnostic:** Real-time accuracy tracking across chapters to highlight weak subject areas needing focused revision.
   - **Leitner Spaced Repetition (`#/flashcards`):** 5-box memory mastery system stored in `localStorage`.

6. **Instant Two-Way Client-Side Search (Fuse.js)**
   - Search across IPC numbers, BNS numbers, crime titles, punishments, and tags with zero server latency.
   - Toggle between **IPC &rarr; BNS** (Old &rarr; New) and **BNS &rarr; IPC** (New &rarr; Old).
   - Press `/` anywhere on the site to jump directly to the search input.

7. **Side-by-Side Comparison Mode (`#/compare`)**
   - Pin up to 3 sections across the Sanhitas into a persistent floating tray for detailed multi-column comparison.

8. **PWA Offline Installation**
   - Full service worker (`sw.js`) caching all 20 chapter files, static shell, and quiz scenarios for offline access in courtrooms or classrooms without connectivity.

---

## Community Gazette Verification Workflow

To guarantee accuracy for legal professionals, all initial entries are generated with `"verified": false`. We invite law students, advocates, judicial aspirants, and legal scholars to participate in manual Gazette verification.

### How to Verify a Chapter:

1. **Pick a Chapter:**
   - Check the **[Coverage Dashboard](https://datageniesk.github.io/BNS-Mapper/#/coverage)** to see which chapters are currently pending verification.
   - Locate the chapter file in `data/chapters/` (e.g. `chI.json`, `chVI.json`, `chXVII.json`).

2. **Cross-Check with the Gazette of India:**
   - Refer to the official publication: *The Bharatiya Nyaya Sanhita, 2023 (Act No. 45 of 2023)*, published in the Gazette of India Extraordinary, Part II, Section 1 (25 December 2023).
   - Verify:
     - Exact section number and title.
     - Operative part summary (`new_text` and `old_text`).
     - Prescribed punishment terms and fine ceilings (`punishment_new` vs `punishment_old`).
     - Nature of change (`renumbered`, `modified`, `merged`, `split`, `new`, `omitted`).

3. **Update the JSON Entry:**
   - Flip `"verified": false` &rarr; `"verified": true`.
   - Optionally update the `"source"` field with the specific Gazette page or sub-clause citation (e.g., `"The Bharatiya Nyaya Sanhita, 2023, Section 304, Gazette of India, Act No. 45 of 2023"`).

4. **Run the Automated Validator:**
   ```bash
   node scripts/validate.js
   ```
   Ensure the test reports:
   ```text
   ✔ Full Coverage: All 358 BNS sections (1 to 358) are accounted for.
   ✔ Exact Uniqueness: Every section from 1 to 358 is present exactly once.
   ✔ All chapter datasets passed validation cleanly! Total sections: 358 / 358
   ```

5. **Submit a Pull Request:**
   - Title your PR: `verify(chXX): verify Chapter XX against Gazette of India`
   - Include a brief note of any typographical adjustments made.

---

## Project Structure

```text
BNS-Mapper/
├── index.html              # Main HTML entry point and accessible shell
├── manifest.json           # Progressive Web App manifest
├── sw.js                   # Service worker caching all static & chapter datasets
├── assets/
│   └── favicon.svg         # Scales of justice vector icon
├── css/
│   ├── main.css            # Editorial law theme & responsive layout
│   └── print.css           # Print stylesheet for "My Sections" cheat sheet
├── js/
│   ├── app.js              # Bootstrap, parallel chapter loader & event coordination
│   ├── router.js           # Client-side hash router
│   ├── search.js           # Fuse.js search engine with direction weighting
│   ├── storage.js          # LocalStorage bookmarks, Leitner boxes, and quiz stats
│   ├── quiz.js             # Multi-statute quiz generator & Leitner flashcard logic
│   └── ui.js               # Accessible DOM renderers, animations, and dashboards
├── data/
│   ├── schema.json         # JSON Schema (Draft-07) for dataset
│   ├── chapters.json       # Index of all 20 chapters with section ranges
│   ├── chapters/           # Modular chapter files (chI.json to chXX.json)
│   ├── omitted_ipc.json    # Catalog of dropped/omitted IPC provisions
│   ├── quiz_scenarios.json # 87 hand-crafted case scenarios across all chapters
│   ├── sections.json       # Fallback consolidated IPC-to-BNS mapping records
│   ├── bnss_sections.json  # CrPC -> BNSS sample dataset
│   └── bsa_sections.json   # Evidence Act -> BSA sample dataset
└── scripts/
    └── validate.js         # Strict Node.js data integrity & 358-section coverage validator
```

---

## Data Schema

Every entry in `data/chapters/chXX.json` satisfies `data/schema.json`:

```json
{
  "id": "bns-304",
  "bns": ["304"],
  "ipc": ["None"],
  "title": "Snatching",
  "chapter": "XVII",
  "change": "new",
  "old_text": "No specific statutory definition in IPC; prosecuted under general theft (Section 379) or hurt/robbery provisions.",
  "new_text": "Theft is snatching if the offender suddenly, quickly, or forcibly seizes, grabs or takes away movable property from any person or possession.",
  "punishment_old": "None (prosecuted as theft: up to 3 years)",
  "punishment_new": "Imprisonment up to 3 years, and fine",
  "explanation": "BNS Section 304 introduces snatching as an independent codified criminal offence for the first time in Indian penal jurisprudence. It covers sudden, quick, or forcible grabbing of phones, chains, or bags, bridging the gap between simple theft and violent robbery.",
  "tags": ["snatching", "new offence", "chain snatching", "forcible grab", "street crime"],
  "verified": false,
  "source": ""
}
```

---

## Open Source License & Disclaimer

- **License:** Released under the permissive [MIT License](file:///c:/Users/DELL/Desktop/bns%20mapper/LICENSE).
- **Disclaimer:** *This application is an educational reference aid designed to assist students, academics, and legal practitioners during the transition to the new criminal sanhitas. It does not constitute legal advice. Please verify statutory citations against the official Gazette of India published by the Ministry of Law and Justice before citing in judicial pleadings or formal examinations.*
