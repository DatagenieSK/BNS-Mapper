# Contributing to BNS Mapper

Welcome! BNS Mapper is an open-source educational project made for law students and legal practitioners in India. **You do not need to know programming or web development to contribute.**

If you have spotted an inaccurate section mapping, a typo in statutory text, or want to contribute a new section or quiz question, follow this guide.

---

## 1. Quick Contribution via GitHub Website (No Coding Required)

You can edit files directly from your browser:

1. Navigate to [`data/sections.json`](./data/sections.json).
2. Click the pencil icon (✏️ **Edit this file**) in the top right corner.
3. Locate the section you wish to update or add a new entry following the template below.
4. Scroll down to **Commit changes**, enter a short summary (e.g. `Update Section 302 explanation`), and choose **Create a new branch for this commit and start a pull request**.
5. Click **Propose changes**.

---

## 2. Section Entry Template

When adding a section in `data/sections.json`, use this format:

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
  "explanation": "IPC Section 302 is renumbered to Section 103(1) of BNS.",
  "tags": ["murder", "punishment", "life imprisonment"],
  "verified": false,
  "source": "The Bharatiya Nyaya Sanhita, 2023, Section 103(1)"
}
```

### Change Types
Choose one of the following for `"change"`:
- `renumbered` — Text and elements remain largely identical, section number changed.
- `modified` — Substantive change in language, scope, fine, or prison duration.
- `merged` — Multiple provisions unified into a single section.
- `split` — One previous section divided across multiple sections.
- `new` — Brand new statutory provision not present in the old law.
- `omitted` — Omitted or repealed from the new code.

---

## 3. Submitting a Quiz Scenario

To add a scenario question:
1. Open [`data/quiz_scenarios.json`](./data/quiz_scenarios.json).
2. Follow the existing pattern with a clear practical case, 4 options, and the `correctIndex` (0 to 3).

---

## 4. Local Validation

If you have Node.js installed, test your changes before submitting:

```bash
node scripts/validate.js
```

---

## 5. Important Disclaimer

BNS Mapper is an educational study aid. Always cite and consult the official Gazette of India published by the Ministry of Law and Justice for court filings or formal citations.
