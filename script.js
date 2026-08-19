/* =========================================================
   Study Ledger — app logic
   Vanilla JS, persisted to localStorage. No build step needed.
   ========================================================= */

(() => {
  "use strict";

  const STORAGE_KEY = "study-ledger:v1";
  const SWATCHES = ["#35603A", "#C9982F", "#A13D3D", "#3C5A78", "#6B4E9B", "#3A7D6E"];

  const DEFAULT_SUBJECTS = [
    { id: "sub-1", name: "General", color: "#35603A" }
  ];

  /** @type {{subjects: Array, tasks: Array}} */
  let state = loadState();
  let activeSubject = "all";
  let sortMode = "due";
  let hideDone = false;

  // ---------- Persistence ----------

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.subjects) && Array.isArray(parsed.tasks)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("Could not read saved ledger, starting fresh.", err);
    }
    return { subjects: DEFAULT_SUBJECTS.slice(), tasks: [] };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Could not save ledger.", err);
    }
  }

  // ---------- Elements ----------

  const subjectListEl = document.getElementById("subjectList");
  const taskFormEl = document.getElementById("taskForm");
  const taskTitleEl = document.getElementById("taskTitle");
  const taskSubjectEl = document.getElementById("taskSubject");
  const taskDueEl = document.getElementById("taskDue");
  const taskPriorityEl = document.getElementById("taskPriority");
  const taskListEl = document.getElementById("taskList");
  const emptyStateEl = document.getElementById("emptyState");
  const hideDoneEl = document.getElementById("hideDone");
  const sortButtons = document.querySelectorAll(".sort-btn");

  const statOpen = document.getElementById("statOpen");
  const statDueSoon = document.getElementById("statDueSoon");
  const statDone = document.getElementById("statDone");
  const countAll = document.getElementById("countAll");

  const addSubjectBtn = document.getElementById("addSubjectBtn");
  const subjectDialog = document.getElementById("subjectDialog");
  const subjectForm = document.getElementById("subjectForm");
  const subjectNameEl = document.getElementById("subjectName");
  const subjectColorEl = document.getElementById("subjectColor");
  const cancelSubjectBtn = document.getElementById("cancelSubject");
  const colorRow = document.getElementById("colorRow");

  // ---------- Init ----------

  function init() {
    buildColorSwatches();
    renderSubjectOptions();
    renderSubjectDividers();
    renderTasks();
    bindEvents();
    setDefaultDueDate();
    initTimer();
  }

  function setDefaultDueDate() {
    const today = new Date();
    taskDueEl.min = toISODate(today);
    taskDueEl.value = toISODate(today);
  }

  function toISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // ---------- Subjects ----------

  function buildColorSwatches() {
    colorRow.innerHTML = "";
    SWATCHES.forEach((hex, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "color-swatch" + (i === 0 ? " selected" : "");
      btn.style.background = hex;
      btn.setAttribute("aria-label", "Choose color " + hex);
      btn.addEventListener("click", () => {
        subjectColorEl.value = hex;
        colorRow.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("selected"));
        btn.classList.add("selected");
      });
      colorRow.appendChild(btn);
    });
    subjectColorEl.value = SWATCHES[0];
  }

  function renderSubjectOptions() {
    taskSubjectEl.innerHTML = "";
    state.subjects.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      taskSubjectEl.appendChild(opt);
    });
  }

  function renderSubjectDividers() {
    // Remove all but the "All" item
    subjectListEl.querySelectorAll("[data-subject]:not([data-subject='all'])").forEach((el) => el.remove());

    state.subjects.forEach((s) => {
      const li = document.createElement("li");
      li.className = "divider-item editable";
      li.dataset.subject = s.id;
      li.style.setProperty("--tab-color", s.color);
      li.tabIndex = 0;
      li.innerHTML = `
        <span class="divider-tab" style="border-left:4px solid ${s.color}; padding-left:8px; margin-left:-12px;">${escapeHTML(s.name)}</span>
        <span class="divider-count">0</span>
      `;
      const removeBtn = document.createElement("button");
      removeBtn.className = "divider-remove";
      removeBtn.title = "Remove subject";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeSubject(s.id);
      });
      li.appendChild(removeBtn);

      li.addEventListener("click", () => setActiveSubject(s.id));
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setActiveSubject(s.id);
        }
      });

      subjectListEl.appendChild(li);
    });

    updateDividerCounts();
  }

  function setActiveSubject(id) {
    activeSubject = id;
    subjectListEl.querySelectorAll(".divider-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.subject === id);
    });
    renderTasks();
  }

  function removeSubject(id) {
    if (state.subjects.length <= 1) {
      alert("You need at least one subject divider.");
      return;
    }
    const hasTasks = state.tasks.some((t) => t.subjectId === id);
    if (hasTasks && !confirm("This subject has entries in the ledger. Remove it and its entries?")) {
      return;
    }
    state.subjects = state.subjects.filter((s) => s.id !== id);
    state.tasks = state.tasks.filter((t) => t.subjectId !== id);
    if (activeSubject === id) activeSubject = "all";
    saveState();
    renderSubjectOptions();
    renderSubjectDividers();
    renderTasks();
  }

  function updateDividerCounts() {
    const counts = {};
    state.tasks.forEach((t) => {
      if (t.done) return;
      counts[t.subjectId] = (counts[t.subjectId] || 0) + 1;
    });
    let total = 0;
    subjectListEl.querySelectorAll("[data-subject]").forEach((el) => {
      const id = el.dataset.subject;
      if (id === "all") return;
      const n = counts[id] || 0;
      total += n;
      const countEl = el.querySelector(".divider-count");
      if (countEl) countEl.textContent = String(n);
    });
    countAll.textContent = String(total);
  }

  // ---------- Tasks ----------

  function addTask(title, subjectId, due, priority) {
    state.tasks.push({
      id: "t-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      title,
      subjectId,
      due,
      priority,
      done: false,
      createdAt: Date.now()
    });
    saveState();
    renderTasks();
  }

  function toggleTask(id) {
    const t = state.tasks.find((x) => x.id === id);
    if (t) {
      t.done = !t.done;
      saveState();
      renderTasks();
    }
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter((x) => x.id !== id);
    saveState();
    renderTasks();
  }

  function getSubject(id) {
    return state.subjects.find((s) => s.id === id) || { name: "Unknown", color: "#999" };
  }

  function daysUntil(dueStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueStr + "T00:00:00");
    return Math.round((due - today) / 86400000);
  }

  function urgencyOf(task) {
    if (task.done) return "done";
    const d = daysUntil(task.due);
    if (d < 0) return "overdue";
    if (d <= 2) return "soon";
    return "normal";
  }

  function stampLabel(task) {
    if (task.done) return "Closed";
    const d = daysUntil(task.due);
    if (d < 0) return `${Math.abs(d)}d overdue`;
    if (d === 0) return "Due today";
    if (d === 1) return "Due tomorrow";
    return `Due in ${d}d`;
  }

  function renderTasks() {
    let visible = state.tasks.filter((t) => activeSubject === "all" || t.subjectId === activeSubject);
    if (hideDone) visible = visible.filter((t) => !t.done);

    visible.sort((a, b) => {
      if (sortMode === "due") return a.due.localeCompare(b.due);
      if (sortMode === "priority") {
        const rank = { high: 0, normal: 1, low: 2 };
        return rank[a.priority] - rank[b.priority] || a.due.localeCompare(b.due);
      }
      if (sortMode === "subject") {
        return getSubject(a.subjectId).name.localeCompare(getSubject(b.subjectId).name) || a.due.localeCompare(b.due);
      }
      return 0;
    });
    // Always float open items above closed ones within sort
    visible.sort((a, b) => Number(a.done) - Number(b.done));

    taskListEl.innerHTML = "";

    visible.forEach((t) => {
      const subject = getSubject(t.subjectId);
      const urgency = urgencyOf(t);
      const li = document.createElement("li");
      li.className = "task-row" + (t.done ? " done" : "");

      li.innerHTML = `
        <span class="row-check">
          <input type="checkbox" ${t.done ? "checked" : ""} aria-label="Mark ${escapeHTML(t.title)} as ${t.done ? "open" : "closed"}">
        </span>
        <span class="row-title">
          <span class="row-title-text">${escapeHTML(t.title)}</span>
          <span class="row-subject" style="background:${subject.color}22; color:${subject.color};">${escapeHTML(subject.name)}</span>
        </span>
        <span class="row-priority" data-p="${t.priority}">${t.priority}</span>
        <span class="row-stamp" data-urgency="${urgency}">${stampLabel(t)}</span>
        <span class="row-actions">
          <button type="button" class="delete-btn" title="Remove entry" aria-label="Remove ${escapeHTML(t.title)}">✕</button>
        </span>
      `;

      li.querySelector('input[type="checkbox"]').addEventListener("change", () => toggleTask(t.id));
      li.querySelector(".delete-btn").addEventListener("click", () => deleteTask(t.id));

      taskListEl.appendChild(li);
    });

    emptyStateEl.hidden = visible.length !== 0;
    updateStats();
    updateDividerCounts();
  }

  function updateStats() {
    const open = state.tasks.filter((t) => !t.done);
    const dueSoon = open.filter((t) => {
      const d = daysUntil(t.due);
      return d <= 2;
    });
    const done = state.tasks.filter((t) => t.done);

    statOpen.textContent = String(open.length);
    statDueSoon.textContent = String(dueSoon.length);
    statDone.textContent = String(done.length);
  }

  // ---------- Focus timer (Pomodoro-style) ----------

  const FOCUS_SECONDS = 25 * 60;
  const BREAK_SECONDS = 5 * 60;
  let timerSeconds = FOCUS_SECONDS;
  let timerMode = "Focus";
  let timerRunning = false;
  let timerHandle = null;

  const timerDisplay = document.getElementById("timerDisplay");
  const timerModeEl = document.getElementById("timerMode");
  const timerStartBtn = document.getElementById("timerStart");
  const timerResetBtn = document.getElementById("timerReset");

  function initTimer() {
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const m = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
    const s = String(timerSeconds % 60).padStart(2, "0");
    timerDisplay.textContent = `${m}:${s}`;
    timerModeEl.textContent = timerMode;
  }

  function tickTimer() {
    timerSeconds -= 1;
    if (timerSeconds <= 0) {
      // Switch modes
      timerMode = timerMode === "Focus" ? "Break" : "Focus";
      timerSeconds = timerMode === "Focus" ? FOCUS_SECONDS : BREAK_SECONDS;
      try {
        // Gentle audible cue without external assets
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 660;
        gain.gain.value = 0.05;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (err) {
        /* audio not available, ignore */
      }
    }
    updateTimerDisplay();
  }

  function startStopTimer() {
    if (timerRunning) {
      clearInterval(timerHandle);
      timerRunning = false;
      timerStartBtn.textContent = "Start";
    } else {
      timerHandle = setInterval(tickTimer, 1000);
      timerRunning = true;
      timerStartBtn.textContent = "Pause";
    }
  }

  function resetTimer() {
    clearInterval(timerHandle);
    timerRunning = false;
    timerMode = "Focus";
    timerSeconds = FOCUS_SECONDS;
    timerStartBtn.textContent = "Start";
    updateTimerDisplay();
  }

  // ---------- Events ----------

  function bindEvents() {
    taskFormEl.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = taskTitleEl.value.trim();
      if (!title) return;
      addTask(title, taskSubjectEl.value, taskDueEl.value, taskPriorityEl.value);
      taskTitleEl.value = "";
      taskTitleEl.focus();
    });

    document.querySelector('[data-subject="all"]').addEventListener("click", () => setActiveSubject("all"));

    sortButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        sortMode = btn.dataset.sort;
        sortButtons.forEach((b) => b.classList.toggle("active", b === btn));
        renderTasks();
      });
    });

    hideDoneEl.addEventListener("change", () => {
      hideDone = hideDoneEl.checked;
      renderTasks();
    });

    addSubjectBtn.addEventListener("click", () => {
      subjectNameEl.value = "";
      subjectDialog.showModal();
      subjectNameEl.focus();
    });

    cancelSubjectBtn.addEventListener("click", () => subjectDialog.close());

    subjectForm.addEventListener("submit", () => {
      const name = subjectNameEl.value.trim();
      if (!name) return;
      state.subjects.push({
        id: "sub-" + Date.now(),
        name,
        color: subjectColorEl.value
      });
      saveState();
      renderSubjectOptions();
      renderSubjectDividers();
      renderTasks();
    });

    timerStartBtn.addEventListener("click", startStopTimer);
    timerResetBtn.addEventListener("click", resetTimer);
  }

  // ---------- Utilities ----------

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  init();
})();
