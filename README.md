# Study Ledger

A student study planner styled like a library card catalog crossed with a ledger book. Track assignments by subject, due date, and priority, and run a focus timer while you work.

## Features

- **Subjects as dividers** — add a "divider" per class/subject, each with its own color tab.
- **Ledger entries** — file tasks with a title, subject, due date, and priority.
- **Due-date stamps** — each entry gets a stamp showing days until due, turning gold when due soon and red when overdue.
- **Sort & filter** — sort by due date, priority, or subject; hide closed (completed) entries.
- **Focus timer** — a 25/5 minute focus/break timer in the sidebar.
- **Saved automatically** — everything is stored in your browser's `localStorage`, so your ledger persists between visits (per browser, no account needed).

## Running it

No build step or install required — it's plain HTML, CSS, and JavaScript.

1. Open the folder in VS Code.
2. Install the **Live Server** extension (recommended), then right-click `index.html` → **Open with Live Server**.
   - Or simply double-click `index.html` to open it directly in your browser.

## File structure

```
study-planner/
├── index.html      # App structure
├── style.css        # Design system (card catalog / ledger theme)
├── script.js         # App logic (vanilla JS, localStorage)
└── README.md
```

## Notes

- Data is stored locally per browser. Clearing browser data/localStorage will reset your ledger.
- Everything runs client-side — no server or dependencies needed.
