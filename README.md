# BNS Mapper

> **IPC &harr; BNS Criminal Law Navigator**  
> An open-source, client-side educational reference tool helping law students, advocates, and researchers in India transition from the old **Indian Penal Code (IPC, 1860)** to the new **Bharatiya Nyaya Sanhita (BNS, 2023)**.

Hosted on **GitHub Pages**: [https://datageniesk.github.io/BNS-Mapper/](https://datageniesk.github.io/BNS-Mapper/)

---

## Features

1. **Instant Client-Side Search (Fuse.js)**
   - Search across IPC sections, BNS sections, offence titles, and tags as you type.
   - Boosted exact/prefix matching for section numbers (e.g. `302`, `420`, `103`, `318`).
   - Quick keyboard shortcut: Press `/` to focus search from anywhere.

2. **Two-Way Conversion Direction**
   - Toggle between **IPC &rarr; BNS** and **BNS &rarr; IPC**.
   - Dynamically adjusts search scoring, result labels, and navigation flow.

3. **Section Detail Comparison**
   - Side-by-side comparison of **Old Law (IPC 1860)** and **New Law (BNS 2023)** statutory extracts.
   - Side-by-side **Punishment Comparison**.
   - Plain-English legal commentary explaining the nature and practical effect of the change.
   - Classification badges: `renumbered`, `modified`, `merged`, `split`, `new`, and `omitted`.
   - Sample data verification badge with official gazette source citations.

4. **Chapter Browser**
   - Browse sections grouped by legal subject areas (e.g., *Offences Affecting the Human Body*, *Offences Against Property*, *Offences Against Women and Children*).
   - Filter chapters and provisions by change type.

5. **My Sections & Printable Cheat Sheet**
   - Save bookmarks to `localStorage`.
   - Dedicated print stylesheet (`css/print.css`) to print a clean, ink-friendly tabular cheat sheet.

6. **Hash-Based Deep Linking**
   - Routes like `#/section/ipc-302`, `#/chapters`, and `#/bookmarks` work directly on GitHub Pages without server-side routing or 404 workarounds.

7. **Clean Editorial Design & Dual Themes**
   - Warm paper-like light theme with serif headings (`Charter`, `Georgia`) and high-contrast dark theme.
   - Auto-detects `prefers-color-scheme` with manual toggle stored in `localStorage`.

8. **Mobile-First & Accessible**
   - Mobile bottom navigation bar for quick one-thumb switching between Search, Chapters, Saved Sections, and Themes.
   - Semantic HTML5 landmarks, ARIA labels, live announcement regions, and `:focus-visible` styling.

---

## Project Structure

```text
BNS-Mapper/
├── index.html              # Main HTML entry point
├── assets/
│   └── favicon.svg         # Scales of justice vector icon
├── css/
│   ├── main.css            # Editorial law theme & responsive layout
│   └── print.css           # Print stylesheet for "My Sections" cheat sheet
├── js/
│   ├── app.js              # Bootstrap & event coordination
│   ├── router.js           # Client-side hash router
│   ├── search.js           # Fuse.js search engine with direction weighting
│   ├── storage.js          # LocalStorage bookmarks & theme management
│   └── ui.js               # Accessible DOM renderers & notifications
├── data/
│   ├── schema.json         # JSON Schema (Draft-07) for dataset
│   └── sections.json       # 40+ curated IPC-to-BNS mapping records
└── scripts/
    └── validate.js         # Node.js data integrity & schema validation script
```

---

## Data Schema & Validation

Every entry in `data/sections.json` follows `data/schema.json`:

```json
{
  "id": "ipc-302",
  "ipc": "302",
  "bns": "103(1)",
  "title": "Punishment for Murder",
  "chapter": "Offences Affecting the Human Body",
  "change": "renumbered",
  "old_text": "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.",
  "new_text": "Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.",
  "punishment_old": "Death penalty or imprisonment for life, and liable to fine.",
  "punishment_new": "Death penalty or imprisonment for life, and liable to fine.",
  "explanation": "Section 302 IPC has been renumbered to Section 103(1) of BNS.",
  "tags": ["murder", "punishment", "capital punishment", "life imprisonment"],
  "verified": false,
  "source": "The Bharatiya Nyaya Sanhita, 2023 (Act No. 45 of 2023), Gazette of India, Section 103(1)"
}
```

To validate the dataset:

```bash
node scripts/validate.js
```

---

## Enabling GitHub Pages

1. Go to repository **Settings** &rarr; **Pages** (under *Code and automation*).
2. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **`main`** / Folder: **`/(root)`**
3. Click **Save**.
4. The site will be live at:
   `https://datageniesk.github.io/BNS-Mapper/`

---

## Disclaimer

*Sample data — verify against the official Gazette of India before relying on it for legal proceedings or examinations.*
