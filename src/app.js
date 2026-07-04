(function () {
  const SUPABASE_MODULE = "https://esm.sh/@supabase/supabase-js@2?bundle";
  const APP_TITLE = "TimberTimer";
  const STORAGE_SESSIONS = "timbertimer:sessions:v1";
  const STORAGE_TIMER = "timbertimer:timer:v1";
  const STORAGE_SESSION_NAME = "timbertimer:session-name:v1";
  const STORAGE_SOUND_ENABLED = "timbertimer:sound-enabled:v1";
  const STORAGE_TIMER_MODE = "timbertimer:timer-mode:v1";
  const STORAGE_SOUND_VOLUME = "timbertimer:sound-volume:v1";
  const STORAGE_TREE_PREF = "timbertimer:tree-pref:v1";
  const STORAGE_NOTES = "timbertimer:notes:v1";
  const STORAGE_NOTES_ORDER = "timbertimer:notes-order:v1";
  const DEFAULT_DURATION = 25;
  const TREE_SPECIES = [
    { id: "canopy", label: "canopy tree" },
    { id: "palm", label: "palm tree" },
    { id: "pine", label: "pine tree" },
    { id: "bamboo", label: "bamboo stand" },
    { id: "fern", label: "fern tree" },
    { id: "kapok", label: "kapok tree" },
    { id: "mangrove", label: "mangrove tree" },
  ];
  const WILTED_TREE = { id: "wilted", label: "wilted sprout" };

  let dragNoteId = null;

  const els = {
    modeLabel: document.getElementById("modeLabel"),
    focusForm: document.getElementById("focusForm"),
    sessionTitle: document.getElementById("sessionTitle"),
    sessionTitleSuggestions: document.getElementById("sessionTitleSuggestions"),
    durationInput: document.getElementById("durationInput"),
    durationButtons: Array.from(document.querySelectorAll("[data-duration]")),
    timerState: document.getElementById("timerState"),
    timerProgressLabel: document.getElementById("timerProgressLabel"),
    timerDisplay: document.getElementById("timerDisplay"),
    progressRing: document.querySelector(".progress-ring"),
    progressRingFill: document.getElementById("progressRingFill"),
    growthStage: document.querySelector(".growth-stage"),
    plant: document.querySelector(".plant"),
    startButton: document.getElementById("startButton"),
    finishButton: document.getElementById("finishButton"),
    soundToggleButton: document.getElementById("soundToggleButton"),
    recordsPanel: document.getElementById("recordsPanel"),
    accountButton: document.getElementById("accountButton"),
    accountDialog: document.getElementById("accountDialog"),
    closeAccountDialogButton: document.getElementById("closeAccountDialogButton"),
    navAuthStatus: document.getElementById("navAuthStatus"),
    todayStat: document.getElementById("todayStat"),
    totalStat: document.getElementById("totalStat"),
    restState: document.getElementById("restState"),
    restModeLabel: document.getElementById("restModeLabel"),
    restDisplay: document.getElementById("restDisplay"),
    restStartButton: document.getElementById("restStartButton"),
    restResetButton: document.getElementById("restResetButton"),
    weekRange: document.getElementById("weekRange"),
    weekTreeCount: document.getElementById("weekTreeCount"),
    weekFocusTime: document.getElementById("weekFocusTime"),
    weekForest: document.getElementById("weekForest"),
    treePicker: document.getElementById("treePicker"),
    notesList: document.getElementById("notesList"),
    notesForm: document.getElementById("notesForm"),
    notesInput: document.getElementById("notesInput"),
    prevWeekButton: document.getElementById("prevWeekButton"),
    thisWeekButton: document.getElementById("thisWeekButton"),
    nextWeekButton: document.getElementById("nextWeekButton"),
    grovePanelKicker: document.getElementById("grovePanelKicker"),
    groveTodayButton: document.getElementById("groveTodayButton"),
    groveWeekButton: document.getElementById("groveWeekButton"),
    groveMonthButton: document.getElementById("groveMonthButton"),
    searchInput: document.getElementById("searchInput"),
    statusFilter: document.getElementById("statusFilter"),
    recordsList: document.getElementById("recordsList"),
    emptyState: document.getElementById("emptyState"),
    addRecordButton: document.getElementById("addRecordButton"),
    syncBadge: document.getElementById("syncBadge"),
    accountStatus: document.getElementById("accountStatus"),
    authActions: document.getElementById("authActions"),
    googleSignInButton: document.getElementById("googleSignInButton"),
    signedInActions: document.getElementById("signedInActions"),
    signOutButton: document.getElementById("signOutButton"),
    recordDialog: document.getElementById("recordDialog"),
    recordForm: document.getElementById("recordForm"),
    dialogTitle: document.getElementById("dialogTitle"),
    recordIdInput: document.getElementById("recordIdInput"),
    recordTitleInput: document.getElementById("recordTitleInput"),
    recordStartedInput: document.getElementById("recordStartedInput"),
    recordStatusInput: document.getElementById("recordStatusInput"),
    recordDurationInput: document.getElementById("recordDurationInput"),
    recordActualInput: document.getElementById("recordActualInput"),
    saveRecordButton: document.getElementById("saveRecordButton"),
    recordTreeInput: document.getElementById("recordTreeInput"),
    toast: document.getElementById("toast"),
    modeCountdownButton: document.getElementById("modeCountdownButton"),
    modeStopwatchButton: document.getElementById("modeStopwatchButton"),
    durationField: document.getElementById("durationField"),
    deleteAllDataButton: document.getElementById("deleteAllDataButton"),
    volumeRow: document.getElementById("volumeRow"),
    volumeSlider: document.getElementById("volumeSlider"),
    volumeLabel: document.getElementById("volumeLabel"),
  };

  const state = {
    supabase: null,
    supabaseConfigured: false,
    user: null,
    dataMode: "local",
    sessions: [],
    selectedDuration: DEFAULT_DURATION,
    soundEnabled: loadSoundPreference(),
    soundVolume: loadSoundVolume(),
    masterGainNode: null,
    timerMode: loadTimerMode(),
    selectedTreeId: "pine",
    notes: [],
    audioContext: null,
    activeSoundMasters: [],
    finishSoonSoundTimerId: null,
    weekStart: startOfWeek(new Date()),
    groveView: "week",
    monthStart: startOfMonth(new Date()),
    timer: null,
    restTimer: null,
    tickId: null,
    toastId: null,
    lastCloudTimerSyncAt: 0,
    lastCloudNotesSyncAt: 0,
    cloudTimerSyncing: false,
    timerCompleting: false,
    activeTimerSyncWarningShown: false,
  };

  init();

  async function init() {
    bindEvents();
    // Phase 1: paint visuals from local storage immediately so nothing is stuck
    // on "Loading" while the Supabase library downloads from its CDN. The live
    // timer is hydrated later (phase 2) so an expired timer is reconciled and
    // completed exactly once, with the correct local/cloud context.
    await loadSessions();
    hydrateSessionName();
    await loadNotes();
    renderAll();
    startTicker();
    registerServiceWorker();

    // Phase 2: bring up cloud, reload from it if signed in, then hydrate timers.
    await initSupabase();
    if (state.user) {
      await loadSessions();
      await loadNotes();
    }
    await hydrateTimer();
    if (state.timer?.selectedTreeId) {
      state.selectedTreeId = state.timer.selectedTreeId;
    } else {
      state.selectedTreeId = resolveTreeForName(els.sessionTitle.value);
    }
    await hydrateRestTimer();
    renderAll();
  }

  // Load every piece of remote/local state and repaint. Shared by startup and
  // by auth changes; only startup also seeds the session-name field.
  async function reloadState({ hydrateName = false } = {}) {
    await loadSessions();
    if (hydrateName) hydrateSessionName();
    await hydrateTimer();
    // A running timer fixes the species; otherwise re-resolve from the current
    // name so a freshly-loaded (e.g. just-signed-in) history takes effect.
    if (state.timer?.selectedTreeId) {
      state.selectedTreeId = state.timer.selectedTreeId;
    } else {
      state.selectedTreeId = resolveTreeForName(els.sessionTitle.value);
    }
    await hydrateRestTimer();
    await loadNotes();
    renderAll();
  }

  function bindEvents() {
    els.durationButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const minutes = Number(button.dataset.duration);
        setDuration(minutes);
      });
    });

    els.sessionTitle.addEventListener("input", () => {
      rememberSessionName();
      state.selectedTreeId = resolveTreeForName(els.sessionTitle.value.trim());
      renderTreePicker();
      renderTimer();
    });

    els.treePicker.addEventListener("change", () => {
      state.selectedTreeId = els.treePicker.value;
      saveTreePref(els.sessionTitle.value.trim() || "deep focus", state.selectedTreeId);
      renderTimer();
    });

    els.durationInput.addEventListener("input", () => {
      const minutes = cleanMinutes(els.durationInput.value, DEFAULT_DURATION, 1);
      state.selectedDuration = minutes;
      updateDurationButtons();
      if (!state.timer) {
        updateTimerDisplay(minutes * 60, 0);
      }
    });

    els.modeCountdownButton.addEventListener("click", () => setTimerMode("countdown"));
    els.modeStopwatchButton.addEventListener("click", () => setTimerMode("stopwatch"));
    els.deleteAllDataButton.addEventListener("click", deleteAllData);

    els.volumeSlider.addEventListener("input", () => {
      state.soundVolume = clamp(Number(els.volumeSlider.value) / 100, 0, 2);
      saveSoundVolume();
      if (state.masterGainNode) {
        state.masterGainNode.gain.value = state.soundVolume;
      }
      renderVolumeControl();
    });

    els.volumeSlider.addEventListener("change", () => {
      playCompletionSound({ preview: true });
    });

    els.startButton.addEventListener("click", startOrResumeTimer);
    els.finishButton.addEventListener("click", finishCurrentSession);
    els.soundToggleButton.addEventListener("click", toggleTimerSound);
    els.restStartButton.addEventListener("click", startRestTimer);
    els.restResetButton.addEventListener("click", resetRestTimer);

    els.prevWeekButton.addEventListener("click", () => changeWeek(-1));
    els.nextWeekButton.addEventListener("click", () => changeWeek(1));
    els.thisWeekButton.addEventListener("click", () => {
      if (state.groveView === "month") {
        state.monthStart = startOfMonth(new Date());
      } else {
        state.weekStart = startOfWeek(new Date());
      }
      renderWeekGrove();
    });
    els.notesForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = els.notesInput.value.trim();
      if (!text) return;
      els.notesInput.value = "";
      await addNote(text);
    });

    els.groveTodayButton.addEventListener("click", () => setGroveView("today"));
    els.groveWeekButton.addEventListener("click", () => setGroveView("week"));
    els.groveMonthButton.addEventListener("click", () => setGroveView("month"));

    els.searchInput.addEventListener("input", renderRecords);
    els.statusFilter.addEventListener("change", renderRecords);

    els.recordsList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const record = state.sessions.find((item) => item.id === button.dataset.id);
      if (!record) return;

      if (button.dataset.action === "edit") {
        openRecordDialog(record);
      }

      if (button.dataset.action === "delete") {
        deleteRecord(record);
      }
    });

    els.addRecordButton.addEventListener("click", () => openRecordDialog());
    els.saveRecordButton.addEventListener("click", saveDialogRecord);
    els.recordTitleInput.addEventListener("input", () => {
      els.recordTreeInput.value = resolveTreeForName(els.recordTitleInput.value.trim());
    });

    els.googleSignInButton.addEventListener("click", signInWithGoogle);
    els.signOutButton.addEventListener("click", signOut);
    els.accountButton.addEventListener("click", openAccountDialog);
    els.closeAccountDialogButton.addEventListener("click", closeAccountDialog);
    els.accountDialog.addEventListener("click", (event) => {
      if (event.target === els.accountDialog) closeAccountDialog();
    });

    document.querySelectorAll("[data-panel-jump]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.panelJump === "records") {
          els.recordsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  async function initSupabase() {
    const config = window.TIMBERTIMER_SUPABASE || window.CANOPY_FOCUS_SUPABASE || window.JUNGLE_FOCUS_SUPABASE || {};
    state.supabaseConfigured = Boolean(config.url && config.anonKey);

    if (!state.supabaseConfigured) return;

    // Show the sign-in affordance right away, before the CDN library loads.
    renderAccount();

    try {
      const { createClient } = await import(SUPABASE_MODULE);
      state.supabase = createClient(config.url, config.anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
        },
      });

      const { data } = await state.supabase.auth.getSession();
      state.user = data.session ? data.session.user : null;
      state.dataMode = state.user ? "cloud" : "local";

      state.supabase.auth.onAuthStateChange(async (event, session) => {
        // init() already handles the very first load; only react to real
        // sign-in / sign-out afterwards so the timer isn't hydrated twice.
        if (event === "INITIAL_SESSION") return;
        state.user = session ? session.user : null;
        state.dataMode = state.user ? "cloud" : "local";
        await reloadState();
      });
    } catch (error) {
      state.supabase = null;
      state.supabaseConfigured = false;
      state.dataMode = "local";
      showToast("Cloud sync could not load. Local records are still available.");
      console.warn(error);
      renderAccount();
    }
  }

  async function loadSessions() {
    if (canUseCloud()) {
      const { data, error } = await state.supabase
        .from("focus_sessions")
        .select("*")
        .order("started_at", { ascending: false });

      if (!error) {
        state.sessions = data.map(normalizeRecord);
        state.dataMode = "cloud";
        return;
      }

      state.dataMode = "local";
      showToast("Cloud table is not ready. Using local records.");
      console.warn(error);
    }

    state.sessions = loadLocalSessions();
  }

  async function loadNotes() {
    if (canUseCloud()) {
      const { data, error } = await state.supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) { state.notes = applyStoredNotesOrder(data || []); return; }
      console.warn(error);
    }
    state.notes = loadLocalNotes();
  }

  function loadLocalNotes() {
    try { return JSON.parse(localStorage.getItem(STORAGE_NOTES) || "[]"); }
    catch { return []; }
  }

  function saveLocalNotes() {
    localStorage.setItem(STORAGE_NOTES, JSON.stringify(state.notes));
  }

  function saveNotesOrder() {
    localStorage.setItem(STORAGE_NOTES_ORDER, JSON.stringify(state.notes.map((n) => n.id)));
  }

  function applyStoredNotesOrder(notes) {
    try {
      const order = JSON.parse(localStorage.getItem(STORAGE_NOTES_ORDER) || "[]");
      if (!order.length) return notes;
      const byId = new Map(notes.map((n) => [n.id, n]));
      const ordered = order.map((id) => byId.get(id)).filter(Boolean);
      const orderSet = new Set(order);
      const remaining = notes.filter((n) => !orderSet.has(n.id));
      return [...ordered, ...remaining];
    } catch {
      return notes;
    }
  }

  async function addNote(text) {
    const now = new Date().toISOString();
    const note = { id: createId(), text, done: false, created_at: now, updated_at: now };
    state.notes.unshift(note);
    if (canUseCloud()) {
      const { error } = await state.supabase.from("notes").insert({ ...note, user_id: state.user.id });
      if (error) console.warn(error);
    } else {
      saveLocalNotes();
    }
    renderNotes();
  }

  async function toggleNote(id) {
    const note = state.notes.find((n) => n.id === id);
    if (!note) return;
    note.done = !note.done;
    note.updated_at = new Date().toISOString();
    if (canUseCloud()) {
      const { error } = await state.supabase.from("notes").update({ done: note.done, updated_at: note.updated_at }).eq("id", id);
      if (error) console.warn(error);
    } else {
      saveLocalNotes();
    }
    renderNotes();
  }

  async function deleteNote(id) {
    state.notes = state.notes.filter((n) => n.id !== id);
    if (canUseCloud()) {
      const { error } = await state.supabase.from("notes").delete().eq("id", id);
      if (error) console.warn(error);
    } else {
      saveLocalNotes();
    }
    renderNotes();
  }

  async function refreshCloudNotes() {
    if (!canUseCloud()) return;
    state.lastCloudNotesSyncAt = Date.now();
    const { data, error } = await state.supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return;
    const reordered = applyStoredNotesOrder(data);
    const sig = (notes) => JSON.stringify(notes.map((n) => ({ id: n.id, text: n.text, done: n.done, updated_at: n.updated_at })));
    if (sig(reordered) !== sig(state.notes)) {
      state.notes = reordered;
      renderNotes();
    }
  }

  function renderNotes() {
    const undone = state.notes.filter((n) => !n.done);
    const done = state.notes.filter((n) => n.done);
    const ordered = [...undone, ...done];
    els.notesList.replaceChildren();

    if (!ordered.length) {
      const empty = document.createElement("li");
      empty.className = "notes-empty";
      empty.textContent = "No tasks yet.";
      els.notesList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    ordered.forEach((note) => fragment.appendChild(createNoteEl(note)));
    els.notesList.appendChild(fragment);
    refreshIcons();
  }

  function createNoteEl(note) {
    const li = document.createElement("li");
    li.className = "note-item" + (note.done ? " is-done" : "");
    li.draggable = true;
    li.dataset.noteId = note.id;

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.setAttribute("aria-hidden", "true");
    handle.innerHTML = '<i data-lucide="grip-vertical"></i>';

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "note-checkbox";
    checkbox.checked = note.done;
    checkbox.setAttribute("aria-label", note.done ? "Mark incomplete" : "Mark complete");
    checkbox.addEventListener("change", () => toggleNote(note.id));

    const textEl = document.createElement("span");
    textEl.className = "note-text";
    textEl.textContent = note.text;

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "note-delete";
    delBtn.title = "Delete task";
    delBtn.innerHTML = '<i data-lucide="x"></i>';
    delBtn.addEventListener("click", () => deleteNote(note.id));

    li.addEventListener("dragstart", (e) => {
      dragNoteId = note.id;
      e.dataTransfer.effectAllowed = "move";
      requestAnimationFrame(() => li.classList.add("is-dragging"));
    });

    li.addEventListener("dragend", () => {
      dragNoteId = null;
      li.classList.remove("is-dragging");
      els.notesList.querySelectorAll(".note-item").forEach((el) => {
        el.classList.remove("drag-over-top", "drag-over-bottom");
      });
    });

    li.addEventListener("dragover", (e) => {
      if (!dragNoteId || dragNoteId === note.id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const mid = li.getBoundingClientRect().top + li.offsetHeight / 2;
      els.notesList.querySelectorAll(".note-item").forEach((el) => {
        el.classList.remove("drag-over-top", "drag-over-bottom");
      });
      li.classList.add(e.clientY < mid ? "drag-over-top" : "drag-over-bottom");
    });

    li.addEventListener("dragleave", (e) => {
      if (!li.contains(e.relatedTarget)) {
        li.classList.remove("drag-over-top", "drag-over-bottom");
      }
    });

    li.addEventListener("drop", (e) => {
      if (!dragNoteId || dragNoteId === note.id) return;
      e.preventDefault();
      li.classList.remove("drag-over-top", "drag-over-bottom");
      const fromIdx = state.notes.findIndex((n) => n.id === dragNoteId);
      const toIdx = state.notes.findIndex((n) => n.id === note.id);
      if (fromIdx === -1 || toIdx === -1) return;
      const mid = li.getBoundingClientRect().top + li.offsetHeight / 2;
      const insertBefore = e.clientY < mid;
      const [moved] = state.notes.splice(fromIdx, 1);
      const newTo = state.notes.findIndex((n) => n.id === note.id);
      state.notes.splice(insertBefore ? newTo : newTo + 1, 0, moved);
      saveNotesOrder();
      renderNotes();
    });

    li.append(handle, checkbox, textEl, delBtn);
    return li;
  }

  async function createRecord(record) {
    const normalized = normalizeRecord(record);

    if (canUseCloud()) {
      const { data, error } = await state.supabase
        .from("focus_sessions")
        .insert(toCloudRecord(normalized))
        .select()
        .single();

      if (error) {
        showToast("Cloud save failed. Saved locally.");
        console.warn(error);
        addLocalRecord(normalized);
        state.sessions = loadLocalSessions();
        renderAll();
        return normalized;
      }

      const saved = normalizeRecord(data);
      state.sessions = [saved, ...state.sessions.filter((item) => item.id !== saved.id)];
      renderAll();
      return saved;
    }

    addLocalRecord(normalized);
    state.sessions = loadLocalSessions();
    renderAll();
    return normalized;
  }

  async function updateRecord(id, changes) {
    const next = normalizeRecord({
      ...state.sessions.find((item) => item.id === id),
      ...changes,
      updated_at: new Date().toISOString(),
    });

    if (canUseCloud()) {
      const { data, error } = await state.supabase
        .from("focus_sessions")
        .update(toCloudRecord(next, true))
        .eq("id", id)
        .select()
        .single();

      if (error) {
        showToast("Cloud update failed.");
        console.warn(error);
        return;
      }

      state.sessions = state.sessions.map((item) => (item.id === id ? normalizeRecord(data) : item));
      renderAll();
      return;
    }

    const local = loadLocalSessions().map((item) => (item.id === id ? next : item));
    saveLocalSessions(local);
    state.sessions = local;
    renderAll();
  }

  async function deleteRecord(record) {
    const confirmed = window.confirm(`Delete "${record.title}"?`);
    if (!confirmed) return;

    if (canUseCloud()) {
      const { error } = await state.supabase.from("focus_sessions").delete().eq("id", record.id);
      if (error) {
        showToast("Cloud delete failed.");
        console.warn(error);
        return;
      }
    } else {
      saveLocalSessions(loadLocalSessions().filter((item) => item.id !== record.id));
    }

    state.sessions = state.sessions.filter((item) => item.id !== record.id);
    renderAll();
    showToast("Record deleted.");
  }

  async function startOrResumeTimer() {
    if (state.timer) return;

    const title = els.sessionTitle.value.trim() || "Deep focus";
    rememberSessionName(title);
    state.finishSoonSoundTimerId = null;

    const isStopwatch = state.timerMode === "stopwatch";
    // Stopwatch counts up with no goal, so we park its "end" 24h out.
    const minutes = isStopwatch ? 0 : cleanMinutes(els.durationInput.value, state.selectedDuration, 1);
    const durationSeconds = isStopwatch ? 86400 : minutes * 60;
    if (!isStopwatch) state.selectedDuration = minutes;
    const now = Date.now();

    state.timer = {
      id: createId(),
      mode: isStopwatch ? "stopwatch" : "countdown",
      status: "running",
      title,
      selectedTreeId: state.selectedTreeId,
      durationMinutes: minutes,
      durationSeconds: isStopwatch ? 0 : durationSeconds,
      startedAt: new Date(now).toISOString(),
      endAt: now + durationSeconds * 1000,
      remainingSeconds: durationSeconds,
      cloudSynced: false,
    };

    persistTimer();
    if (!isStopwatch) primeCompletionSound();
    renderTimer();
    renderTimerModeToggle();
    showToast(isStopwatch ? "Stopwatch started." : "Session started.");
    await saveActiveTimerToCloud();
  }

  async function completeTimer(status) {
    if (!state.timer || state.timerCompleting) return;

    state.timerCompleting = true;
    const timer = state.timer;
    try {
      const claimed = await claimActiveTimer(timer);
      if (!claimed) {
        stopActiveTimerSounds();
        state.timer = null;
        state.finishSoonSoundTimerId = null;
        persistTimer();
        await loadSessions();
        renderAll();
        showToast("Timer already finished on another device.");
        return;
      }

      const isStopwatch = timer.mode === "stopwatch";
      const elapsedSeconds = getElapsedSeconds();
      const actualMinutes =
        status === "completed"
          ? Math.max(1, Math.round(elapsedSeconds / 60))
          : Math.max(0, Math.round(elapsedSeconds / 60));
      const endedAt = new Date().toISOString();
      const record = {
        id: createId(),
        title: timer.title,
        duration_minutes: isStopwatch ? actualMinutes : timer.durationMinutes,
        actual_minutes: isStopwatch
          ? actualMinutes
          : (status === "completed" && elapsedSeconds >= timer.durationSeconds - 1
              ? timer.durationMinutes
              : actualMinutes),
        status,
        started_at: timer.startedAt,
        ended_at: endedAt,
        tree_kind: pickTreeKind(timer.title, status, timer.selectedTreeId),
        created_at: endedAt,
        updated_at: endedAt,
      };

      if (status === "completed") {
        playCompletionSound();
      } else {
        stopActiveTimerSounds();
      }

      state.timer = null;
      state.finishSoonSoundTimerId = null;
      persistTimer();
      await createRecord(record);
      renderTimer();
      showToast(status === "completed" ? "Session planted." : "Session recorded as abandoned.");
    } finally {
      state.timerCompleting = false;
    }
  }

  function finishCurrentSession() {
    if (!state.timer) return;
    if (state.timer.mode === "stopwatch") {
      completeTimer("completed");
      return;
    }
    const status = getRemainingSeconds() <= 0 ? "completed" : "abandoned";
    completeTimer(status);
  }

  async function startRestTimer() {
    if (state.restTimer) return;

    state.restTimer = { startedAt: Date.now() };
    renderRestTimer();
    await saveRestTimerToCloud();
  }

  async function resetRestTimer() {
    state.restTimer = null;
    renderRestTimer();
    await deleteRestTimerFromCloud();
  }

  async function hydrateTimer() {
    try {
      const saved = readStoredTimer();

      if (canUseCloud()) {
        const activeTimerState = await fetchActiveTimerState();
        const cloudTimer = activeTimerState.timer;

        if (activeTimerState.ok && !cloudTimer) {
          const currentTimer = normalizeTimer(state.timer);

          if (currentTimer && !currentTimer.cloudSynced) {
            state.timer = currentTimer;
            persistTimer();
            await saveActiveTimerToCloud();
            if (getRemainingSeconds() <= 0) {
              await completeTimer("completed");
            }
            return;
          }

          state.timer = null;
          persistTimer();
          return;
        }

        if (cloudTimer) {
          state.timer = cloudTimer;
          persistTimer();
          if (getRemainingSeconds() <= 0) {
            await completeTimer("completed");
          }
          return;
        }

        state.timer = normalizeTimer(state.timer || saved);
        if (state.timer) {
          persistTimer();
          await saveActiveTimerToCloud();
          if (getRemainingSeconds() <= 0) {
            await completeTimer("completed");
          }
          return;
        }

        persistTimer();
        return;
      }

      state.timer = normalizeTimer(saved);
      if (state.timer && getRemainingSeconds() <= 0) {
        await completeTimer("completed");
      }
    } catch (error) {
      localStorage.removeItem(STORAGE_TIMER);
      console.warn(error);
    }
  }

  function startTicker() {
    window.clearInterval(state.tickId);
    state.tickId = window.setInterval(() => {
      if (state.timer && state.timer.status === "running") {
        const remainingSeconds = getRemainingSeconds();
        if (remainingSeconds > 0 && remainingSeconds <= 10) {
          playFinishSoonSound(remainingSeconds);
        }

        if (remainingSeconds <= 0) {
          completeTimer("completed");
        }
      }

      if (canUseCloud() && Date.now() - state.lastCloudTimerSyncAt > 15000) {
        refreshCloudActiveTimer();
        refreshCloudRestTimer();
      }

      if (canUseCloud() && Date.now() - state.lastCloudNotesSyncAt > 15000) {
        refreshCloudNotes();
      }

      if (state.timer) {
        renderTimer();
      }
      renderRestTimer();
    }, 1000);
  }

  function renderAll() {
    renderAccount();
    renderSessionSuggestions();
    renderStats();
    renderWeekGrove();
    renderRecords();
    renderTimer();
    renderRestTimer();
    renderSoundToggle();
    renderVolumeControl();
    renderTimerModeToggle();
    renderTreePicker();
    renderNotes();
    refreshIcons();
  }

  function renderTimer() {
    const timer = state.timer;
    updateDocumentTitle();

    // Reflect an active timer's identity in the UI. This matters across devices:
    // when a timer started elsewhere is adopted here, show its name and tree.
    if (timer) {
      if (els.sessionTitle.value !== timer.title) {
        els.sessionTitle.value = timer.title;
        rememberSessionName(timer.title);
      }
      if (timer.selectedTreeId) state.selectedTreeId = timer.selectedTreeId;
    }

    const isStopwatchMode = timer ? timer.mode === "stopwatch" : state.timerMode === "stopwatch";
    els.progressRing.style.visibility = isStopwatchMode ? "hidden" : "visible";

    if (timer && timer.mode === "stopwatch") {
      const elapsedSeconds = Math.floor(getElapsedSeconds());
      updateTimerDisplay(elapsedSeconds, 0);
      const elapsedMin = Math.floor(elapsedSeconds / 60);
      els.timerProgressLabel.textContent = `${elapsedMin}m`;
      els.timerState.textContent = "Growing";
      els.startButton.disabled = true;
      els.finishButton.disabled = false;
      setFormDisabled(true);
      return;
    }

    const remainingSeconds = timer ? getRemainingSeconds() : state.selectedDuration * 60;
    const durationSeconds = timer ? timer.durationSeconds : state.selectedDuration * 60;
    const progress = durationSeconds ? clamp(1 - remainingSeconds / durationSeconds, 0, 1) : 0;

    updateTimerDisplay(remainingSeconds, progress);

    if (!timer) {
      const isStopwatch = state.timerMode === "stopwatch";
      els.timerState.textContent = "Ready";
      els.timerDisplay.textContent = isStopwatch ? "00:00" : formatClock(state.selectedDuration * 60);
      els.startButton.disabled = false;
      els.finishButton.disabled = true;
      setFormDisabled(false);
      return;
    }

    els.timerState.textContent = "Growing";
    els.startButton.disabled = true;
    els.finishButton.disabled = false;
    setFormDisabled(true);
  }

  function renderSessionSuggestions() {
    const fragment = document.createDocumentFragment();
    const seen = new Set();

    sortedSessions().forEach((record) => {
      const title = (record.title || "").trim();
      const key = title.toLowerCase();
      if (!title || seen.has(key)) return;

      seen.add(key);
      const option = document.createElement("option");
      option.value = title;
      fragment.appendChild(option);
    });

    els.sessionTitleSuggestions.replaceChildren(fragment);
  }

  function renderSoundToggle() {
    const label = state.soundEnabled ? "Sound on" : "Sound off";
    const icon = state.soundEnabled ? "volume-2" : "volume-x";
    // This is the one button whose icon actually changes, so rebuild + refresh.
    setButtonLabel(els.soundToggleButton, label, icon);
    els.soundToggleButton.setAttribute("aria-pressed", String(state.soundEnabled));
    els.soundToggleButton.title = `Timer ${label.toLowerCase()}`;
    refreshIcons();
  }

  function renderRestTimer() {
    const elapsedSeconds = state.restTimer ? getRestElapsedSeconds() : 0;
    const isRunning = Boolean(state.restTimer);

    els.restDisplay.textContent = formatClock(elapsedSeconds);
    els.restState.textContent = isRunning ? "Resting" : "Rest stopwatch";
    els.restModeLabel.textContent = "Elapsed";
    els.restStartButton.disabled = isRunning;
    els.restResetButton.disabled = !isRunning;
    updateDocumentTitle();
  }

  function updateDocumentTitle() {
    if (state.timer) {
      // Countdown shows its remaining time in the tab; the stopwatch does not.
      document.title = state.timer.mode === "stopwatch"
        ? `Focus running | ${APP_TITLE}`
        : `${formatClock(getRemainingSeconds())} Focus | ${APP_TITLE}`;
      return;
    }

    if (state.restTimer) {
      document.title = `${formatClock(getRestElapsedSeconds())} Rest | ${APP_TITLE}`;
      return;
    }

    document.title = `Ready | ${APP_TITLE}`;
  }

  const RING_CIRCUMFERENCE = 2 * Math.PI * 86;

  function updateTimerDisplay(remainingSeconds, progress) {
    els.timerDisplay.textContent = formatClock(remainingSeconds);
    els.timerProgressLabel.textContent = `${Math.round(progress * 100)}%`;
    els.growthStage.style.setProperty("--growth", String(Math.max(0.08, progress)));
    els.progressRingFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));
    renderActiveTree();
  }

  // Smooth growth signal for the active tree, independent of the progress ring.
  // Countdown grows toward its goal; the stopwatch grows over its first hour.
  function getActiveTreeGrowth() {
    const timer = state.timer;
    if (!timer) return 0.08;
    if (timer.mode === "stopwatch") {
      return clamp(getElapsedSeconds() / 3600, 0.08, 1);
    }
    return timer.durationSeconds
      ? clamp(1 - getRemainingSeconds() / timer.durationSeconds, 0.08, 1)
      : 0.08;
  }

  function renderActiveTree() {
    const title = state.timer ? state.timer.title : els.sessionTitle.value;
    const elapsedMinutes = state.timer ? getElapsedSeconds() / 60 : 0;
    const growthStage = getFocusGrowthStage(elapsedMinutes);
    const activeStageScales = [0.84, 0.96, 1.08, 1.2];
    const progressScale = 0.25 + getActiveTreeGrowth() * 0.82;
    const speciesId = state.timer?.selectedTreeId || state.selectedTreeId;
    const species = TREE_SPECIES.find((s) => s.id === speciesId) || TREE_SPECIES.find((s) => s.id === "pine");
    const palette = getTreePalette(title);

    const treeKey = `${species.id}|${palette.leafA}|${palette.barkA}`;
    if (els.plant.dataset.treeKey !== treeKey) {
      els.plant.innerHTML = buildTreeSVG(species.id, palette);
      els.plant.dataset.treeKey = treeKey;
    }
    els.plant.className = "plant";
    els.growthStage.dataset.tree = species.id;
    els.growthStage.dataset.growthStage = String(growthStage);
    els.growthStage.style.setProperty("--active-scale", (progressScale * activeStageScales[growthStage]).toFixed(3));
  }

  function renderRecords() {
    const query = els.searchInput.value.trim().toLowerCase();
    const status = els.statusFilter.value;
    const records = sortedSessions().filter((record) => {
      const statusMatches = status === "all" || record.status === status;
      const searchable = record.title.toLowerCase();
      return statusMatches && (!query || searchable.includes(query));
    });

    els.recordsList.replaceChildren();
    els.emptyState.hidden = records.length > 0;

    const fragment = document.createDocumentFragment();
    records.forEach((record) => fragment.appendChild(createRecordNode(record)));
    els.recordsList.appendChild(fragment);
    refreshIcons();
  }

  function createRecordNode(record) {
    const item = document.createElement("article");
    item.className = "record-item";

    const main = document.createElement("div");
    main.className = "record-main";

    const titleRow = document.createElement("div");
    titleRow.className = "record-title-row";

    const title = document.createElement("h3");
    title.className = "record-title";
    title.textContent = record.title;

    const status = document.createElement("span");
    status.className = `record-status ${record.status}`;
    status.textContent = record.status === "completed" ? "Planted" : "Abandoned";

    titleRow.append(title, status);

    const date = document.createElement("div");
    date.className = "record-date";
    date.textContent = formatRecordDate(record.started_at);

    const metrics = document.createElement("div");
    metrics.className = "record-metrics";
    metrics.append(
      createMetric(`${record.actual_minutes}m focused`),
      createMetric(`${record.duration_minutes}m goal`),
      createMetric(record.tree_kind)
    );

    main.append(titleRow, date, metrics);

    const actions = document.createElement("div");
    actions.className = "record-actions";
    actions.append(
      createActionButton("edit", record.id, "Edit", "pencil"),
      createActionButton("delete", record.id, "Delete", "trash-2")
    );

    item.append(main, actions);
    return item;
  }

  function createMetric(text) {
    const metric = document.createElement("span");
    metric.className = "metric";
    metric.textContent = text;
    return metric;
  }

  function createActionButton(action, id, label, icon) {
    const button = document.createElement("button");
    button.className = "icon-only";
    button.type = "button";
    button.dataset.action = action;
    button.dataset.id = id;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = `<i data-lucide="${icon}"></i>`;
    return button;
  }

  function renderStats() {
    const completed = state.sessions.filter((record) => record.status === "completed");
    const today = localDateKey(new Date());
    const todayMinutes = completed
      .filter((record) => localDateKey(record.ended_at || record.started_at) === today)
      .reduce((sum, record) => sum + Number(record.actual_minutes || 0), 0);
    const totalMinutes = completed.reduce((sum, record) => sum + Number(record.actual_minutes || 0), 0);

    els.todayStat.textContent = formatMinutes(todayMinutes);
    els.totalStat.textContent = formatMinutes(totalMinutes);
  }

  function renderWeekGrove() {
    const view = state.groveView;
    let start, end, rangeText, emptyText, kicker;

    if (view === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      start = today;
      end = addDays(today, 1);
      rangeText = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(today);
      emptyText = "No trees planted today.";
      kicker = "Today's forest";
    } else if (view === "month") {
      start = new Date(state.monthStart);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      rangeText = formatMonthRange(start);
      emptyText = "No trees planted this month.";
      kicker = "Monthly forest";
    } else {
      start = new Date(state.weekStart);
      end = addDays(start, 7);
      rangeText = formatWeekRange(start);
      emptyText = "No trees planted this week.";
      kicker = "Weekly forest";
    }

    const completed = state.sessions
      .filter((record) => {
        const plantedAt = new Date(record.ended_at || record.started_at);
        return record.status === "completed" && plantedAt >= start && plantedAt < end;
      })
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
    const totalMinutes = completed.reduce((sum, record) => sum + Number(record.actual_minutes || 0), 0);

    els.grovePanelKicker.textContent = kicker;
    els.weekRange.textContent = rangeText;
    els.weekTreeCount.textContent = `${completed.length} ${completed.length === 1 ? "tree" : "trees"}`;
    els.weekFocusTime.textContent = `${formatMinutes(totalMinutes)} focused`;

    els.groveTodayButton.classList.toggle("is-selected", view === "today");
    els.groveWeekButton.classList.toggle("is-selected", view === "week");
    els.groveMonthButton.classList.toggle("is-selected", view === "month");

    const isToday = view === "today";
    els.prevWeekButton.hidden = isToday;
    els.nextWeekButton.hidden = isToday;
    els.thisWeekButton.hidden = isToday;
    if (view === "month") {
      const currentMonth = startOfMonth(new Date());
      const onCurrent = start.getTime() === currentMonth.getTime();
      els.nextWeekButton.disabled = start.getTime() >= currentMonth.getTime();
      els.thisWeekButton.classList.toggle("is-current", onCurrent);
    } else if (view === "week") {
      const currentWeek = startOfWeek(new Date());
      const onCurrent = start.getTime() === currentWeek.getTime();
      els.nextWeekButton.disabled = start.getTime() >= currentWeek.getTime();
      els.thisWeekButton.classList.toggle("is-current", onCurrent);
    } else {
      els.thisWeekButton.classList.remove("is-current");
    }

    els.weekForest.replaceChildren();

    if (!completed.length) {
      const empty = document.createElement("div");
      empty.className = "week-forest-empty";
      empty.textContent = emptyText;
      els.weekForest.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    completed.forEach((record, index) => {
      fragment.appendChild(createGroveTree(record, index));
    });
    els.weekForest.appendChild(fragment);
  }

  function setGroveView(view) {
    state.groveView = view;
    if (view === "week") state.weekStart = startOfWeek(new Date());
    if (view === "month") state.monthStart = startOfMonth(new Date());
    renderWeekGrove();
  }

  function changeWeek(direction) {
    if (state.groveView === "month") {
      const d = new Date(state.monthStart);
      d.setMonth(d.getMonth() + direction);
      state.monthStart = startOfMonth(d);
    } else {
      state.weekStart = addDays(state.weekStart, direction * 7);
    }
    renderWeekGrove();
  }

  function createGroveTree(record, index) {
    const species = record.status === "abandoned"
      ? WILTED_TREE
      : (TREE_SPECIES.find((s) => s.label === record.tree_kind)
         || TREE_SPECIES.find((s) => s.id === record.tree_kind)
         || getTreeForSession(record.title, record.status));
    const seed = getTreeSeed(record.title);
    const palette = getTreePalette(seed);
    const shape = hashString(`${seed}:shape`) % 4;
    const tree = document.createElement("article");
    tree.className = `grove-tree shape-${shape}`;
    tree.style.setProperty("--tree-delay", `${(index % 9) * 40}ms`);
    tree.style.setProperty("--active-scale", getGroveTreeScale(record.actual_minutes, seed));
    tree.style.setProperty("--tree-tilt", `${Math.round(seededRange(seed, "tilt", -5, 5))}deg`);
    tree.style.setProperty("--tree-floor", `${Math.round(seededRange(seed, "floor", -3, 3))}px`);
    tree.style.setProperty("--tree-shift", `${Math.round(seededRange(seed, "shift", -4, 4))}px`);
    tree.style.setProperty("--tree-girth", `${Math.round(seededRange(seed, "girth", -3, 5))}px`);
    tree.style.setProperty("--tree-depth", `${Math.round(seededRange(seed, "depth", -2, 4))}px`);
    tree.style.setProperty("--tree-mound-width", `${seededRange(seed, "mound", 34, 54).toFixed(1)}px`);
    tree.style.setProperty("--grove-stretch-x", seededRange(seed, `shape-${shape}-x`, 0.96, 1.04).toFixed(2));
    tree.style.setProperty("--grove-stretch-y", seededRange(seed, `shape-${shape}-y`, 0.98, 1.06).toFixed(2));
    tree.title = `${record.title}: ${species.label}, ${record.actual_minutes}m`;
    tree.setAttribute(
      "aria-label",
      `${record.title}, ${species.label}, ${record.actual_minutes} focused minutes`
    );

    const visual = document.createElement("span");
    visual.className = "grove-plant plant";
    visual.setAttribute("aria-hidden", "true");
    visual.innerHTML = buildTreeSVG(species.id, palette);

    const label = document.createElement("span");
    label.className = "tree-label";
    label.textContent = record.title;

    tree.append(visual, label);
    return tree;
  }

  function getGroveTreeScale(minutes, seed) {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    const cappedMinutes = Math.min(120, safeMinutes);
    const stageScales = [0.4, 0.51, 0.62, 0.74];
    const growthStage = getFocusGrowthStage(minutes);
    const timeBonus = (cappedMinutes / 120) * 0.09;
    return (stageScales[growthStage] + timeBonus + seededRange(seed, "size", -0.004, 0.004)).toFixed(2);
  }

  function getFocusGrowthStage(minutes) {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    if (safeMinutes <= 15) return 0;
    if (safeMinutes <= 30) return 1;
    if (safeMinutes <= 45) return 2;
    return 3;
  }

  function renderAccount() {
    els.authActions.hidden = !state.supabaseConfigured || Boolean(state.user);
    els.signedInActions.hidden = !state.user;

    if (!state.supabaseConfigured) {
      els.syncBadge.textContent = "Local";
      els.modeLabel.textContent = "Local garden";
      els.navAuthStatus.textContent = "Local";
      els.accountButton.title = "Account: local only";
      setAccountStatus("hard-drive", "Records are saved in this browser.");
      return;
    }

    if (!state.user) {
      els.syncBadge.textContent = "Local";
      els.modeLabel.textContent = "Local garden";
      els.navAuthStatus.textContent = "Sign in";
      els.accountButton.title = "Sign in with Google";
      setAccountStatus("cloud", "Use Google to sync records across devices.");
      return;
    }

    els.syncBadge.textContent = "Synced";
    els.modeLabel.textContent = "Cloud garden";
    els.navAuthStatus.textContent = "Signed in";
    els.accountButton.title = `Signed in as ${getUserDisplayName(state.user)}`;
    setAccountStatus("badge-check", getUserDisplayName(state.user));
  }

  function setAccountStatus(icon, text) {
    els.accountStatus.replaceChildren();
    const iconNode = document.createElement("i");
    iconNode.dataset.lucide = icon;
    const textNode = document.createElement("span");
    textNode.textContent = text;
    els.accountStatus.append(iconNode, textNode);
    refreshIcons();
  }

  function getUserDisplayName(user) {
    const metadata = user.user_metadata || {};
    return metadata.full_name || metadata.name || user.email || "Signed in";
  }

  function getAuthRedirectUrl() {
    const url = new URL(".", window.location.href);
    url.hash = "";
    url.search = "";
    return url.href;
  }

  async function loadActiveTimerFromCloud(options = {}) {
    const activeTimerState = await fetchActiveTimerState(options);
    return activeTimerState.timer;
  }

  async function fetchActiveTimerState(options = {}) {
    if (!canUseCloud()) return { ok: false, timer: null };

    const { data, error } = await state.supabase
      .from("active_focus_timers")
      .select("*")
      .eq("user_id", state.user.id)
      .maybeSingle();

    if (error) {
      warnActiveTimerSync(error, options.silent);
      return { ok: false, timer: null };
    }

    return { ok: true, timer: data ? fromCloudActiveTimer(data) : null };
  }

  async function saveActiveTimerToCloud() {
    if (!canUseCloud() || !state.timer) return false;

    const { error } = await state.supabase
      .from("active_focus_timers")
      .upsert(toCloudActiveTimer(state.timer), { onConflict: "user_id" });

    if (error) {
      warnActiveTimerSync(error);
      return false;
    }

    state.timer.cloudSynced = true;
    persistTimer();
    return true;
  }

  async function claimActiveTimer(timer) {
    if (!canUseCloud() || !timer.cloudSynced) return true;

    const { data, error } = await state.supabase
      .from("active_focus_timers")
      .delete()
      .eq("user_id", state.user.id)
      .eq("timer_id", timer.id)
      .select("user_id");

    if (error) {
      warnActiveTimerSync(error);
      return true;
    }

    return Array.isArray(data) ? data.length > 0 : true;
  }

  async function refreshCloudActiveTimer() {
    if (!canUseCloud() || state.cloudTimerSyncing || state.timerCompleting) return;

    state.cloudTimerSyncing = true;
    state.lastCloudTimerSyncAt = Date.now();
    try {
      const activeTimerState = await fetchActiveTimerState({ silent: true });
      if (!activeTimerState.ok) return;

      const cloudTimer = activeTimerState.timer;

      if (cloudTimer) {
        const previousStartedAt = state.timer ? state.timer.startedAt : "";
        state.timer = cloudTimer;
        persistTimer();

        if (getRemainingSeconds() <= 0) {
          await completeTimer("completed");
        } else if (previousStartedAt !== state.timer.startedAt) {
          renderTimer();
          renderTimerModeToggle();
        }
        return;
      }

      if (state.timer && state.timer.cloudSynced) {
        state.timer = null;
        persistTimer();
        await loadSessions();
        renderAll();
      }
    } finally {
      state.cloudTimerSyncing = false;
    }
  }

  async function saveRestTimerToCloud() {
    if (!canUseCloud() || !state.restTimer) return;
    const { error } = await state.supabase
      .from("active_rest_timers")
      .upsert({
        user_id: state.user.id,
        started_at: new Date(state.restTimer.startedAt).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    if (error) console.warn(error);
  }

  async function deleteRestTimerFromCloud() {
    if (!canUseCloud()) return;
    const { error } = await state.supabase
      .from("active_rest_timers")
      .delete()
      .eq("user_id", state.user.id);
    if (error) console.warn(error);
  }

  async function fetchRestTimerFromCloud() {
    if (!canUseCloud()) return null;
    const { data, error } = await state.supabase
      .from("active_rest_timers")
      .select("started_at")
      .eq("user_id", state.user.id)
      .maybeSingle();
    if (error) { console.warn(error); return null; }
    return data ? { startedAt: new Date(data.started_at).getTime() } : null;
  }

  async function hydrateRestTimer() {
    const cloud = await fetchRestTimerFromCloud();
    if (cloud) {
      state.restTimer = cloud;
    }
  }

  async function refreshCloudRestTimer() {
    if (!canUseCloud()) return;
    const cloud = await fetchRestTimerFromCloud();

    if (cloud && !state.restTimer) {
      state.restTimer = cloud;
      renderRestTimer();
    } else if (!cloud && state.restTimer) {
      state.restTimer = null;
      renderRestTimer();
    } else if (cloud && state.restTimer && Math.abs(cloud.startedAt - state.restTimer.startedAt) > 2000) {
      state.restTimer = cloud;
      renderRestTimer();
    }
  }

  function warnActiveTimerSync(error, silent) {
    console.warn(error);
    if (silent || state.activeTimerSyncWarningShown) return;
    state.activeTimerSyncWarningShown = true;
    showToast("Cloud timer sync needs the updated Supabase SQL.");
  }

  function openAccountDialog() {
    if (typeof els.accountDialog.showModal === "function") {
      els.accountDialog.showModal();
    } else {
      els.accountDialog.setAttribute("open", "");
    }

    refreshIcons();
  }

  function closeAccountDialog() {
    if (typeof els.accountDialog.close === "function") {
      els.accountDialog.close();
    } else {
      els.accountDialog.removeAttribute("open");
    }
  }

  function openRecordDialog(record) {
    const now = new Date();
    const defaults = {
      id: "",
      title: els.sessionTitle.value.trim() || "Deep focus",
      started_at: now.toISOString(),
      status: "completed",
      duration_minutes: state.selectedDuration,
      actual_minutes: state.selectedDuration,
    };
    const value = record || defaults;

    if (els.recordTreeInput.options.length === 0) {
      TREE_SPECIES.forEach((species) => {
        const opt = document.createElement("option");
        opt.value = species.id;
        opt.textContent = species.label.charAt(0).toUpperCase() + species.label.slice(1);
        els.recordTreeInput.appendChild(opt);
      });
    }

    els.dialogTitle.textContent = record ? "Edit session" : "Add session";
    els.recordIdInput.value = value.id;
    els.recordTitleInput.value = value.title;
    els.recordStartedInput.value = toDatetimeLocal(value.started_at);
    els.recordStatusInput.value = value.status;
    els.recordDurationInput.value = value.duration_minutes;
    els.recordActualInput.value = value.actual_minutes;
    els.recordTreeInput.value = record
      ? (TREE_SPECIES.find((s) => s.label === record.tree_kind)?.id || resolveTreeForName(value.title))
      : resolveTreeForName(value.title);

    if (typeof els.recordDialog.showModal === "function") {
      els.recordDialog.showModal();
    } else {
      els.recordDialog.setAttribute("open", "");
    }

    refreshIcons();
  }

  async function saveDialogRecord() {
    if (!els.recordForm.reportValidity()) return;

    const id = els.recordIdInput.value || createId();
    const startedAt = fromDatetimeLocal(els.recordStartedInput.value);
    const actualMinutes = cleanMinutes(els.recordActualInput.value, 0, 0);
    const durationMinutes = cleanMinutes(els.recordDurationInput.value, actualMinutes || 1, 1);
    const endedAt = new Date(startedAt.getTime() + actualMinutes * 60000).toISOString();
    const title = els.recordTitleInput.value.trim() || "Deep focus";
    const changes = {
      id,
      title,
      started_at: startedAt.toISOString(),
      ended_at: endedAt,
      status: els.recordStatusInput.value,
      duration_minutes: durationMinutes,
      actual_minutes: actualMinutes,
      tree_kind: pickTreeKind(title, els.recordStatusInput.value, els.recordTreeInput.value),
      updated_at: new Date().toISOString(),
    };

    // Remember the chosen species for this session name, just like the timer's
    // tree picker does, so the next "eating ayam" session defaults to it.
    saveTreePref(title, els.recordTreeInput.value);

    if (els.recordIdInput.value) {
      await updateRecord(id, changes);
    } else {
      await createRecord({
        ...changes,
        created_at: new Date().toISOString(),
      });
    }

    rememberSessionName(changes.title);
    closeDialog();
    showToast("Record saved.");
  }

  async function signInWithGoogle() {
    if (!state.supabase) return;

    const { error } = await state.supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) {
      showToast(error.message);
    }
  }

  async function signOut() {
    if (!state.supabase) return;
    await state.supabase.auth.signOut();
    showToast("Signed out.");
  }

  function canUseCloud() {
    return Boolean(state.supabase && state.user);
  }

  function loadLocalSessions() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_SESSIONS) || "[]");
      return Array.isArray(data) ? data.map(normalizeRecord).sort(sortByStartedDesc) : [];
    } catch (error) {
      console.warn(error);
      return [];
    }
  }

  function saveLocalSessions(records) {
    localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(records.map(normalizeRecord)));
  }

  function addLocalRecord(record) {
    const records = [normalizeRecord(record), ...loadLocalSessions().filter((item) => item.id !== record.id)];
    saveLocalSessions(records.sort(sortByStartedDesc));
  }

  function hydrateSessionName() {
    const savedTitle = localStorage.getItem(STORAGE_SESSION_NAME);
    const latestTitle = sortedSessions()[0] ? sortedSessions()[0].title : "Deep focus";
    els.sessionTitle.value = savedTitle || latestTitle;
    rememberSessionName(els.sessionTitle.value);
    state.selectedTreeId = resolveTreeForName(els.sessionTitle.value);
  }

  function rememberSessionName(value) {
    const title = (value || els.sessionTitle.value || "Deep focus").trim() || "Deep focus";
    localStorage.setItem(STORAGE_SESSION_NAME, title);
  }

  function loadTreePrefs() {
    try { return JSON.parse(localStorage.getItem(STORAGE_TREE_PREF) || "{}"); }
    catch { return {}; }
  }

  function getTreePrefForName(name) {
    const key = (name || "").toLowerCase().trim() || "deep focus";
    return loadTreePrefs()[key] || null;
  }

  function saveTreePref(name, speciesId) {
    const key = (name || "").toLowerCase().trim() || "deep focus";
    const prefs = loadTreePrefs();
    prefs[key] = speciesId;
    localStorage.setItem(STORAGE_TREE_PREF, JSON.stringify(prefs));
  }

  function renderTreePicker() {
    if (els.treePicker.options.length === 0) {
      TREE_SPECIES.forEach((species) => {
        const opt = document.createElement("option");
        opt.value = species.id;
        opt.textContent = species.label.charAt(0).toUpperCase() + species.label.slice(1);
        els.treePicker.appendChild(opt);
      });
    }
    els.treePicker.value = state.selectedTreeId;
    els.treePicker.disabled = !!state.timer;
  }

  function readStoredTimer() {
    return normalizeTimer(JSON.parse(localStorage.getItem(STORAGE_TIMER) || "null"));
  }

  function persistTimer() {
    if (!state.timer) {
      localStorage.removeItem(STORAGE_TIMER);
      return;
    }

    localStorage.setItem(STORAGE_TIMER, JSON.stringify(state.timer));
  }

  function normalizeTimer(timer) {
    if (!timer) return null;

    if (timer.mode === "stopwatch") {
      const startedAt = timer.startedAt || timer.started_at || new Date().toISOString();
      return {
        id: timer.id || createId(),
        mode: "stopwatch",
        status: "running",
        title: (timer.title || "Deep focus").trim() || "Deep focus",
        selectedTreeId: timer.selectedTreeId || null,
        durationMinutes: 0,
        durationSeconds: 0,
        startedAt,
        endAt: Date.now() + 86400 * 1000,
        remainingSeconds: 86400,
        cloudSynced: Boolean(timer.cloudSynced),
      };
    }

    const durationMinutes = cleanMinutes(timer.durationMinutes || timer.duration_minutes, DEFAULT_DURATION, 1);
    const durationSeconds = Number(timer.durationSeconds || timer.duration_seconds || durationMinutes * 60);
    const startedAt = timer.startedAt || timer.started_at || new Date().toISOString();
    const savedEndAt = timer.endAt || timer.end_at;
    let endAt = typeof savedEndAt === "string" ? new Date(savedEndAt).getTime() : Number(savedEndAt);

    if (!Number.isFinite(endAt)) {
      endAt = new Date(startedAt).getTime() + durationSeconds * 1000;
    }

    if (timer.status === "paused") {
      endAt = Date.now() + Number(timer.remainingSeconds || durationSeconds) * 1000;
    }

    return {
      id: timer.id || timer.timer_id || createId(),
      mode: "countdown",
      status: "running",
      title: (timer.title || "Deep focus").trim() || "Deep focus",
      selectedTreeId: timer.selectedTreeId || null,
      durationMinutes,
      durationSeconds,
      startedAt,
      endAt,
      remainingSeconds: Math.max(0, Math.ceil((endAt - Date.now()) / 1000)),
      cloudSynced: Boolean(timer.cloudSynced),
    };
  }

  function normalizeRecord(record) {
    const now = new Date().toISOString();
    const duration = cleanMinutes(record.duration_minutes, DEFAULT_DURATION, 1);
    const actual = cleanMinutes(record.actual_minutes, duration, 0);
    const title = record.title || "Deep focus";
    const status = record.status === "abandoned" ? "abandoned" : "completed";
    return {
      id: record.id || createId(),
      user_id: record.user_id || null,
      title,
      duration_minutes: duration,
      actual_minutes: actual,
      status,
      started_at: record.started_at || now,
      ended_at: record.ended_at || record.started_at || now,
      tree_kind: resolveTreeKind(record, title, status),
      created_at: record.created_at || now,
      updated_at: record.updated_at || now,
    };
  }

  // Keep the species that was actually chosen for this record. Only fall back
  // to a derived default for legacy records that never stored a tree_kind.
  function resolveTreeKind(record, title, status) {
    if (status === "abandoned") return WILTED_TREE.label;
    const stored = record.tree_kind;
    if (stored && TREE_SPECIES.some((s) => s.label === stored)) return stored;
    return pickTreeKind(title, status);
  }

  function toCloudRecord(record, forUpdate) {
    const row = {
      title: record.title,
      duration_minutes: Number(record.duration_minutes),
      actual_minutes: Number(record.actual_minutes),
      status: record.status,
      started_at: record.started_at,
      ended_at: record.ended_at,
      tree_kind: record.tree_kind,
      updated_at: record.updated_at || new Date().toISOString(),
    };

    if (!forUpdate) {
      row.id = record.id;
      row.user_id = state.user.id;
      row.created_at = record.created_at || new Date().toISOString();
    }

    return row;
  }

  function toCloudActiveTimer(timer) {
    return {
      user_id: state.user.id,
      timer_id: timer.id,
      mode: timer.mode || "countdown",
      title: timer.title,
      duration_minutes: Number(timer.durationMinutes),
      duration_seconds: Number(timer.durationSeconds),
      started_at: timer.startedAt,
      end_at: new Date(timer.endAt).toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  function fromCloudActiveTimer(row) {
    return normalizeTimer({
      mode: row.mode || "countdown",
      title: row.title,
      id: row.timer_id,
      // The active-timer table has no species column, so derive the tree from
      // the synced name. The per-name default is deterministic and history is
      // synced, so another device resolves the same tree.
      selectedTreeId: resolveTreeForName(row.title),
      durationMinutes: row.duration_minutes,
      durationSeconds: row.duration_seconds,
      startedAt: row.started_at,
      endAt: row.end_at,
      cloudSynced: true,
    });
  }

  function setDuration(minutes) {
    state.selectedDuration = cleanMinutes(minutes, DEFAULT_DURATION, 1);
    els.durationInput.value = state.selectedDuration;
    updateDurationButtons();
    if (!state.timer) {
      updateTimerDisplay(state.selectedDuration * 60, 0);
    }
  }

  function updateDurationButtons() {
    els.durationButtons.forEach((button) => {
      button.classList.toggle("is-selected", Number(button.dataset.duration) === state.selectedDuration);
    });
  }

  function setFormDisabled(disabled) {
    Array.from(els.focusForm.elements).forEach((element) => {
      element.disabled = disabled;
    });
    els.durationButtons.forEach((button) => {
      button.disabled = disabled;
    });
  }

  function setButtonLabel(button, label, icon) {
    button.innerHTML = `<i data-lucide="${icon}"></i><span>${label}</span>`;
  }

  function toggleTimerSound() {
    state.soundEnabled = !state.soundEnabled;
    saveSoundPreference();
    renderSoundToggle();

    if (state.soundEnabled) {
      playCompletionSound({ preview: true });
    } else {
      stopActiveTimerSounds();
    }

    showToast(`Timer sound ${state.soundEnabled ? "on" : "off"}.`);
  }

  function loadSoundPreference() {
    return localStorage.getItem(STORAGE_SOUND_ENABLED) !== "off";
  }

  function saveSoundPreference() {
    localStorage.setItem(STORAGE_SOUND_ENABLED, state.soundEnabled ? "on" : "off");
  }

  function loadSoundVolume() {
    const saved = parseFloat(localStorage.getItem(STORAGE_SOUND_VOLUME));
    return Number.isFinite(saved) ? clamp(saved, 0, 2) : 0.8;
  }

  function saveSoundVolume() {
    localStorage.setItem(STORAGE_SOUND_VOLUME, String(state.soundVolume));
  }

  function renderVolumeControl() {
    els.volumeRow.hidden = !state.soundEnabled;
    if (!state.soundEnabled) return;

    const pct = Math.round(state.soundVolume * 100);
    els.volumeSlider.value = pct;
    els.volumeLabel.textContent = `${pct}%`;
  }

  function loadTimerMode() {
    return localStorage.getItem(STORAGE_TIMER_MODE) === "stopwatch" ? "stopwatch" : "countdown";
  }

  function saveTimerMode() {
    localStorage.setItem(STORAGE_TIMER_MODE, state.timerMode);
  }

  function setTimerMode(mode) {
    if (state.timer) return;
    state.timerMode = mode;
    saveTimerMode();
    renderTimerModeToggle();
    renderTimer();
  }

  function renderTimerModeToggle() {
    const activeMode = state.timer ? (state.timer.mode || "countdown") : state.timerMode;
    const timerRunning = Boolean(state.timer);

    els.modeCountdownButton.classList.toggle("is-selected", activeMode === "countdown");
    els.modeStopwatchButton.classList.toggle("is-selected", activeMode === "stopwatch");
    els.modeCountdownButton.disabled = timerRunning;
    els.modeStopwatchButton.disabled = timerRunning;

    els.durationField.hidden = activeMode === "stopwatch";
    refreshIcons();
  }

  async function deleteAllData() {
    const mode = canUseCloud() ? "cloud" : "local";
    const label = mode === "cloud" ? "cloud records" : "local records";
    const confirmed = window.confirm(
      `Delete all ${label}? This cannot be undone.`
    );
    if (!confirmed) return;

    if (canUseCloud()) {
      const { error } = await state.supabase
        .from("focus_sessions")
        .delete()
        .eq("user_id", state.user.id);

      if (error) {
        showToast("Failed to delete cloud records.");
        console.warn(error);
        return;
      }
    } else {
      saveLocalSessions([]);
    }

    state.sessions = [];
    renderAll();
    showToast("All records deleted.");
  }

  function getAudioContext() {
    if (state.audioContext) return state.audioContext;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    state.audioContext = new AudioContextClass();
    state.masterGainNode = state.audioContext.createGain();
    state.masterGainNode.gain.value = state.soundVolume;
    state.masterGainNode.connect(state.audioContext.destination);
    return state.audioContext;
  }

  function primeCompletionSound() {
    if (!state.soundEnabled) return;

    const context = getAudioContext();
    if (!context || context.state !== "suspended") return;

    context.resume().catch((error) => {
      console.warn(error);
    });
  }

  function playCompletionSound(options = {}) {
    if (!state.soundEnabled) return;

    const context = getAudioContext();
    if (!context) return;

    const play = () => {
      const startTime = context.currentTime + 0.02;
      const frequencies = options.preview ? [659.25, 783.99] : [523.25, 659.25, 783.99];
      const duration = options.preview ? 0.82 : 1.35;
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, startTime);
      master.gain.exponentialRampToValueAtTime(0.14, startTime + 0.04);
      master.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      master.connect(state.masterGainNode || context.destination);
      trackSoundMaster(master, options.preview ? 1000 : 1600);

      frequencies.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const noteStart = startTime + index * 0.12;
        const noteEnd = noteStart + (options.preview ? 0.46 : 0.78);

        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        envelope.gain.setValueAtTime(0.0001, noteStart);
        envelope.gain.exponentialRampToValueAtTime(0.42, noteStart + 0.05);
        envelope.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.start(noteStart);
        oscillator.stop(noteEnd + 0.03);
      });

    };

    if (context.state === "suspended") {
      context.resume().then(play).catch((error) => {
        console.warn(error);
      });
      return;
    }

    play();
  }

  function playFinishSoonSound(remainingSeconds) {
    if (!state.soundEnabled || !state.timer) return;
    if (state.finishSoonSoundTimerId === state.timer.id) return;

    const timerId = state.timer.id;
    const context = getAudioContext();
    if (!context) return;

    const play = () => {
      if (!state.timer || state.timer.id !== timerId || state.finishSoonSoundTimerId === timerId) return;

      state.finishSoonSoundTimerId = timerId;
      const exactRemainingSeconds = (state.timer.endAt - Date.now()) / 1000;
      const safeDuration = clamp(exactRemainingSeconds, 1, 10);
      const startTime = context.currentTime + 0.03;
      const endTime = startTime + safeDuration;
      const fadeStartTime = startTime + Math.max(0.25, safeDuration - 0.35);
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, startTime);
      master.gain.exponentialRampToValueAtTime(0.08, startTime + 0.12);
      master.gain.setValueAtTime(0.08, fadeStartTime);
      master.gain.exponentialRampToValueAtTime(0.0001, endTime);
      master.connect(state.masterGainNode || context.destination);
      trackSoundMaster(master, (safeDuration + 0.3) * 1000);

      [220, 329.63].forEach((frequency) => {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, startTime);
        envelope.gain.setValueAtTime(0.0001, startTime);
        envelope.gain.exponentialRampToValueAtTime(0.14, startTime + 0.18);
        envelope.gain.setValueAtTime(0.14, fadeStartTime);
        envelope.gain.exponentialRampToValueAtTime(0.0001, endTime);

        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.start(startTime);
        oscillator.stop(endTime + 0.03);
      });

      for (let index = 0; index < safeDuration * 2; index += 1) {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const noteStart = startTime + index * 0.5;
        const noteEnd = Math.min(noteStart + 0.34, endTime);
        if (noteEnd <= noteStart) continue;

        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(index % 2 ? 659.25 : 523.25, noteStart);
        envelope.gain.setValueAtTime(0.0001, noteStart);
        envelope.gain.exponentialRampToValueAtTime(0.28, noteStart + 0.04);
        envelope.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.start(noteStart);
        oscillator.stop(noteEnd + 0.03);
      }
    };

    if (context.state === "suspended") {
      context.resume().then(play).catch((error) => {
        console.warn(error);
      });
      return;
    }

    play();
  }

  function trackSoundMaster(master, durationMs) {
    state.activeSoundMasters.push(master);
    window.setTimeout(() => {
      disconnectSoundMaster(master);
    }, durationMs);
  }

  function disconnectSoundMaster(master) {
    try {
      master.disconnect();
    } catch (error) {
      // The node may already be disconnected when sound is toggled off.
    }

    state.activeSoundMasters = state.activeSoundMasters.filter((item) => item !== master);
  }

  function stopActiveTimerSounds() {
    state.finishSoonSoundTimerId = null;
    state.activeSoundMasters.forEach((master) => {
      try {
        master.disconnect();
      } catch (error) {
        // The node may already be disconnected by its timeout.
      }
    });
    state.activeSoundMasters = [];
  }

  function getRemainingSeconds() {
    if (!state.timer) return state.selectedDuration * 60;
    return Math.max(0, Math.ceil((state.timer.endAt - Date.now()) / 1000));
  }

  function getRestElapsedSeconds() {
    if (!state.restTimer) return 0;
    return Math.max(0, Math.floor((Date.now() - state.restTimer.startedAt) / 1000));
  }

  function getElapsedSeconds() {
    if (!state.timer) return 0;
    if (state.timer.mode === "stopwatch") {
      return Math.max(0, (Date.now() - new Date(state.timer.startedAt).getTime()) / 1000);
    }
    return Math.max(0, state.timer.durationSeconds - getRemainingSeconds());
  }

  function sortedSessions() {
    return [...state.sessions].sort(sortByStartedDesc);
  }

  function sortByStartedDesc(a, b) {
    return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
  }

  function pickTreeKind(title, status, speciesIdOverride) {
    if (status === "abandoned") return WILTED_TREE.label;
    if (speciesIdOverride) {
      const s = TREE_SPECIES.find((sp) => sp.id === speciesIdOverride);
      if (s) return s.label;
    }
    return getTreeForSession(title, status).label;
  }

  function getTreeForSession(title, status) {
    if (status === "abandoned") return WILTED_TREE;
    const prefId = getTreePrefForName(title);
    if (prefId) {
      const s = TREE_SPECIES.find((sp) => sp.id === prefId);
      if (s) return s;
    }
    const fallbackId = defaultTreeForName(title);
    return TREE_SPECIES.find((s) => s.id === fallbackId) || TREE_SPECIES[0];
  }

  // The tree a session name should default to, in priority order:
  //   1. an explicit choice saved on this device,
  //   2. the species of the most recent completed session with that name —
  //      this is synced to the cloud, so it follows the account across devices,
  //   3. a stable per-name random as a last resort.
  function resolveTreeForName(name) {
    return getTreePrefForName(name) || treeIdFromHistory(name) || defaultTreeForName(name);
  }

  // Look up the species used for the most recent completed session of this name.
  function treeIdFromHistory(name) {
    const key = (name || "").toLowerCase().trim() || "deep focus";
    const match = sortedSessions().find(
      (record) => record.status === "completed" && (record.title || "").toLowerCase().trim() === key
    );
    if (!match) return null;
    const species = TREE_SPECIES.find((s) => s.label === match.tree_kind);
    return species ? species.id : null;
  }

  // A new session name (one with no preference or history) gets a stable tree
  // derived from the name itself, so new sessions vary across species instead
  // of all defaulting to pine. The user can still change it any time.
  function defaultTreeForName(name) {
    let seed = hashString(getTreeSeed(name) + ":species");
    // Mix the bits so small-modulo selection spreads evenly across species.
    // `>>> 0` keeps it an unsigned 32-bit int (XOR can otherwise go negative,
    // which would yield a negative index).
    seed ^= seed >>> 13;
    seed = (seed * 0x5bd1e995) >>> 0;
    seed = (seed ^ (seed >>> 15)) >>> 0;
    return TREE_SPECIES[seed % TREE_SPECIES.length].id;
  }

  function getTreePalette(seedSource) {
    const normalizedSeed = getTreeSeed(seedSource);
    const seed = hashString(normalizedSeed);
    const hue = 80 + (seed % 94);
    const leafSat = 48 + (Math.floor(seed / 17) % 18);
    const leafLight = 58 + (Math.floor(seed / 29) % 13);
    const barkHue = 22 + (Math.floor(seed / 7) % 32);
    return {
      leafA: `hsl(${hue}, ${leafSat}%, ${leafLight}%)`,
      leafB: `hsl(${hue + 14 + (seed % 12)}, ${Math.max(38, leafSat - 9)}%, ${29 + (Math.floor(seed / 41) % 10)}%)`,
      barkA: `hsl(${barkHue}, ${44 + (seed % 9)}%, ${49 + (Math.floor(seed / 11) % 12)}%)`,
      barkB: `hsl(${barkHue}, ${38 + (Math.floor(seed / 13) % 9)}%, ${27 + (Math.floor(seed / 19) % 8)}%)`,
    };
  }

  // --- SVG tree rendering -------------------------------------------------
  // Clean vector trees. viewBox 0 0 100 120, ground baseline at y=116,
  // trunk centered on x=50. Each species returns tidy SVG shapes coloured
  // from the per-session palette.

  function svgCircle(x, y, r, fill, opacity) {
    const op = opacity != null && opacity < 1 ? ` opacity="${opacity}"` : "";
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"${op}/>`;
  }

  function svgTrunk(topY, baseW, topW, barkA, barkB, baseY = 116) {
    const bx = baseW / 2;
    const tx = topW / 2;
    const midY = (baseY + topY) / 2;
    return (
      `<path d="M ${50 - bx} ${baseY} Q ${50 - bx + 1} ${midY} ${50 - tx} ${topY} L ${50 + tx} ${topY} Q ${50 + bx - 1} ${midY} ${50 + bx} ${baseY} Z" fill="${barkA}"/>` +
      `<path d="M 50 ${baseY} L ${50 + tx} ${topY} Q ${50 + bx - 1} ${midY} ${50 + bx} ${baseY} Z" fill="${barkB}" opacity="0.4"/>`
    );
  }

  function svgBlade(ox, oy, angleDeg, len, width, droop, fill) {
    const r = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(r);
    const dy = Math.sin(r);
    const tx = ox + dx * len;
    const ty = oy + dy * len;
    const px = -dy;
    const py = dx;
    const mx = ox + dx * len * 0.5;
    const my = oy + dy * len * 0.5 + droop;
    const c1x = mx + px * width;
    const c1y = my + py * width;
    const c2x = mx - px * width;
    const c2y = my - py * width;
    const f = (n) => n.toFixed(1);
    return `<path d="M ${f(ox)} ${f(oy)} Q ${f(c1x)} ${f(c1y)} ${f(tx)} ${f(ty)} Q ${f(c2x)} ${f(c2y)} ${f(ox)} ${f(oy)} Z" fill="${fill}"/>`;
  }

  const TREE_DRAWERS = {
    pine(p) {
      const tier = (apexY, baseY, hw) =>
        `<path d="M 50 ${apexY} L ${50 + hw} ${baseY} L ${50 - hw} ${baseY} Z" fill="${p.leafA}"/>` +
        `<path d="M 50 ${apexY} L ${50 + hw} ${baseY} L 50 ${baseY} Z" fill="${p.leafB}" opacity="0.28"/>`;
      return (
        svgTrunk(100, 11, 7, p.barkA, p.barkB) +
        tier(70, 102, 33) +
        tier(46, 80, 27) +
        tier(24, 58, 20)
      );
    },
    canopy(p) {
      return (
        svgTrunk(86, 12, 8, p.barkA, p.barkB) +
        svgCircle(50, 52, 28, p.leafA) +
        svgCircle(30, 62, 19, p.leafA) +
        svgCircle(70, 62, 19, p.leafA) +
        svgCircle(36, 40, 17, p.leafA) +
        svgCircle(64, 42, 16, p.leafA) +
        svgCircle(50, 32, 19, p.leafA) +
        svgCircle(58, 60, 14, p.leafB, 0.24) +
        svgCircle(44, 66, 12, p.leafB, 0.22)
      );
    },
    palm(p) {
      const ox = 55;
      const oy = 60;
      const specs = [
        [-158, 30], [-130, 36], [-100, 38], [-80, 38], [-50, 36], [-22, 30],
      ];
      const fronds = specs
        .map(([a, l], i) => svgBlade(ox, oy, a, l, 7, 8, i % 2 ? p.leafB : p.leafA))
        .join("");
      const trunk =
        `<path d="M 44 116 Q 50 88 ${ox - 4} ${oy + 2} L ${ox + 4} ${oy + 2} Q 54 88 52 116 Z" fill="${p.barkA}"/>` +
        `<path d="M 48 116 Q 53 88 ${ox + 4} ${oy + 2} L ${ox + 4} ${oy + 2} Q 54 88 52 116 Z" fill="${p.barkB}" opacity="0.4"/>`;
      return trunk + fronds + svgCircle(ox, oy, 4, p.barkB);
    },
    bamboo(p) {
      const stalk = (x, topY, w) => {
        let s =
          `<rect x="${x - w / 2}" y="${topY}" width="${w}" height="${116 - topY}" rx="${w / 2}" fill="${p.leafA}"/>` +
          `<rect x="${x}" y="${topY}" width="${w / 2}" height="${116 - topY}" rx="${w / 4}" fill="${p.leafB}" opacity="0.35"/>`;
        for (let ny = topY + 14; ny < 114; ny += 18) {
          s += `<rect x="${x - w / 2 - 1}" y="${ny}" width="${w + 2}" height="2.5" rx="1" fill="${p.leafB}"/>`;
        }
        return s;
      };
      const leaf = (x, y, a) => svgBlade(x, y, a, 16, 3.5, 2, p.leafA);
      return (
        stalk(40, 46, 7) +
        stalk(50, 30, 7.5) +
        stalk(60, 52, 6.5) +
        leaf(50, 30, -60) +
        leaf(50, 34, -110) +
        leaf(40, 46, -50) +
        leaf(60, 52, -120)
      );
    },
    fern(p) {
      const ox = 50;
      const oy = 114;
      const specs = [
        [-160, 38], [-140, 44], [-118, 48], [-95, 50], [-85, 50], [-62, 48], [-40, 44], [-20, 38],
      ];
      return specs
        .map(([a, l], i) => svgBlade(ox, oy, a, l, 5, 6, i % 2 ? p.leafB : p.leafA))
        .join("");
    },
    kapok(p) {
      const trunk = svgTrunk(54, 16, 9, p.barkA, p.barkB);
      const buttress =
        `<path d="M 41 116 Q 44 107 50 107 L 50 116 Z" fill="${p.barkB}"/>` +
        `<path d="M 59 116 Q 56 107 50 107 L 50 116 Z" fill="${p.barkA}"/>`;
      const crown =
        `<ellipse cx="50" cy="50" rx="40" ry="15" fill="${p.leafA}"/>` +
        svgCircle(36, 42, 13, p.leafA) +
        svgCircle(50, 38, 15, p.leafA) +
        svgCircle(64, 42, 13, p.leafA) +
        `<ellipse cx="52" cy="56" rx="34" ry="9" fill="${p.leafB}" opacity="0.3"/>`;
      return trunk + buttress + crown;
    },
    mangrove(p) {
      const roots = [34, 42, 58, 66]
        .map((x, i) => {
          const w = i === 1 || i === 2 ? 5 : 4;
          return `<path d="M 50 86 Q ${(50 + x) / 2} 100 ${x} 116" stroke="${p.barkB}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
        })
        .join("");
      const trunk = `<rect x="46" y="62" width="8" height="30" rx="3" fill="${p.barkA}"/>`;
      const crown =
        svgCircle(50, 52, 22, p.leafA) +
        svgCircle(34, 60, 15, p.leafA) +
        svgCircle(66, 60, 15, p.leafA) +
        svgCircle(42, 44, 14, p.leafA) +
        svgCircle(60, 44, 14, p.leafA) +
        svgCircle(56, 58, 12, p.leafB, 0.24) +
        svgCircle(44, 62, 11, p.leafB, 0.22);
      return roots + trunk + crown;
    },
    wilted() {
      const stem = `<path d="M 50 116 Q 47 96 52 80 Q 55 70 60 66" stroke="#6f5f45" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      return (
        stem +
        svgBlade(58, 68, 30, 16, 5, 10, "#7c6a49") +
        svgBlade(52, 82, 150, 15, 5, 9, "#5f5238") +
        svgBlade(50, 98, 40, 14, 5, 9, "#6d5c40")
      );
    },
  };

  function buildTreeSVG(speciesId, palette) {
    const drawer = TREE_DRAWERS[speciesId] || TREE_DRAWERS.pine;
    return (
      `<svg class="tree-svg" viewBox="0 0 100 116" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">` +
      drawer(palette) +
      `</svg>`
    );
  }

  function seededRange(seed, salt, min, max) {
    const unit = (hashString(`${seed}:${salt}`) % 1000) / 999;
    return min + (max - min) * unit;
  }

  function getTreeSeed(title) {
    return String(title || "Deep focus").trim().toLowerCase() || "deep focus";
  }

  function hashString(value) {
    let hash = 0;
    const text = String(value);
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
    return hash;
  }

  function cleanMinutes(value, fallback, min) {
    const number = Number.parseInt(value, 10);
    if (Number.isNaN(number)) return fallback;
    return clamp(number, min, 600);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatClock(seconds) {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const leftover = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(leftover).padStart(2, "0")}`;
  }

  function formatMinutes(minutes) {
    const rounded = Math.max(0, Math.round(minutes));
    if (rounded < 60) return `${rounded}m`;
    const hours = Math.floor(rounded / 60);
    const leftover = rounded % 60;
    return leftover ? `${hours}h ${leftover}m` : `${hours}h`;
  }

  function formatRecordDate(value) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function localDateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function startOfWeek(value) {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - date.getDay());
    return date;
  }

  function startOfMonth(date) {
    const d = date instanceof Date ? new Date(date) : new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function formatMonthRange(date) {
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
  }

  function addDays(value, days) {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
  }

  function formatWeekRange(start) {
    const end = addDays(start, 6);
    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    });
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }

  function toDatetimeLocal(value) {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function fromDatetimeLocal(value) {
    return new Date(value);
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
      return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
      (Number(char) ^ (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(char) / 4)))).toString(16)
    );
  }

  function closeDialog() {
    if (typeof els.recordDialog.close === "function") {
      els.recordDialog.close();
    } else {
      els.recordDialog.removeAttribute("open");
    }
  }

  function showToast(message) {
    window.clearTimeout(state.toastId);
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    state.toastId = window.setTimeout(() => {
      els.toast.classList.remove("is-visible");
    }, 3200);
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || window.location.protocol === "file:") return;

    // updateViaCache: "none" forces the browser to revalidate the worker
    // script every load, so a new deploy is picked up promptly. The worker's
    // activate handler then clears old caches and reloads open tabs, which
    // makes every device that already has the site re-download fresh assets.
    navigator.serviceWorker
      .register("./service-worker.js", { updateViaCache: "none" })
      .then((registration) => {
        registration.update().catch((error) => {
          console.warn(error);
        });
      })
      .catch((error) => {
        console.warn(error);
      });
  }
})();
