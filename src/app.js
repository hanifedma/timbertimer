(function () {
  const SUPABASE_MODULE = "https://esm.sh/@supabase/supabase-js@2?bundle";
  const APP_TITLE = "Canopy Focus";
  const STORAGE_SESSIONS = "canopy-focus:sessions:v1";
  const STORAGE_TIMER = "canopy-focus:timer:v1";
  const STORAGE_SESSION_NAME = "canopy-focus:session-name:v1";
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

  const els = {
    modeLabel: document.getElementById("modeLabel"),
    focusForm: document.getElementById("focusForm"),
    sessionTitle: document.getElementById("sessionTitle"),
    durationInput: document.getElementById("durationInput"),
    durationButtons: Array.from(document.querySelectorAll("[data-duration]")),
    timerState: document.getElementById("timerState"),
    timerProgressLabel: document.getElementById("timerProgressLabel"),
    timerDisplay: document.getElementById("timerDisplay"),
    growthStage: document.querySelector(".growth-stage"),
    plant: document.querySelector(".plant"),
    startButton: document.getElementById("startButton"),
    finishButton: document.getElementById("finishButton"),
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
    prevWeekButton: document.getElementById("prevWeekButton"),
    thisWeekButton: document.getElementById("thisWeekButton"),
    nextWeekButton: document.getElementById("nextWeekButton"),
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
    toast: document.getElementById("toast"),
  };

  const state = {
    supabase: null,
    supabaseConfigured: false,
    user: null,
    dataMode: "local",
    sessions: [],
    selectedDuration: DEFAULT_DURATION,
    weekStart: startOfWeek(new Date()),
    timer: null,
    restTimer: null,
    tickId: null,
    toastId: null,
    lastCloudTimerSyncAt: 0,
    cloudTimerSyncing: false,
    timerCompleting: false,
    activeTimerSyncWarningShown: false,
  };

  init();

  async function init() {
    bindEvents();
    await initSupabase();
    await loadSessions();
    hydrateSessionName();
    await hydrateTimer();
    renderAll();
    startTicker();
    registerServiceWorker();
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
      renderTimer();
    });

    els.durationInput.addEventListener("input", () => {
      const minutes = cleanMinutes(els.durationInput.value, DEFAULT_DURATION, 5);
      state.selectedDuration = minutes;
      updateDurationButtons();
      if (!state.timer) {
        updateTimerDisplay(minutes * 60, 0);
      }
    });

    els.startButton.addEventListener("click", startOrResumeTimer);
    els.finishButton.addEventListener("click", finishCurrentSession);
    els.restStartButton.addEventListener("click", startRestTimer);
    els.restResetButton.addEventListener("click", resetRestTimer);

    els.prevWeekButton.addEventListener("click", () => changeWeek(-1));
    els.nextWeekButton.addEventListener("click", () => changeWeek(1));
    els.thisWeekButton.addEventListener("click", () => {
      state.weekStart = startOfWeek(new Date());
      renderWeekGrove();
    });

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
    const config = window.CANOPY_FOCUS_SUPABASE || window.JUNGLE_FOCUS_SUPABASE || {};
    state.supabaseConfigured = Boolean(config.url && config.anonKey);

    if (!state.supabaseConfigured) return;

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

      state.supabase.auth.onAuthStateChange(async (_event, session) => {
        state.user = session ? session.user : null;
        state.dataMode = state.user ? "cloud" : "local";
        await loadSessions();
        await hydrateTimer();
        renderAll();
      });
    } catch (error) {
      state.supabase = null;
      state.supabaseConfigured = false;
      state.dataMode = "local";
      showToast("Cloud sync could not load. Local records are still available.");
      console.warn(error);
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

    const minutes = cleanMinutes(els.durationInput.value, state.selectedDuration, 5);
    const title = els.sessionTitle.value.trim() || "Deep focus";
    const durationSeconds = minutes * 60;

    state.selectedDuration = minutes;
    rememberSessionName(title);
    state.timer = {
      id: createId(),
      status: "running",
      title,
      durationMinutes: minutes,
      durationSeconds,
      startedAt: new Date().toISOString(),
      endAt: Date.now() + durationSeconds * 1000,
      remainingSeconds: durationSeconds,
      cloudSynced: false,
    };

    persistTimer();
    renderTimer();
    showToast("Session started.");
    await saveActiveTimerToCloud();
  }

  async function completeTimer(status) {
    if (!state.timer || state.timerCompleting) return;

    state.timerCompleting = true;
    const timer = state.timer;
    try {
      const claimed = await claimActiveTimer(timer);
      if (!claimed) {
        state.timer = null;
        persistTimer();
        await loadSessions();
        renderAll();
        showToast("Timer already finished on another device.");
        return;
      }

      const elapsedSeconds = getElapsedSeconds();
      const actualMinutes =
        status === "completed"
          ? Math.max(1, Math.round(elapsedSeconds / 60))
          : Math.max(0, Math.round(elapsedSeconds / 60));
      const endedAt = new Date().toISOString();
      const record = {
        id: createId(),
        title: timer.title,
        duration_minutes: timer.durationMinutes,
        actual_minutes: status === "completed" && elapsedSeconds >= timer.durationSeconds - 1
          ? timer.durationMinutes
          : actualMinutes,
        status,
        started_at: timer.startedAt,
        ended_at: endedAt,
        tree_kind: pickTreeKind(timer.title, status),
        created_at: endedAt,
        updated_at: endedAt,
      };

      state.timer = null;
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
    const status = getRemainingSeconds() <= 0 ? "completed" : "abandoned";
    completeTimer(status);
  }

  function startRestTimer() {
    if (state.restTimer) return;

    state.restTimer = {
      startedAt: Date.now(),
    };

    renderRestTimer();
  }

  function resetRestTimer() {
    state.restTimer = null;
    renderRestTimer();
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
      if (state.timer && state.timer.status === "running" && getRemainingSeconds() <= 0) {
        completeTimer("completed");
      }

      if (canUseCloud() && Date.now() - state.lastCloudTimerSyncAt > 15000) {
        refreshCloudActiveTimer();
      }

      if (state.timer) {
        renderTimer();
      }
      renderRestTimer();
    }, 1000);
  }

  function renderAll() {
    renderAccount();
    renderStats();
    renderWeekGrove();
    renderRecords();
    renderTimer();
    renderRestTimer();
    refreshIcons();
  }

  function renderTimer() {
    const timer = state.timer;
    const remainingSeconds = timer ? getRemainingSeconds() : state.selectedDuration * 60;
    const durationSeconds = timer ? timer.durationSeconds : state.selectedDuration * 60;
    const progress = durationSeconds ? clamp(1 - remainingSeconds / durationSeconds, 0, 1) : 0;

    updateTimerDisplay(remainingSeconds, progress);
    updateDocumentTitle();

    if (!timer) {
      els.timerState.textContent = "Ready";
      els.startButton.disabled = false;
      els.finishButton.disabled = true;
      setButtonLabel(els.startButton, "Start", "play");
      setFormDisabled(false);
      refreshIcons();
      return;
    }

    els.timerState.textContent = "Growing";
    els.startButton.disabled = true;
    els.finishButton.disabled = false;
    setButtonLabel(els.startButton, "Start", "play");
    setFormDisabled(true);
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
    setButtonLabel(els.restStartButton, "Start rest", "play");
    updateDocumentTitle();
    refreshIcons();
  }

  function updateDocumentTitle() {
    if (state.timer) {
      document.title = `Focus running | ${APP_TITLE}`;
      return;
    }

    if (state.restTimer) {
      document.title = `${formatClock(getRestElapsedSeconds())} Rest | ${APP_TITLE}`;
      return;
    }

    document.title = `Ready | ${APP_TITLE}`;
  }

  function updateTimerDisplay(remainingSeconds, progress) {
    els.timerDisplay.textContent = formatClock(remainingSeconds);
    els.timerProgressLabel.textContent = `${Math.round(progress * 100)}%`;
    els.growthStage.style.setProperty("--growth", String(Math.max(0.08, progress)));
    renderActiveTree();
  }

  function renderActiveTree() {
    const title = state.timer ? state.timer.title : els.sessionTitle.value;
    const species = getTreeForSession(title, "completed");
    const palette = getTreePalette(title);
    els.plant.className = `plant plant-${species.id}`;
    els.growthStage.dataset.tree = species.id;
    els.growthStage.style.setProperty("--active-leaf-a", palette.leafA);
    els.growthStage.style.setProperty("--active-leaf-b", palette.leafB);
    els.growthStage.style.setProperty("--active-bark-a", palette.barkA);
    els.growthStage.style.setProperty("--active-bark-b", palette.barkB);
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
    const start = new Date(state.weekStart);
    const end = addDays(start, 7);
    const completed = state.sessions
      .filter((record) => {
        const plantedAt = new Date(record.ended_at || record.started_at);
        return record.status === "completed" && plantedAt >= start && plantedAt < end;
      })
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
    const totalMinutes = completed.reduce((sum, record) => sum + Number(record.actual_minutes || 0), 0);
    const currentWeek = startOfWeek(new Date());

    els.weekRange.textContent = formatWeekRange(start);
    els.weekTreeCount.textContent = `${completed.length} ${completed.length === 1 ? "tree" : "trees"}`;
    els.weekFocusTime.textContent = `${formatMinutes(totalMinutes)} focused`;
    els.nextWeekButton.disabled = start.getTime() >= currentWeek.getTime();
    els.thisWeekButton.disabled = start.getTime() === currentWeek.getTime();

    els.weekForest.replaceChildren();

    if (!completed.length) {
      const empty = document.createElement("div");
      empty.className = "week-forest-empty";
      empty.textContent = "No trees planted this week.";
      els.weekForest.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    completed.forEach((record, index) => {
      fragment.appendChild(createGroveTree(record, index));
    });
    els.weekForest.appendChild(fragment);
  }

  function changeWeek(direction) {
    state.weekStart = addDays(state.weekStart, direction * 7);
    renderWeekGrove();
  }

  function createGroveTree(record, index) {
    const species = getTreeForSession(record.title, record.status);
    const seed = getTreeSeed(record.title);
    const palette = getTreePalette(seed);
    const shape = hashString(`${seed}:shape`) % 4;
    const tree = document.createElement("article");
    tree.className = `grove-tree species-${species.id} shape-${shape}`;
    tree.style.setProperty("--tree-delay", `${(index % 9) * 40}ms`);
    tree.style.setProperty("--tree-leaf-a", palette.leafA);
    tree.style.setProperty("--tree-leaf-b", palette.leafB);
    tree.style.setProperty("--tree-bark-a", palette.barkA);
    tree.style.setProperty("--tree-bark-b", palette.barkB);
    tree.style.setProperty("--tree-size", getGroveTreeScale(seed));
    tree.style.setProperty("--tree-tilt", `${Math.round(seededRange(seed, "tilt", -5, 5))}deg`);
    tree.style.setProperty("--tree-floor", `${Math.round(seededRange(seed, "floor", -5, 5))}px`);
    tree.style.setProperty("--tree-shift", `${Math.round(seededRange(seed, "shift", -4, 4))}px`);
    tree.style.setProperty("--tree-girth", `${Math.round(seededRange(seed, "girth", -3, 5))}px`);
    tree.style.setProperty("--tree-depth", `${Math.round(seededRange(seed, "depth", -2, 4))}px`);
    tree.style.setProperty("--tree-trunk-width", `${seededRange(seed, "trunk-width", 7, 11).toFixed(1)}px`);
    tree.style.setProperty("--tree-trunk-height", `${seededRange(seed, "trunk-height", 34, 44).toFixed(1)}px`);
    tree.style.setProperty("--tree-branch-width", `${seededRange(seed, "branch-width", 20, 29).toFixed(1)}px`);
    tree.style.setProperty("--tree-crown-scale", seededRange(seed, "crown-scale", 0.9, 1.14).toFixed(2));
    tree.style.setProperty("--tree-crown-tall", seededRange(seed, "crown-tall", 0.88, 1.16).toFixed(2));
    tree.style.setProperty("--tree-crown-a-x", `${Math.round(seededRange(seed, "crown-a-x", -4, 4))}px`);
    tree.style.setProperty("--tree-crown-a-y", `${Math.round(seededRange(seed, "crown-a-y", -4, 3))}px`);
    tree.style.setProperty("--tree-crown-b-x", `${Math.round(seededRange(seed, "crown-b-x", -3, 4))}px`);
    tree.style.setProperty("--tree-crown-b-y", `${Math.round(seededRange(seed, "crown-b-y", -5, 3))}px`);
    tree.style.setProperty("--tree-crown-c-x", `${Math.round(seededRange(seed, "crown-c-x", -4, 4))}px`);
    tree.style.setProperty("--tree-crown-c-y", `${Math.round(seededRange(seed, "crown-c-y", -3, 5))}px`);
    tree.style.setProperty("--tree-shadow-width", `${seededRange(seed, "shadow", 44, 60).toFixed(1)}px`);
    tree.style.setProperty("--tree-mound-width", `${seededRange(seed, "mound", 32, 46).toFixed(1)}px`);
    tree.title = `${record.title}: ${species.label}, ${record.actual_minutes}m`;
    tree.setAttribute(
      "aria-label",
      `${record.title}, ${species.label}, ${record.actual_minutes} focused minutes`
    );

    const visual = document.createElement("span");
    visual.className = "tree-visual";
    visual.setAttribute("aria-hidden", "true");
    visual.innerHTML =
      '<span class="tree-shadow"></span><span class="tree-trunk"></span><span class="tree-branch limb-a"></span><span class="tree-branch limb-b"></span><span class="tree-branch limb-c"></span><span class="tree-crown crown-a"></span><span class="tree-crown crown-b"></span><span class="tree-crown crown-c"></span>';

    const label = document.createElement("span");
    label.className = "tree-label";
    label.textContent = record.title;

    tree.append(visual, label);
    return tree;
  }

  function getGroveTreeScale(seed) {
    return seededRange(seed, "size", 0.94, 1.14).toFixed(2);
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
      els.syncBadge.textContent = "Ready";
      els.modeLabel.textContent = "Supabase ready";
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

    els.dialogTitle.textContent = record ? "Edit session" : "Add session";
    els.recordIdInput.value = value.id;
    els.recordTitleInput.value = value.title;
    els.recordStartedInput.value = toDatetimeLocal(value.started_at);
    els.recordStatusInput.value = value.status;
    els.recordDurationInput.value = value.duration_minutes;
    els.recordActualInput.value = value.actual_minutes;

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
    const changes = {
      id,
      title: els.recordTitleInput.value.trim() || "Deep focus",
      started_at: startedAt.toISOString(),
      ended_at: endedAt,
      status: els.recordStatusInput.value,
      duration_minutes: durationMinutes,
      actual_minutes: actualMinutes,
      tree_kind: pickTreeKind(els.recordTitleInput.value.trim(), els.recordStatusInput.value),
      updated_at: new Date().toISOString(),
    };

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
  }

  function rememberSessionName(value) {
    const title = (value || els.sessionTitle.value || "Deep focus").trim() || "Deep focus";
    localStorage.setItem(STORAGE_SESSION_NAME, title);
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
      status: "running",
      title: (timer.title || "Deep focus").trim() || "Deep focus",
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
      tree_kind: pickTreeKind(title, status),
      created_at: record.created_at || now,
      updated_at: record.updated_at || now,
    };
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
      title: row.title,
      id: row.timer_id,
      durationMinutes: row.duration_minutes,
      durationSeconds: row.duration_seconds,
      startedAt: row.started_at,
      endAt: row.end_at,
      cloudSynced: true,
    });
  }

  function setDuration(minutes) {
    state.selectedDuration = cleanMinutes(minutes, DEFAULT_DURATION, 5);
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
    return Math.max(0, state.timer.durationSeconds - getRemainingSeconds());
  }

  function sortedSessions() {
    return [...state.sessions].sort(sortByStartedDesc);
  }

  function sortByStartedDesc(a, b) {
    return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
  }

  function pickTreeKind(title, status) {
    return getTreeForSession(title, status).label;
  }

  function getTreeForSession(title, status) {
    if (status === "abandoned") return WILTED_TREE;
    return TREE_SPECIES[hashString(getTreeSeed(title)) % TREE_SPECIES.length];
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

    navigator.serviceWorker
      .register("./service-worker.js")
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
