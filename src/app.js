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
  const STORAGE_THEME = "timbertimer:theme:v1";
  const THEME_COLORS = { dark: "#000000", light: "#f2f2f7" };
  const STORAGE_LANG = "timbertimer:lang:v1";
  const STORAGE_PROJECTS = "timbertimer:projects:v1";
  const STORAGE_SELECTED_PROJECT = "timbertimer:project:v1";
  const STORAGE_TASK_PROJECT = "timbertimer:task-project:v1";
  const STORAGE_CAL_DAYS = "timbertimer:cal-days:v1";
  const STORAGE_CAL_ZOOM = "timbertimer:cal-zoom:v1";
  const DEFAULT_DURATION = 25;
  // A record can now span at most one day: the calendar edits real start/end
  // times, and the database check constraints allow the same ceiling.
  const MAX_RECORD_MINUTES = 1440;

  // --- Projects ------------------------------------------------------------
  // Every record belongs to a project, and the project owns both the colour and
  // the tree species its records are drawn with. Two projects exist from the
  // start and cannot be deleted: the default focus project, and Rest.
  const DEFAULT_PROJECT_ID = "focus";
  const REST_PROJECT_ID = "rest";
  const BUILTIN_PROJECT_IDS = [DEFAULT_PROJECT_ID, REST_PROJECT_ID];
  // Records made before projects existed are mapped to a project derived from
  // their title, using this id prefix, so history keeps working untouched.
  const LEGACY_PROJECT_PREFIX = "t:";

  // A Toggl-like picker: distinct at a glance, and readable on both themes.
  const PROJECT_COLORS = [
    "#9e5bd9", "#0b83d9", "#d94182", "#e36a00",
    "#2da608", "#06a893", "#465bb3", "#c9806b",
    "#bf7000", "#c7af14", "#566614", "#d92b2b",
    "#e57cd8", "#3866a3", "#a5449e", "#525266",
  ];
  const REST_PROJECT_COLOR = "#a1866f";
  const MISSING_PROJECT_COLOR = "#8e8e93";

  // Calendar zoom is stored in pixels per hour.
  const CAL_MIN_ZOOM = 26;
  const CAL_MAX_ZOOM = 240;
  const CAL_DEFAULT_ZOOM = 64;
  const CAL_ZOOM_STEP = 1.3;
  const CAL_DEFAULT_DAYS = 3;
  // Dragging on the grid snaps to five minutes, fine enough to place a record
  // exactly without having to fight the pointer.
  const CAL_SNAP_MINUTES = 5;
  const CAL_MIN_MINUTES = 5;
  const CAL_DRAG_THRESHOLD = 4;
  // A finger has to rest briefly before it drags, so a swipe still scrolls.
  const CAL_LONG_PRESS_MS = 320;

  // --- i18n (English default, Korean opt-in) ------------------------------
  const TR = {
    "nav.account": { en: "Account", ko: "계정" },
    "nav.local": { en: "Local", ko: "로컬" },
    "nav.sign_in": { en: "Sign in", ko: "로그인" },
    "nav.signed_in": { en: "Signed in", ko: "로그인됨" },
    "lang.switch": { en: "언어 / Language", ko: "언어 / Language" },
    "theme.switch": { en: "Switch appearance", ko: "테마 전환" },
    "app.slogan": { en: "Forget all else, feel the timber grow.", ko: "모든 걸 잊고, 나무가 자라는 걸 느껴보세요." },
    "mode.countdown": { en: "Countdown", ko: "카운트다운" },
    "mode.stopwatch": { en: "Stopwatch", ko: "스톱워치" },
    "field.session": { en: "Task", ko: "작업" },
    "field.duration": { en: "Duration", ko: "시간" },
    "field.custom": { en: "Custom", ko: "직접 입력" },
    "field.tree": { en: "Tree", ko: "나무" },
    "field.started": { en: "Started", ko: "시작 시각" },
    "field.status": { en: "Status", ko: "상태" },
    "field.goal_minutes": { en: "Goal minutes", ko: "목표 (분)" },
    "field.actual_minutes": { en: "Actual minutes", ko: "실제 (분)" },
    "timer.ready": { en: "Ready", ko: "준비됨" },
    "timer.growing": { en: "Growing", ko: "자라는 중" },
    "btn.start": { en: "Start", ko: "시작" },
    "btn.finish": { en: "Finish", ko: "완료" },
    "btn.cancel": { en: "Cancel", ko: "취소" },
    "btn.save": { en: "Save", ko: "저장" },
    "sound.on": { en: "Sound on", ko: "소리 켜짐" },
    "sound.off": { en: "Sound off", ko: "소리 꺼짐" },
    "rest.title": { en: "Rest stopwatch", ko: "휴식 스톱워치" },
    "rest.resting": { en: "Resting", ko: "휴식 중" },
    "rest.elapsed": { en: "Elapsed", ko: "경과" },
    "rest.start": { en: "Start rest", ko: "휴식 시작" },
    "rest.finish": { en: "Finish rest", ko: "휴식 완료" },
    "rest.record_title": { en: "Rest", ko: "휴식" },
    "record.rested": { en: "Rested", ko: "휴식함" },
    "toast.rest_planted": { en: "Rest planted a wilted tree.", ko: "휴식이 시든 나무를 심었어요." },
    "toast.rest_discarded": { en: "Rest was too short to plant.", ko: "휴식이 너무 짧아 심지 않았어요." },
    "notes.kicker": { en: "Tasks", ko: "할 일" },
    "notes.title": { en: "To-Do", ko: "투두" },
    "notes.placeholder": { en: "Add a task…", ko: "할 일 추가…" },
    "notes.add": { en: "Add task", ko: "할 일 추가" },
    "notes.empty": { en: "No tasks yet.", ko: "아직 할 일이 없어요." },
    "notes.mark_complete": { en: "Mark complete", ko: "완료로 표시" },
    "notes.mark_incomplete": { en: "Mark incomplete", ko: "미완료로 표시" },
    "notes.delete": { en: "Delete task", ko: "할 일 삭제" },
    "records.kicker": { en: "Forest record", ko: "숲 기록" },
    "records.title": { en: "Focus history", ko: "집중 기록" },
    "records.add": { en: "Add session", ko: "세션 추가" },
    "records.search": { en: "Search records", ko: "기록 검색" },
    "records.empty": { en: "No records yet.", ko: "아직 기록이 없어요." },
    "stats.today": { en: "Today", ko: "오늘" },
    "stats.total": { en: "Total", ko: "전체" },
    "grove.weekly": { en: "Weekly forest", ko: "주간 숲" },
    "grove.monthly": { en: "Monthly forest", ko: "월간 숲" },
    "grove.today": { en: "Today's forest", ko: "오늘의 숲" },
    "grove.current": { en: "Current", ko: "현재" },
    "grove.view_today": { en: "Today", ko: "오늘" },
    "grove.view_week": { en: "Week", ko: "주" },
    "grove.view_month": { en: "Month", ko: "월" },
    "grove.loading": { en: "Loading", ko: "불러오는 중" },
    "grove.empty_today": { en: "No trees planted today.", ko: "오늘 심은 나무가 없어요." },
    "grove.empty_week": { en: "No trees planted this week.", ko: "이번 주에 심은 나무가 없어요." },
    "grove.empty_month": { en: "No trees planted this month.", ko: "이번 달에 심은 나무가 없어요." },
    "grove.tree_one": { en: "1 tree", ko: "1그루" },
    "grove.trees": { en: "{n} trees", ko: "{n}그루" },
    "grove.focused": { en: "{time} focused", ko: "{time} 집중" },
    "grove.rested": { en: "{time} rested", ko: "{time} 휴식" },
    "filter.all": { en: "All", ko: "전체" },
    "filter.completed": { en: "Completed", ko: "완료" },
    "filter.abandoned": { en: "Abandoned", ko: "중단" },
    "status.completed": { en: "Completed", ko: "완료" },
    "status.abandoned": { en: "Abandoned", ko: "중단" },
    "record.planted": { en: "Planted", ko: "심음" },
    "record.abandoned": { en: "Abandoned", ko: "중단" },
    "metric.focused": { en: "{n}m focused", ko: "{n}분 집중" },
    "metric.goal": { en: "{n}m goal", ko: "목표 {n}분" },
    "action.edit": { en: "Edit", ko: "편집" },
    "action.delete": { en: "Delete", ko: "삭제" },
    "account.kicker": { en: "Accounts", ko: "계정" },
    "account.title": { en: "Google sync", ko: "Google 동기화" },
    "account.close": { en: "Close", ko: "닫기" },
    "account.status_local": { en: "Records are saved in this browser.", ko: "기록이 이 브라우저에 저장됩니다." },
    "account.status_cloud": { en: "Use Google to sync records across devices.", ko: "Google로 로그인하면 기기 간에 동기화돼요." },
    "account.continue_google": { en: "Continue with Google", ko: "Google로 계속하기" },
    "account.other_way": { en: "Trouble signing in? Use the redirect", ko: "로그인이 안 되나요? 리디렉션 사용" },
    "account.sign_out": { en: "Sign out", ko: "로그아웃" },
    "account.delete_all": { en: "Delete all records", ko: "모든 기록 삭제" },
    "badge.local": { en: "Local", ko: "로컬" },
    "badge.ready": { en: "Ready", ko: "대기" },
    "badge.synced": { en: "Synced", ko: "동기화됨" },
    "brand.local_garden": { en: "Local garden", ko: "로컬 정원" },
    "brand.cloud_garden": { en: "Cloud garden", ko: "클라우드 정원" },
    "dialog.record": { en: "Record", ko: "기록" },
    "dialog.edit_session": { en: "Edit session", ko: "세션 편집" },
    "dialog.add_session": { en: "Add session", ko: "세션 추가" },
    "dialog.end_before_start": { en: "The end time is before the start time.", ko: "종료 시각이 시작 시각보다 빨라요." },
    "footer.tagline": { en: "🌲 <strong>TimberTimer</strong> — grow a forest while you focus.", ko: "🌲 <strong>TimberTimer</strong> — 집중하며 숲을 키워요." },
    "footer.meta": { en: "Your records stay in this browser, or sync privately with Google.", ko: "기록은 이 브라우저에 저장되거나 Google로 비공개 동기화됩니다." },
    "toast.session_started": { en: "Session started.", ko: "세션을 시작했어요." },
    "toast.stopwatch_started": { en: "Stopwatch started.", ko: "스톱워치를 시작했어요." },
    "toast.session_planted": { en: "Session planted.", ko: "세션을 심었어요." },
    "toast.session_abandoned": { en: "Session recorded as abandoned.", ko: "세션을 중단으로 기록했어요." },
    "toast.timer_finished_elsewhere": { en: "Timer already finished on another device.", ko: "다른 기기에서 이미 타이머가 끝났어요." },
    "toast.record_saved": { en: "Record saved.", ko: "기록을 저장했어요." },
    "toast.record_deleted": { en: "Record deleted.", ko: "기록을 삭제했어요." },
    "toast.signed_out": { en: "Signed out.", ko: "로그아웃했어요." },
    "toast.google_id_failed": {
      en: "Google sign-in didn't complete. Try the button below.",
      ko: "Google 로그인을 마치지 못했어요. 아래 버튼을 사용해 보세요.",
    },
    "toast.sound_on": { en: "Timer sound on.", ko: "타이머 소리를 켰어요." },
    "toast.sound_off": { en: "Timer sound off.", ko: "타이머 소리를 껐어요." },
    "toast.all_deleted": { en: "All records deleted.", ko: "모든 기록을 삭제했어요." },
    "toast.cloud_load_fail": { en: "Cloud sync could not load. Local records are still available.", ko: "클라우드 동기화를 불러오지 못했어요. 로컬 기록은 그대로 사용할 수 있어요." },
    "toast.cloud_not_ready": { en: "Cloud table is not ready. Using local records.", ko: "클라우드 테이블이 준비되지 않았어요. 로컬 기록을 사용해요." },
    "toast.cloud_save_fail": { en: "Cloud save failed. Saved locally.", ko: "클라우드 저장에 실패했어요. 로컬에 저장했어요." },
    "toast.cloud_update_fail": { en: "Cloud update failed.", ko: "클라우드 업데이트에 실패했어요." },
    "toast.cloud_delete_fail": { en: "Cloud delete failed.", ko: "클라우드 삭제에 실패했어요." },
    "toast.cloud_delete_all_fail": { en: "Failed to delete cloud records.", ko: "클라우드 기록 삭제에 실패했어요." },
    "toast.cloud_timer_sql": { en: "Cloud timer sync needs the updated Supabase SQL.", ko: "클라우드 타이머 동기화에는 최신 Supabase SQL이 필요해요." },
    "confirm.delete_all_cloud": { en: "Delete all cloud records? This cannot be undone.", ko: "모든 클라우드 기록을 삭제할까요? 되돌릴 수 없어요." },
    "confirm.delete_all_local": { en: "Delete all local records? This cannot be undone.", ko: "모든 로컬 기록을 삭제할까요? 되돌릴 수 없어요." },
    "confirm.delete_record": { en: 'Delete "{title}"?', ko: '"{title}"을(를) 삭제할까요?' },
    "title.focus": { en: "Focus", ko: "집중" },
    "title.rest": { en: "Rest", ko: "휴식" },
    "title.ready": { en: "Ready", ko: "준비됨" },
    "unit.m": { en: "m", ko: "분" },
    "unit.h": { en: "h", ko: "시간" },
    "tree.canopy": { en: "Canopy tree", ko: "캐노피 나무" },
    "tree.palm": { en: "Palm tree", ko: "야자수" },
    "tree.pine": { en: "Pine tree", ko: "소나무" },
    "tree.bamboo": { en: "Bamboo stand", ko: "대나무" },
    "tree.fern": { en: "Fern tree", ko: "고사리 나무" },
    "tree.kapok": { en: "Kapok tree", ko: "케이폭 나무" },
    "tree.mangrove": { en: "Mangrove tree", ko: "맹그로브 나무" },
    "tree.wilted": { en: "Wilted sprout", ko: "시든 새싹" },

    // Views
    "view.focus": { en: "Focus", ko: "집중" },
    "view.calendar": { en: "Calendar", ko: "캘린더" },

    // Projects
    "field.project": { en: "Project", ko: "프로젝트" },
    "field.tree_project": { en: "Tree (per project)", ko: "나무 (프로젝트별)" },
    "field.task_placeholder": { en: "Task name (optional)", ko: "작업 이름 (선택)" },
    "field.ended": { en: "Ended", ko: "종료 시각" },
    "project.kicker": { en: "Projects", ko: "프로젝트" },
    "project.manage": { en: "Manage projects", ko: "프로젝트 관리" },
    "project.new": { en: "New project", ko: "새 프로젝트" },
    "project.edit": { en: "Edit project", ko: "프로젝트 편집" },
    "project.name": { en: "Project name", ko: "프로젝트 이름" },
    "project.color": { en: "Color", ko: "색상" },
    "project.delete": { en: "Delete project", ko: "프로젝트 삭제" },
    "project.default_name": { en: "Focus", ko: "집중" },
    "project.rest_name": { en: "Rest", ko: "휴식" },
    "project.none": { en: "No project", ko: "프로젝트 없음" },
    "project.builtin": { en: "Built-in", ko: "기본" },
    "project.records": { en: "{n} records", ko: "기록 {n}개" },
    "project.record_one": { en: "1 record", ko: "기록 1개" },
    "project.name_taken": { en: "A project with that name already exists.", ko: "같은 이름의 프로젝트가 이미 있어요." },
    "toast.project_saved": { en: "Project saved.", ko: "프로젝트를 저장했어요." },
    "toast.project_deleted": { en: "Project deleted.", ko: "프로젝트를 삭제했어요." },
    "toast.project_builtin": { en: "Built-in projects cannot be deleted.", ko: "기본 프로젝트는 삭제할 수 없어요." },
    "toast.cloud_projects_fail": { en: "Cloud project sync failed. Saved on this device.", ko: "프로젝트 동기화에 실패했어요. 이 기기에 저장했어요." },
    "confirm.move_record": {
      en: 'Move "{title}" here?\n\n{from}\n→  {to}',
      ko: '"{title}"을(를) 여기로 옮길까요?\n\n{from}\n→  {to}',
    },
    "confirm.resize_record": {
      en: 'Change the time of "{title}"?\n\n{from}\n→  {to}',
      ko: '"{title}"의 시간을 바꿀까요?\n\n{from}\n→  {to}',
    },
    "confirm.delete_project": {
      en: 'Delete "{name}"? Its {n} records move to "{target}".',
      ko: '"{name}"을(를) 삭제할까요? 기록 {n}개가 "{target}"(으)로 옮겨져요.',
    },

    // Project summary
    "summary.kicker": { en: "Projects", ko: "프로젝트" },
    "summary.title": { en: "Time by project", ko: "프로젝트별 시간" },
    "summary.chart_label": { en: "Time by project", ko: "프로젝트별 시간" },
    "summary.empty": { en: "No time tracked in this period.", ko: "이 기간에 기록된 시간이 없어요." },
    "summary.projects": { en: "{n} projects", ko: "프로젝트 {n}개" },
    "summary.project_one": { en: "1 project", ko: "프로젝트 1개" },

    // Calendar
    "calendar.kicker": { en: "Timeline", ko: "타임라인" },
    "calendar.title": { en: "Calendar", ko: "캘린더" },
    "calendar.today": { en: "Today", ko: "오늘" },
    "calendar.prev": { en: "Previous", ko: "이전" },
    "calendar.next": { en: "Next", ko: "다음" },
    "calendar.days_label": { en: "Days", ko: "일수" },
    "calendar.zoom": { en: "Zoom", ko: "확대/축소" },
    "calendar.zoom_in": { en: "Zoom in", ko: "확대" },
    "calendar.zoom_out": { en: "Zoom out", ko: "축소" },
    "calendar.running": { en: "Running", ko: "진행 중" },
    "calendar.hint": {
      en: "Drag empty space to add a record, drag a block to move it, or its edges to change the time. Tap to edit.",
      ko: "빈 곳을 드래그해 기록을 추가하고, 블록을 드래그해 옮기거나 가장자리로 시간을 바꾸세요. 누르면 편집돼요.",
    },
    "grove.prev": { en: "Previous", ko: "이전" },
    "grove.next": { en: "Next", ko: "다음" },
    "record.in_progress": { en: "In progress", ko: "진행 중" },
  };

  function loadLang() {
    return localStorage.getItem(STORAGE_LANG) === "ko" ? "ko" : "en";
  }

  function t(key, vars) {
    const entry = TR[key];
    let s = entry ? (entry[state.lang] || entry.en) : key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        s = s.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
      });
    }
    return s;
  }

  function localeTag() {
    return state.lang === "ko" ? "ko" : "en";
  }

  // Translated display name for a tree species (records store English labels).
  function treeDisplayFromKind(kind) {
    const species = TREE_SPECIES.find((s) => s.label === kind);
    if (species) return t("tree." + species.id);
    if (kind === WILTED_TREE.label) return t("tree.wilted");
    return kind;
  }

  function applyStaticI18n() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.setAttribute("placeholder", t(el.dataset.i18nPh));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.dataset.i18nAria));
    });
  }

  function applyLanguage() {
    document.documentElement.lang = state.lang;
    applyStaticI18n();
    if (els.langLabel) els.langLabel.textContent = state.lang === "en" ? "한국어" : "English";
    renderAll();
  }

  function toggleLanguage() {
    state.lang = state.lang === "en" ? "ko" : "en";
    localStorage.setItem(STORAGE_LANG, state.lang);
    applyLanguage();
  }
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
  // Stored untranslated so a record means the same in every language; the list
  // shows a translated label instead.
  const REST_RECORD_TITLE = "Rest";

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
    restStage: document.getElementById("restStage"),
    restPlant: document.getElementById("restPlant"),
    weekRange: document.getElementById("weekRange"),
    weekTreeCount: document.getElementById("weekTreeCount"),
    weekFocusTime: document.getElementById("weekFocusTime"),
    weekRestTime: document.getElementById("weekRestTime"),
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
    googleButtonHolder: document.getElementById("googleButtonHolder"),
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
    recordEndedInput: document.getElementById("recordEndedInput"),
    recordProjectInput: document.getElementById("recordProjectInput"),
    recordProjectDot: document.getElementById("recordProjectDot"),
    recordDurationHint: document.getElementById("recordDurationHint"),
    deleteRecordButton: document.getElementById("deleteRecordButton"),
    saveRecordButton: document.getElementById("saveRecordButton"),
    toast: document.getElementById("toast"),

    // Projects
    projectPicker: document.getElementById("projectPicker"),
    projectDot: document.getElementById("projectDot"),
    manageProjectsButton: document.getElementById("manageProjectsButton"),
    projectsDialog: document.getElementById("projectsDialog"),
    projectsList: document.getElementById("projectsList"),
    closeProjectsDialogButton: document.getElementById("closeProjectsDialogButton"),
    newProjectButton: document.getElementById("newProjectButton"),
    projectDialog: document.getElementById("projectDialog"),
    projectForm: document.getElementById("projectForm"),
    projectDialogTitle: document.getElementById("projectDialogTitle"),
    projectIdInput: document.getElementById("projectIdInput"),
    projectNameInput: document.getElementById("projectNameInput"),
    projectColorGrid: document.getElementById("projectColorGrid"),
    projectTreeInput: document.getElementById("projectTreeInput"),
    projectPreviewPlant: document.getElementById("projectPreviewPlant"),
    projectPreviewName: document.getElementById("projectPreviewName"),
    saveProjectButton: document.getElementById("saveProjectButton"),
    deleteProjectButton: document.getElementById("deleteProjectButton"),

    // Project summary
    summaryTotal: document.getElementById("summaryTotal"),
    summaryEmpty: document.getElementById("summaryEmpty"),
    summaryBody: document.querySelector(".summary-body"),
    projectDonut: document.getElementById("projectDonut"),
    donutTotal: document.getElementById("donutTotal"),
    donutCount: document.getElementById("donutCount"),
    projectLegend: document.getElementById("projectLegend"),

    // Views + calendar
    viewFocusTab: document.getElementById("viewFocusTab"),
    viewCalendarTab: document.getElementById("viewCalendarTab"),
    workspace: document.getElementById("main"),
    calendarView: document.getElementById("calendarView"),
    calScroll: document.getElementById("calScroll"),
    calGrid: document.getElementById("calGrid"),
    calRange: document.getElementById("calRange"),
    calPrevButton: document.getElementById("calPrevButton"),
    calNextButton: document.getElementById("calNextButton"),
    calTodayButton: document.getElementById("calTodayButton"),
    calDaysSelect: document.getElementById("calDaysSelect"),
    calZoomInButton: document.getElementById("calZoomInButton"),
    calZoomOutButton: document.getElementById("calZoomOutButton"),
    calAddButton: document.getElementById("calAddButton"),
    modeCountdownButton: document.getElementById("modeCountdownButton"),
    modeStopwatchButton: document.getElementById("modeStopwatchButton"),
    durationField: document.getElementById("durationField"),
    deleteAllDataButton: document.getElementById("deleteAllDataButton"),
    volumeRow: document.getElementById("volumeRow"),
    volumeSlider: document.getElementById("volumeSlider"),
    volumeLabel: document.getElementById("volumeLabel"),
    themeToggleButton: document.getElementById("themeToggleButton"),
    themeColorMeta: document.getElementById("themeColorMeta"),
    langToggleButton: document.getElementById("langToggleButton"),
    langLabel: document.getElementById("langLabel"),
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
    theme: loadTheme(),
    lang: loadLang(),
    selectedTreeId: "pine",
    projects: [],
    selectedProjectId: loadSelectedProjectId(),
    // Which view is on screen ("timer" or "calendar"), mirrored in the hash.
    view: "timer",
    calDays: loadCalDays(),
    calZoom: loadCalZoom(),
    calAnchor: startOfDay(new Date()),
    calMinuteStamp: 0,
    // Live calendar drag (create / move / resize), and the click it must eat.
    calDrag: null,
    calSuppressClick: false,
    projectsCloudMissing: false,
    // Google Identity Services: loaded on demand, with the nonce that ties the
    // token Google hands back to this particular sign-in.
    gsiPromise: null,
    googleNonce: null,
    activeTimerProjectMissing: false,
    sessionsProjectColumnMissing: false,
    notes: [],
    audioContext: null,
    activeSoundMasters: [],
    finishSoonSoundTimerId: null,
    weekStart: startOfWeek(new Date()),
    // Today is the default period for the forest and the project summary.
    groveView: "today",
    monthStart: startOfMonth(new Date()),
    timer: null,
    restTimer: null,
    tickId: null,
    toastId: null,
    lastCloudTimerSyncAt: 0,
    lastCloudNotesSyncAt: 0,
    lastCloudSessionsSyncAt: 0,
    // Signature of the last records fetch, so the poll re-renders only on a
    // real change (a delete on another device included) instead of every tick.
    lastSessionsSig: null,
    // Set if the notes table predates the sort_order column, so ordering
    // gracefully falls back to this device's saved order.
    notesSortColumnMissing: false,
    cloudTimerSyncing: false,
    timerCompleting: false,
    activeTimerSyncWarningShown: false,
    // Realtime subscription. `realtimeLive` gates how hard the poll below has
    // to work: with a live socket it becomes a safety net rather than the
    // mechanism, but a project whose tables are not published for replication
    // never gets one, so polling must keep working untouched.
    realtimeChannel: null,
    realtimeLive: false,
  };

  init();

  async function init() {
    bindEvents();
    // Translate static text up front (English by default, Korean if saved).
    document.documentElement.lang = state.lang;
    applyStaticI18n();
    if (els.langLabel) els.langLabel.textContent = state.lang === "en" ? "한국어" : "English";
    // Phase 1: paint visuals from local storage immediately so nothing is stuck
    // on "Loading" while the Supabase library downloads from its CDN. The live
    // timer is hydrated later (phase 2) so an expired timer is reconciled and
    // completed exactly once, with the correct local/cloud context.
    await loadProjects();
    await loadSessions();
    await reconcileProjects();
    hydrateSessionName();
    await loadNotes();
    applyRoute();
    renderAll();
    startTicker();
    registerServiceWorker();

    // Phase 2: bring up cloud, reload from it if signed in, then hydrate timers.
    await initSupabase();
    if (state.user) {
      await loadProjects();
      await loadSessions();
      await reconcileProjects();
      await loadNotes();
    }
    await hydrateTimer();
    // The active timer fixes the project (and therefore the tree); otherwise the
    // picker follows whichever project is selected.
    if (state.timer?.projectId) state.selectedProjectId = state.timer.projectId;
    syncSelectedTree();
    await hydrateRestTimer();
    renderAll();
  }

  // Load every piece of remote/local state and repaint. Shared by startup and
  // by auth changes; only startup also seeds the session-name field.
  async function reloadState({ hydrateName = false } = {}) {
    await loadProjects();
    await loadSessions();
    await reconcileProjects();
    if (hydrateName) hydrateSessionName();
    await hydrateTimer();
    // A running timer fixes the species; otherwise re-resolve from the current
    // name so a freshly-loaded (e.g. just-signed-in) history takes effect.
    // The active timer fixes the project (and therefore the tree); otherwise the
    // picker follows whichever project is selected.
    if (state.timer?.projectId) state.selectedProjectId = state.timer.projectId;
    syncSelectedTree();
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
      applyProjectForTitle(els.sessionTitle.value);
    });

    // The tree belongs to the project now, so picking one here re-plants every
    // record of that project.
    els.treePicker.addEventListener("change", async () => {
      state.selectedTreeId = els.treePicker.value;
      const project = getProject(state.selectedProjectId);
      if (project.missing) return;
      await saveProject({ ...project, tree: state.selectedTreeId });
      renderAll();
    });

    els.projectPicker.addEventListener("change", () => {
      setSelectedProject(els.projectPicker.value);
    });

    els.manageProjectsButton.addEventListener("click", openProjectsDialog);
    els.closeProjectsDialogButton.addEventListener("click", closeProjectsDialog);
    els.newProjectButton.addEventListener("click", () => openProjectDialog());
    els.saveProjectButton.addEventListener("click", saveProjectDialog);
    bindEnterToSave(els.projectForm, saveProjectDialog);
    els.deleteProjectButton.addEventListener("click", deleteProjectFromDialog);
    els.projectNameInput.addEventListener("input", onProjectNameInput);
    els.projectTreeInput.addEventListener("change", () => {
      state.projectDialogAutoTree = false;
      renderProjectPreview();
    });
    els.projectsDialog.addEventListener("click", (event) => {
      if (event.target === els.projectsDialog) closeProjectsDialog();
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
    els.themeToggleButton.addEventListener("click", toggleTheme);
    els.langToggleButton.addEventListener("click", toggleLanguage);

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
    els.restResetButton.addEventListener("click", finishRestTimer);

    els.prevWeekButton.addEventListener("click", () => changeWeek(-1));
    els.nextWeekButton.addEventListener("click", () => changeWeek(1));
    els.thisWeekButton.addEventListener("click", () => {
      if (state.groveView === "month") {
        state.monthStart = startOfMonth(new Date());
      } else {
        state.weekStart = startOfWeek(new Date());
      }
      renderPeriod();
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
    els.calAddButton.addEventListener("click", () => openRecordDialog());
    els.saveRecordButton.addEventListener("click", saveDialogRecord);
    bindEnterToSave(els.recordForm, saveDialogRecord);
    els.deleteRecordButton.addEventListener("click", deleteDialogRecord);
    els.recordProjectInput.addEventListener("change", renderRecordDialogProject);
    els.recordTitleInput.addEventListener("input", () => {
      const id = projectForTitle(els.recordTitleInput.value);
      if (!id || id === els.recordProjectInput.value) return;
      els.recordProjectInput.value = id;
      renderRecordDialogProject();
    });
    els.recordStartedInput.addEventListener("change", () => renderRecordDurationHint());
    els.recordEndedInput.addEventListener("change", () => renderRecordDurationHint());

    // --- Views ---------------------------------------------------------
    els.viewFocusTab.addEventListener("click", () => setView("timer"));
    els.viewCalendarTab.addEventListener("click", () => setView("calendar"));
    window.addEventListener("hashchange", applyRoute);

    // --- Calendar ------------------------------------------------------
    els.calPrevButton.addEventListener("click", () => shiftCalendar(-1));
    els.calNextButton.addEventListener("click", () => shiftCalendar(1));
    els.calTodayButton.addEventListener("click", () => {
      state.calAnchor = defaultCalendarAnchor();
      renderCalendar();
      scrollCalendarToNow();
    });
    els.calDaysSelect.addEventListener("change", () => {
      setCalendarDays(Number(els.calDaysSelect.value));
    });
    els.calZoomInButton.addEventListener("click", () => setCalendarZoom(state.calZoom * CAL_ZOOM_STEP));
    els.calZoomOutButton.addEventListener("click", () => setCalendarZoom(state.calZoom / CAL_ZOOM_STEP));

    // Ctrl/⌘ + wheel zooms, like a desktop calendar; a plain wheel still scrolls.
    els.calScroll.addEventListener("wheel", (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setCalendarZoom(state.calZoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1));
    }, { passive: false });

    els.calGrid.addEventListener("pointerdown", onCalendarPointerDown);

    // Non-passive: while a drag is live this is what stops the day from
    // scrolling out from under the finger.
    els.calScroll.addEventListener("touchmove", (event) => {
      if (state.calDrag && state.calDrag.active) event.preventDefault();
    }, { passive: false });

    els.calGrid.addEventListener("click", (event) => {
      // The click that ends a drag isn't a click on anything.
      if (state.calSuppressClick) {
        state.calSuppressClick = false;
        return;
      }
      const eventNode = event.target.closest(".cal-event");
      if (eventNode) {
        // The block for the timer that is still running isn't a record yet, so
        // it sends you to the timer instead of an editor.
        if (eventNode.dataset.running === "true") {
          setView("timer");
          return;
        }
        const record = state.sessions.find((item) => item.id === eventNode.dataset.id);
        if (record) openRecordDialog(record);
        return;
      }

      const dayNode = event.target.closest(".cal-day");
      if (!dayNode) return;
      openRecordDialogAtSlot(dayNode, event);
    });

    els.googleSignInButton.addEventListener("click", signInWithGoogle);
    els.signOutButton.addEventListener("click", signOut);
    els.accountButton.addEventListener("click", openAccountDialog);
    els.closeAccountDialogButton.addEventListener("click", closeAccountDialog);
    els.accountDialog.addEventListener("click", (event) => {
      if (event.target === els.accountDialog) closeAccountDialog();
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
      syncRealtime();

      state.supabase.auth.onAuthStateChange(async (event, session) => {
        // init() already handles the very first load; only react to real
        // sign-in / sign-out afterwards so the timer isn't hydrated twice.
        if (event === "INITIAL_SESSION") return;
        state.user = session ? session.user : null;
        state.dataMode = state.user ? "cloud" : "local";
        syncRealtime();
        await reloadState();
      });
    } catch (error) {
      state.supabase = null;
      state.supabaseConfigured = false;
      state.dataMode = "local";
      showToast(t("toast.cloud_load_fail"));
      console.warn(error);
      renderAccount();
    }
  }

  // --- Realtime ------------------------------------------------------------
  // Postgres pushes each change straight to the browser, so a timer started on
  // the phone appears here at once instead of at the next poll. Nothing else
  // changes: a message only decides *when* the existing reload paths run, never
  // what they do, so there is still one way for data to reach the UI.

  function syncRealtime() {
    if (state.user) subscribeRealtime();
    else unsubscribeRealtime();
  }

  function subscribeRealtime() {
    if (!state.supabase || !state.user || state.realtimeChannel) return;

    const userFilter = `user_id=eq.${state.user.id}`;
    // Realtime applies row level security using the socket's own token, so it
    // has to be handed the signed-in session or every change is filtered out.
    try {
      state.supabase.realtime.setAuth();
    } catch (error) {
      console.warn(error);
    }

    const channel = state.supabase.channel("timbertimer-sync");
    const onTable = (table, handler) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: userFilter },
        handler
      );
    };

    // Each table reloads only what it affects, rather than everything.
    onTable("focus_sessions", async () => {
      await loadSessions();
      await reconcileProjects();
      renderAll();
    });
    onTable("active_focus_timers", () => refreshCloudActiveTimer());
    onTable("active_rest_timers", () => refreshCloudRestTimer());
    onTable("notes", () => refreshCloudNotes());
    onTable("projects", () => refreshCloudProjects());

    state.realtimeChannel = channel;

    channel.subscribe((status) => {
      const live = status === "SUBSCRIBED";
      const wasLive = state.realtimeLive;
      state.realtimeLive = live;

      if (live && !wasLive) {
        // Anything that changed while the socket was down was never delivered,
        // so a fresh subscription reconciles once instead of waiting for the
        // next edit to notice.
        reloadState();
        return;
      }

      // CHANNEL_ERROR is what a project whose tables are not in the
      // supabase_realtime publication reports. That is a supported setup, not a
      // failure — the poll below simply stays at its normal interval.
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        state.realtimeLive = false;
      }
    });
  }

  function unsubscribeRealtime() {
    state.realtimeLive = false;
    const channel = state.realtimeChannel;
    if (!channel) return;
    state.realtimeChannel = null;
    try {
      state.supabase.removeChannel(channel);
    } catch (error) {
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
        state.lastSessionsSig = sessionsSig(data);
        state.dataMode = "cloud";
        return;
      }

      state.dataMode = "local";
      showToast(t("toast.cloud_not_ready"));
      console.warn(error);
    }

    state.sessions = loadLocalSessions();
  }

  // Cheap fingerprint of a records fetch: ids plus their update times, so any
  // insert, edit or delete on another device changes it.
  function sessionsSig(rows) {
    return rows.map((r) => `${r.id}:${r.updated_at}`).join("|");
  }

  // Poll backstop for records. Realtime pushes inserts and updates, but a
  // DELETE on another device is dropped unless the table uses REPLICA IDENTITY
  // FULL (its payload otherwise lacks user_id, so the row filter never matches).
  // Re-fetching here keeps deletes in sync even when that push never arrives.
  async function refreshCloudSessions() {
    if (!canUseCloud()) return;
    state.lastCloudSessionsSyncAt = Date.now();
    const { data, error } = await state.supabase
      .from("focus_sessions")
      .select("*")
      .order("started_at", { ascending: false });
    if (error || !data) return;
    const sig = sessionsSig(data);
    if (sig === state.lastSessionsSig) return;
    state.lastSessionsSig = sig;
    state.sessions = data.map(normalizeRecord);
    state.dataMode = "cloud";
    await reconcileProjects();
    renderAll();
  }

  // Projects change rarely, so the poll only repaints when something actually
  // differs — a colour picked on the phone lands here without a refresh.
  async function refreshCloudProjects() {
    if (!canUseCloud() || state.projectsCloudMissing) return;
    const before = JSON.stringify(state.projects);
    await loadProjects();
    await reconcileProjects();
    if (JSON.stringify(state.projects) === before) return;
    syncSelectedTree();
    renderAll();
  }

  async function loadNotes() {
    if (canUseCloud()) {
      const { data, error } = await fetchCloudNotes();
      if (!error) {
        // The cloud order is authoritative when signed in; only fall back to
        // this device's saved order if the sort column isn't there yet.
        state.notes = state.notesSortColumnMissing
          ? applyStoredNotesOrder(data || [])
          : (data || []);
        return;
      }
      console.warn(error);
    }
    state.notes = applyStoredNotesOrder(loadLocalNotes());
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

  // Fetch notes in their saved order. `sort_order` is a newer column, so fall
  // back to created_at if the project's SQL hasn't been migrated yet.
  async function fetchCloudNotes() {
    let result = await state.supabase
      .from("notes")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (result.error) {
      state.notesSortColumnMissing = true;
      result = await state.supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });
    }
    return result;
  }

  // Write the whole list back with its position, so every signed-in device
  // shows the same order. Upsert also inserts notes that aren't saved yet.
  async function syncCloudNotes() {
    if (!canUseCloud()) return;

    const base = state.notes.map((note) => ({
      id: note.id,
      user_id: state.user.id,
      text: note.text,
      done: note.done,
      created_at: note.created_at,
      updated_at: note.updated_at || new Date().toISOString(),
    }));
    const withOrder = base.map((row, index) => ({ ...row, sort_order: index }));

    let { error } = await state.supabase.from("notes").upsert(withOrder);
    if (error) {
      // Most likely the sort_order column is missing; still save the notes.
      state.notesSortColumnMissing = true;
      ({ error } = await state.supabase.from("notes").upsert(base));
    }
    if (error) console.warn(error);
  }

  async function addNote(text) {
    const now = new Date().toISOString();
    const note = { id: createId(), text, done: false, created_at: now, updated_at: now };
    state.notes.unshift(note);
    if (canUseCloud()) {
      await syncCloudNotes(); // inserts the note and renumbers positions
    } else {
      saveLocalNotes();
    }
    saveNotesOrder();
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
    const { data, error } = await fetchCloudNotes();
    if (error || !data) return;
    const incoming = state.notesSortColumnMissing ? applyStoredNotesOrder(data) : data;
    // Compare ids in order too, so a reorder made on another device lands here.
    const sig = (notes) =>
      JSON.stringify(notes.map((n) => ({ id: n.id, text: n.text, done: n.done, updated_at: n.updated_at })));
    if (sig(incoming) !== sig(state.notes)) {
      state.notes = incoming;
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
      empty.textContent = t("notes.empty");
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
    li.dataset.noteId = note.id;

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.setAttribute("aria-hidden", "true");
    handle.innerHTML = '<i data-lucide="grip-vertical"></i>';

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "note-checkbox";
    checkbox.checked = note.done;
    checkbox.setAttribute("aria-label", note.done ? t("notes.mark_incomplete") : t("notes.mark_complete"));
    checkbox.addEventListener("change", () => toggleNote(note.id));

    const textEl = document.createElement("span");
    textEl.className = "note-text";
    textEl.textContent = note.text;

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "note-delete";
    delBtn.title = t("notes.delete");
    delBtn.innerHTML = '<i data-lucide="x"></i>';
    delBtn.addEventListener("click", () => deleteNote(note.id));

    // Pointer events rather than HTML5 drag-and-drop: on Android (notably
    // tablets) a long press on a draggable element opens the text
    // selection / "copy" menu instead of starting a drag.
    handle.addEventListener("pointerdown", (event) => startNoteDrag(event, li));
    handle.addEventListener("contextmenu", (event) => event.preventDefault());

    li.append(handle, checkbox, textEl, delBtn);
    return li;
  }

  function startNoteDrag(event, li) {
    if (event.button > 0) return; // primary button / touch / pen only
    event.preventDefault();       // suppress text selection and the native menu

    const list = els.notesList;
    const orderBefore = noteOrderFromDom();
    li.classList.add("is-dragging");
    document.body.classList.add("is-reordering");

    // Listeners go on the document, not the handle: reordering moves the row
    // (and the handle inside it) in the DOM, which drops pointer capture, so a
    // handle-bound listener would stop receiving moves after the first step.
    const onMove = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      moveEvent.preventDefault();
      const others = Array.from(list.querySelectorAll(".note-item")).filter((el) => el !== li);
      const after = others.find((el) => {
        const rect = el.getBoundingClientRect();
        return moveEvent.clientY < rect.top + rect.height / 2;
      });
      // Reorder live so the row follows the finger/cursor.
      if (after) list.insertBefore(li, after);
      else list.appendChild(li);
    };

    const onEnd = (endEvent) => {
      if (endEvent && endEvent.pointerId !== event.pointerId) return;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
      document.removeEventListener("pointercancel", onEnd);
      li.classList.remove("is-dragging");
      document.body.classList.remove("is-reordering");
      // Clicking the handle without moving is not a reorder; skip the write.
      if (noteOrderFromDom().join() !== orderBefore.join()) commitNoteOrderFromDom();
    };

    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onEnd);
    document.addEventListener("pointercancel", onEnd);
  }

  function noteOrderFromDom() {
    return Array.from(els.notesList.querySelectorAll(".note-item"))
      .map((el) => el.dataset.noteId);
  }

  // Read the order back off the DOM, then store and repaint.
  function commitNoteOrderFromDom() {
    const ids = noteOrderFromDom();
    const byId = new Map(state.notes.map((n) => [n.id, n]));
    const seen = new Set(ids);
    state.notes = [
      ...ids.map((id) => byId.get(id)).filter(Boolean),
      ...state.notes.filter((n) => !seen.has(n.id)),
    ];
    persistNotesOrder();
    renderNotes();
  }

  function persistNotesOrder() {
    saveNotesOrder(); // per-device fallback, also used when signed out
    // Local notes live in their own array, so the new order must be written
    // there too or it is lost on reload. Signed in, the order goes to the
    // cloud so other devices pick it up.
    if (canUseCloud()) syncCloudNotes();
    else saveLocalNotes();
  }

  // --- Projects ------------------------------------------------------------
  // A project owns a name, a colour and a tree species; records point at one by
  // id. Ids are plain strings so built-ins ("rest") and records migrated from
  // the pre-project versions ("t:deep focus") keep stable, meaningful keys.

  function normalizeProject(project) {
    const now = new Date().toISOString();
    const id = String(project.id || createId());
    const name = String(project.name || "Project").trim().slice(0, 60) || "Project";
    return {
      id,
      name,
      color: normalizeColor(project.color) || (id === REST_PROJECT_ID ? REST_PROJECT_COLOR : colorForProjectName(name)),
      tree: TREE_SPECIES.some((s) => s.id === project.tree) || project.tree === WILTED_TREE.id
        ? project.tree
        : defaultTreeForName(name),
      sort_order: Number.isFinite(Number(project.sort_order)) ? Number(project.sort_order) : 0,
      created_at: project.created_at || now,
      updated_at: project.updated_at || now,
    };
  }

  function normalizeColor(value) {
    const hex = String(value || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : null;
  }

  // A new project's colour and tree both come from its name, so naming it is
  // enough — and the same name always looks the same, on every device, without
  // needing anything to be written down first.
  function colorForProjectName(name) {
    return PROJECT_COLORS[mixedHash(`${getTreeSeed(name)}:color`) % PROJECT_COLORS.length];
  }

  // Walk on from the name's own colour until one is free, so two projects don't
  // end up sharing a colour in the chart and the forest.
  function freeColorForProjectName(name, skipId) {
    const used = new Set(
      state.projects.filter((project) => project.id !== skipId).map((project) => project.color)
    );
    const start = PROJECT_COLORS.indexOf(colorForProjectName(name));
    for (let step = 0; step < PROJECT_COLORS.length; step += 1) {
      const color = PROJECT_COLORS[(start + step) % PROJECT_COLORS.length];
      if (!used.has(color)) return color;
    }
    return colorForProjectName(name);
  }

  // Small-modulo selection needs the bits mixed, or the low ones dominate.
  function mixedHash(value) {
    let seed = hashString(value);
    seed ^= seed >>> 13;
    seed = (seed * 0x5bd1e995) >>> 0;
    return (seed ^ (seed >>> 15)) >>> 0;
  }

  function loadLocalProjects() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_PROJECTS) || "[]");
      return Array.isArray(data) ? data.map(normalizeProject) : [];
    } catch (error) {
      console.warn(error);
      return [];
    }
  }

  function saveLocalProjects() {
    localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(state.projects));
  }

  async function loadProjects() {
    if (canUseCloud() && !state.projectsCloudMissing) {
      const { data, error } = await state.supabase
        .from("projects")
        .select("*")
        .order("sort_order", { ascending: true });

      if (!error) {
        state.projects = (data || []).map(normalizeProject);
        return;
      }

      // The table only exists once the updated SQL has been run; until then the
      // app keeps working from this device's projects.
      state.projectsCloudMissing = true;
      console.warn(error);
    }

    state.projects = loadLocalProjects();
  }

  function sortProjects() {
    state.projects.sort((a, b) => {
      const rank = (p) => (p.id === DEFAULT_PROJECT_ID ? 0 : p.id === REST_PROJECT_ID ? 2 : 1);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });
  }

  // Make sure every project a record points at exists, seeding the built-ins on
  // a fresh install and rebuilding projects for records made before projects
  // existed. Deterministic ids and colours mean two devices converge on the
  // same result without coordinating.
  async function reconcileProjects() {
    const before = state.projects.length;
    const byId = new Map(state.projects.map((p) => [p.id, p]));
    const created = [];

    const ensure = (project) => {
      if (byId.has(project.id)) return;
      const normalized = normalizeProject(project);
      byId.set(normalized.id, normalized);
      state.projects.push(normalized);
      created.push(normalized);
    };

    ensure({
      id: DEFAULT_PROJECT_ID,
      name: "Focus",
      color: PROJECT_COLORS[0],
      tree: "pine",
      sort_order: 0,
    });
    ensure({
      id: REST_PROJECT_ID,
      name: "Rest",
      color: REST_PROJECT_COLOR,
      tree: WILTED_TREE.id,
      sort_order: 900,
    });

    // Legacy records: one project per distinct session title, carrying the tree
    // that title already grew so the existing forest looks unchanged.
    state.sessions.forEach((record) => {
      const id = resolveProjectId(record);
      if (byId.has(id) || !id.startsWith(LEGACY_PROJECT_PREFIX)) return;
      const title = (record.title || "").trim() || "Deep focus";
      ensure({
        id,
        name: title,
        color: colorForProjectName(title),
        tree: legacyTreeForTitle(title, record),
        sort_order: 100,
      });
    });

    if (!created.length && before === state.projects.length) return;

    sortProjects();
    saveLocalProjects();
    await pushProjects(created);
  }

  // The species a migrated project should keep: an explicit per-name choice from
  // the old tree picker first, then whatever that title last grew.
  function legacyTreeForTitle(title, record) {
    const prefId = getTreePrefForName(title);
    if (prefId && TREE_SPECIES.some((s) => s.id === prefId)) return prefId;
    const species = TREE_SPECIES.find((s) => s.label === record.tree_kind);
    return species ? species.id : defaultTreeForName(title);
  }

  async function pushProjects(projects) {
    if (!projects.length || !canUseCloud() || state.projectsCloudMissing) return;
    const rows = projects.map((project) => toCloudProject(project));
    const { error } = await state.supabase.from("projects").upsert(rows, { onConflict: "user_id,id" });
    if (error) {
      state.projectsCloudMissing = true;
      console.warn(error);
    }
  }

  function toCloudProject(project) {
    return {
      user_id: state.user.id,
      id: project.id,
      name: project.name,
      color: project.color,
      tree: project.tree,
      sort_order: project.sort_order,
      created_at: project.created_at,
      updated_at: new Date().toISOString(),
    };
  }

  async function saveProject(project) {
    const normalized = normalizeProject({ ...project, updated_at: new Date().toISOString() });
    const index = state.projects.findIndex((p) => p.id === normalized.id);
    if (index >= 0) state.projects[index] = normalized;
    else state.projects.push(normalized);

    sortProjects();
    saveLocalProjects();

    if (canUseCloud() && !state.projectsCloudMissing) {
      const { error } = await state.supabase
        .from("projects")
        .upsert(toCloudProject(normalized), { onConflict: "user_id,id" });
      if (error) {
        state.projectsCloudMissing = true;
        console.warn(error);
        showToast(t("toast.cloud_projects_fail"));
      }
    }

    return normalized;
  }

  // Deleting a project moves its records to the default project rather than
  // orphaning them, so nothing silently disappears from the history.
  async function removeProject(id) {
    if (BUILTIN_PROJECT_IDS.includes(id)) return false;

    const target = DEFAULT_PROJECT_ID;
    const affected = state.sessions.filter((record) => resolveProjectId(record) === id);

    if (affected.length) {
      const affectedIds = new Set(affected.map((record) => record.id));
      state.sessions = state.sessions.map((record) =>
        affectedIds.has(record.id) ? { ...record, project_id: target } : record
      );

      if (canUseCloud() && !state.sessionsProjectColumnMissing) {
        const { error } = await state.supabase
          .from("focus_sessions")
          .update({ project_id: target, updated_at: new Date().toISOString() })
          .eq("user_id", state.user.id)
          .in("id", affected.map((record) => record.id));
        if (error) {
          state.sessionsProjectColumnMissing = true;
          console.warn(error);
        }
      } else if (!canUseCloud()) {
        saveLocalSessions(
          loadLocalSessions().map((record) =>
            affectedIds.has(record.id) ? { ...record, project_id: target } : record
          )
        );
      }
    }

    state.projects = state.projects.filter((project) => project.id !== id);
    saveLocalProjects();

    if (canUseCloud() && !state.projectsCloudMissing) {
      const { error } = await state.supabase
        .from("projects")
        .delete()
        .eq("user_id", state.user.id)
        .eq("id", id);
      if (error) console.warn(error);
    }

    if (state.selectedProjectId === id) setSelectedProject(target, { silent: true });
    return true;
  }

  // Resolve which project a record belongs to. Records written since projects
  // exist carry the id; older ones are mapped by their shape: a completed
  // wilted tree was a rest, anything else keys off its title.
  function resolveProjectId(record) {
    if (record.project_id) return String(record.project_id);
    if (record.status === "completed" && record.tree_kind === WILTED_TREE.label) return REST_PROJECT_ID;
    return legacyProjectIdForTitle(record.title);
  }

  function legacyProjectIdForTitle(title) {
    return LEGACY_PROJECT_PREFIX + (String(title || "").trim().toLowerCase() || "deep focus");
  }

  // Never returns null: a record pointing at a project that was deleted
  // elsewhere still renders, in a neutral grey.
  function getProject(id) {
    const found = state.projects.find((project) => project.id === id);
    if (found) return found;
    return {
      id: id || DEFAULT_PROJECT_ID,
      name: t("project.none"),
      color: MISSING_PROJECT_COLOR,
      tree: "pine",
      sort_order: 999,
      missing: true,
    };
  }

  function getRecordProject(record) {
    return getProject(resolveProjectId(record));
  }

  // Built-in names are stored in English so a record means the same thing in
  // every language; only the untouched defaults are shown translated.
  function projectDisplayName(project) {
    if (project.id === REST_PROJECT_ID && project.name === "Rest") return t("project.rest_name");
    if (project.id === DEFAULT_PROJECT_ID && project.name === "Focus") return t("project.default_name");
    return project.name;
  }

  // Empty when nothing has been chosen yet, so startup can pick up the project
  // of the most recent session instead of forcing the default one.
  // --- Task ↔ project ------------------------------------------------------
  // A task name belongs to a project: track "wash dishes" under Errands once,
  // and choosing that task picks Errands again by itself. What you last chose
  // on this device wins; otherwise the answer comes from your history, which
  // syncs, so the pairing follows you across devices.

  function taskKey(title) {
    return String(title || "").trim().toLowerCase();
  }

  function loadTaskProjects() {
    try { return JSON.parse(localStorage.getItem(STORAGE_TASK_PROJECT) || "{}"); }
    catch { return {}; }
  }

  function rememberTaskProject(title, projectId) {
    const key = taskKey(title);
    if (!key || !projectId) return;
    const map = loadTaskProjects();
    if (map[key] === projectId) return;
    map[key] = projectId;
    localStorage.setItem(STORAGE_TASK_PROJECT, JSON.stringify(map));
  }

  function projectForTitle(title) {
    const key = taskKey(title);
    if (!key) return null;

    const saved = loadTaskProjects()[key];
    if (saved && state.projects.some((project) => project.id === saved)) return saved;

    let match = null;
    state.sessions.forEach((record) => {
      if (taskKey(record.title) !== key) return;
      if (!match || new Date(record.started_at) > new Date(match.started_at)) match = record;
    });
    if (!match) return null;
    const id = resolveProjectId(match);
    return state.projects.some((project) => project.id === id) ? id : null;
  }

  // Follow the task name that was just typed or picked, if it has a project.
  function applyProjectForTitle(title) {
    const id = projectForTitle(title);
    if (!id || id === state.selectedProjectId) return;
    setSelectedProject(id);
  }

  function loadSelectedProjectId() {
    try { return localStorage.getItem(STORAGE_SELECTED_PROJECT) || ""; }
    catch { return ""; }
  }

  function setSelectedProject(id, { silent = false } = {}) {
    state.selectedProjectId = id;
    localStorage.setItem(STORAGE_SELECTED_PROJECT, id);
    syncSelectedTree();
    if (silent) return;
    renderProjectPickers();
    renderTreePicker();
    renderTimer();
  }

  function syncSelectedTree() {
    const project = getProject(state.timer?.projectId || state.selectedProjectId);
    state.selectedTreeId = project.tree;
  }

  function projectRecordCount(id) {
    return state.sessions.filter((record) => resolveProjectId(record) === id).length;
  }

  function projectRecordCountLabel(id) {
    const count = projectRecordCount(id);
    return t(count === 1 ? "project.record_one" : "project.records", { n: count });
  }

  // --- Project pickers and dialogs -----------------------------------------

  function renderProjectPickers() {
    if (!state.projects.some((project) => project.id === state.selectedProjectId)) {
      state.selectedProjectId = DEFAULT_PROJECT_ID;
    }
    fillProjectSelect(els.projectPicker, state.selectedProjectId);
    els.projectPicker.disabled = Boolean(state.timer);
    applyProjectVars(els.projectDot, getProject(state.selectedProjectId));
  }

  function fillProjectSelect(select, selectedId) {
    const fragment = document.createDocumentFragment();
    state.projects.forEach((project) => {
      const option = document.createElement("option");
      option.value = project.id;
      option.textContent = projectDisplayName(project);
      fragment.appendChild(option);
    });
    select.replaceChildren(fragment);

    // A record can still point at a project that no longer exists; keep it
    // selectable so editing it doesn't silently move it.
    if (selectedId && !state.projects.some((project) => project.id === selectedId)) {
      const option = document.createElement("option");
      option.value = selectedId;
      option.textContent = t("project.none");
      select.appendChild(option);
    }
    select.value = selectedId;
  }

  function openProjectsDialog() {
    renderProjectsList();
    showDialog(els.projectsDialog);
  }

  function closeProjectsDialog() {
    hideDialog(els.projectsDialog);
  }

  function renderProjectsList() {
    const fragment = document.createDocumentFragment();

    state.projects.forEach((project) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "project-row-item";
      applyProjectVars(button, project);

      const dot = document.createElement("span");
      dot.className = "legend-dot";

      const name = document.createElement("span");
      name.className = "project-row-name";
      name.textContent = projectDisplayName(project);

      const meta = document.createElement("span");
      meta.className = "project-row-meta";
      meta.textContent = projectRecordCountLabel(project.id);

      button.append(dot, name, meta);
      button.addEventListener("click", () => openProjectDialog(project));
      li.appendChild(button);
      fragment.appendChild(li);
    });

    els.projectsList.replaceChildren(fragment);
  }

  function openProjectDialog(project) {
    const editing = Boolean(project);
    const value = project || {
      id: "",
      name: "",
      color: colorForProjectName(""),
      tree: defaultTreeForName(""),
    };

    els.projectDialogTitle.textContent = editing ? t("project.edit") : t("project.new");
    els.projectIdInput.value = value.id;
    els.projectNameInput.value = editing ? projectDisplayName(value) : "";
    fillTreeSelect(els.projectTreeInput, { includeWilted: true });
    els.projectTreeInput.value = value.tree;
    renderColorGrid(value.color);
    els.deleteProjectButton.hidden = !editing || BUILTIN_PROJECT_IDS.includes(value.id);
    // A project being created follows its name until the colour or the tree is
    // chosen by hand; an existing one keeps what it already has.
    state.projectDialogAutoColor = !editing;
    state.projectDialogAutoTree = !editing;
    renderProjectPreview();
    showDialog(els.projectDialog);
    refreshIcons();
  }

  // Typing a name re-rolls the look, so "Reading" always arrives as the same
  // colour and species without anyone having to choose.
  function onProjectNameInput() {
    const name = els.projectNameInput.value.trim();
    if (state.projectDialogAutoColor) {
      renderColorGrid(freeColorForProjectName(name, els.projectIdInput.value));
    }
    if (state.projectDialogAutoTree) {
      els.projectTreeInput.value = defaultTreeForName(name);
    }
    renderProjectPreview();
  }

  function renderColorGrid(selected) {
    const fragment = document.createDocumentFragment();
    PROJECT_COLORS.forEach((color) => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "color-swatch";
      swatch.style.setProperty("--swatch", color);
      swatch.dataset.color = color;
      swatch.setAttribute("role", "radio");
      swatch.setAttribute("aria-checked", String(color === selected));
      swatch.setAttribute("aria-label", color);
      swatch.addEventListener("click", () => {
        Array.from(els.projectColorGrid.children).forEach((node) => {
          node.setAttribute("aria-checked", String(node.dataset.color === color));
        });
        state.projectDialogAutoColor = false;
        renderProjectPreview();
      });
      fragment.appendChild(swatch);
    });
    els.projectColorGrid.replaceChildren(fragment);
  }

  function selectedSwatchColor() {
    const checked = els.projectColorGrid.querySelector('[aria-checked="true"]');
    return checked ? checked.dataset.color : PROJECT_COLORS[0];
  }

  function renderProjectPreview() {
    const color = selectedSwatchColor();
    const tree = els.projectTreeInput.value;
    const name = els.projectNameInput.value.trim() || t("project.new");
    els.projectPreviewPlant.innerHTML = buildTreeSVG(tree, paletteFromColor(color));
    els.projectPreviewName.textContent = name;
    applyProjectVars(els.projectPreviewName, { color });
  }

  async function saveProjectDialog() {
    if (!els.projectForm.reportValidity()) return;

    const id = els.projectIdInput.value;
    const name = els.projectNameInput.value.trim().slice(0, 60);
    if (!name) return;

    const clash = state.projects.some(
      (project) => project.id !== id && projectDisplayName(project).toLowerCase() === name.toLowerCase()
    );
    if (clash) {
      showToast(t("project.name_taken"));
      return;
    }

    const existing = id ? state.projects.find((project) => project.id === id) : null;
    const saved = await saveProject({
      ...(existing || {}),
      id: id || createId(),
      name,
      color: selectedSwatchColor(),
      tree: els.projectTreeInput.value,
      sort_order: existing ? existing.sort_order : state.projects.length,
    });

    // Saving re-sorts the list, so track the project by id rather than position.
    if (!id) setSelectedProject(saved.id, { silent: true });

    hideDialog(els.projectDialog);
    if (els.projectsDialog.open) renderProjectsList();
    syncSelectedTree();
    renderAll();
    showToast(t("toast.project_saved"));
  }

  async function deleteProjectFromDialog() {
    const id = els.projectIdInput.value;
    const project = state.projects.find((item) => item.id === id);
    if (!project) return;

    if (BUILTIN_PROJECT_IDS.includes(id)) {
      showToast(t("toast.project_builtin"));
      return;
    }

    const confirmed = window.confirm(
      t("confirm.delete_project", {
        name: projectDisplayName(project),
        n: projectRecordCount(id),
        target: projectDisplayName(getProject(DEFAULT_PROJECT_ID)),
      })
    );
    if (!confirmed) return;

    await removeProject(id);
    hideDialog(els.projectDialog);
    if (els.projectsDialog.open) renderProjectsList();
    syncSelectedTree();
    renderAll();
    showToast(t("toast.project_deleted"));
  }

  async function createRecord(record) {
    const normalized = normalizeRecord(record);
    rememberTaskProject(normalized.title, normalized.project_id);

    if (canUseCloud()) {
      let { data, error } = await state.supabase
        .from("focus_sessions")
        .insert(toCloudRecord(normalized))
        .select()
        .single();

      // Retry once without project_id, in case this database hasn't had the
      // projects migration run against it yet.
      if (error && !state.sessionsProjectColumnMissing) {
        state.sessionsProjectColumnMissing = true;
        ({ data, error } = await state.supabase
          .from("focus_sessions")
          .insert(toCloudRecord(normalized))
          .select()
          .single());
      }

      if (error) {
        showToast(t("toast.cloud_save_fail"));
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
    rememberTaskProject(next.title, next.project_id);

    if (canUseCloud()) {
      let { data, error } = await state.supabase
        .from("focus_sessions")
        .update(toCloudRecord(next, true))
        .eq("id", id)
        .select()
        .single();

      if (error && !state.sessionsProjectColumnMissing) {
        state.sessionsProjectColumnMissing = true;
        ({ data, error } = await state.supabase
          .from("focus_sessions")
          .update(toCloudRecord(next, true))
          .eq("id", id)
          .select()
          .single());
      }

      if (error) {
        showToast(t("toast.cloud_update_fail"));
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
    const confirmed = window.confirm(t("confirm.delete_record", { title: record.title }));
    if (!confirmed) return;

    if (canUseCloud()) {
      const { error } = await state.supabase.from("focus_sessions").delete().eq("id", record.id);
      if (error) {
        showToast(t("toast.cloud_delete_fail"));
        console.warn(error);
        return;
      }
    } else {
      saveLocalSessions(loadLocalSessions().filter((item) => item.id !== record.id));
    }

    state.sessions = state.sessions.filter((item) => item.id !== record.id);
    renderAll();
    showToast(t("toast.record_deleted"));
  }

  async function startOrResumeTimer() {
    if (state.timer) return;

    const project = getProject(state.selectedProjectId);
    // An empty task name falls back to the project's, so picking a project and
    // pressing start is enough.
    const title = els.sessionTitle.value.trim() || projectDisplayName(project);
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
      projectId: project.id,
      selectedTreeId: project.tree,
      durationMinutes: minutes,
      durationSeconds: isStopwatch ? 0 : durationSeconds,
      startedAt: new Date(now).toISOString(),
      endAt: now + durationSeconds * 1000,
      remainingSeconds: durationSeconds,
      cloudSynced: false,
    };

    rememberTaskProject(title, project.id);
    persistTimer();
    if (!isStopwatch) primeCompletionSound();
    renderTimer();
    renderTimerModeToggle();
    showToast(isStopwatch ? t("toast.stopwatch_started") : t("toast.session_started"));
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
        showToast(t("toast.timer_finished_elsewhere"));
        return;
      }

      const isStopwatch = timer.mode === "stopwatch";
      const elapsedSeconds = getElapsedSeconds();
      const actualMinutes =
        status === "completed"
          ? Math.max(1, Math.round(elapsedSeconds / 60))
          : Math.max(0, Math.round(elapsedSeconds / 60));
      const endedAt = new Date().toISOString();
      const projectId = timer.projectId || DEFAULT_PROJECT_ID;
      const record = {
        id: createId(),
        title: timer.title,
        project_id: projectId,
        duration_minutes: isStopwatch ? actualMinutes : timer.durationMinutes,
        actual_minutes: isStopwatch
          ? actualMinutes
          : (status === "completed" && elapsedSeconds >= timer.durationSeconds - 1
              ? timer.durationMinutes
              : actualMinutes),
        status,
        started_at: timer.startedAt,
        ended_at: endedAt,
        tree_kind: pickTreeKind(projectId, status),
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
      showToast(status === "completed" ? t("toast.session_planted") : t("toast.session_abandoned"));
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

  // Ending a rest plants the wilted tree it grew, and its minutes count toward
  // the totals. Very short rests are dropped so a stray tap leaves no litter.
  async function finishRestTimer() {
    if (!state.restTimer) return;

    const elapsedSeconds = getRestElapsedSeconds();
    const startedAt = new Date(state.restTimer.startedAt).toISOString();
    state.restTimer = null;
    renderRestTimer();
    await deleteRestTimerFromCloud();

    const minutes = Math.round(elapsedSeconds / 60);
    if (minutes < 1) {
      showToast(t("toast.rest_discarded"));
      return;
    }

    const endedAt = new Date().toISOString();
    await createRecord({
      id: createId(),
      title: REST_RECORD_TITLE,
      project_id: REST_PROJECT_ID,
      duration_minutes: minutes,
      actual_minutes: minutes,
      status: "completed",
      started_at: startedAt,
      ended_at: endedAt,
      tree_kind: pickTreeKind(REST_PROJECT_ID, "completed"),
      created_at: endedAt,
      updated_at: endedAt,
    });
    showToast(t("toast.rest_planted"));
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
      // Only a countdown can run out. The stopwatch carries a far-future endAt
      // as a placeholder, so leave it alone or it would chime and self-finish
      // once that placeholder came due.
      if (state.timer && state.timer.status === "running" && state.timer.mode !== "stopwatch") {
        const remainingSeconds = getRemainingSeconds();
        if (remainingSeconds > 0 && remainingSeconds <= 10) {
          playFinishSoonSound(remainingSeconds);
        }

        if (remainingSeconds <= 0) {
          completeTimer("completed");
        }
      }

      // With Realtime connected this poll is only a backstop for a socket that
      // died without saying so, so it can run far less often.
      const syncInterval = state.realtimeLive ? 60000 : 15000;

      if (canUseCloud() && Date.now() - state.lastCloudTimerSyncAt > syncInterval) {
        refreshCloudActiveTimer();
        refreshCloudRestTimer();
      }

      if (canUseCloud() && Date.now() - state.lastCloudNotesSyncAt > syncInterval) {
        refreshCloudNotes();
      }

      if (canUseCloud() && Date.now() - state.lastCloudSessionsSyncAt > syncInterval) {
        refreshCloudSessions();
        refreshCloudProjects();
      }

      if (state.timer) {
        renderTimer();
      }
      renderRestTimer();

      // The calendar only needs redrawing when the minute changes (the now-line
      // and any running block), and only while it is actually on screen.
      const minuteStamp = Math.floor(Date.now() / 60000);
      if (state.view === "calendar" && minuteStamp !== state.calMinuteStamp) {
        renderCalendar();
      }
    }, 1000);
  }

  function renderAll() {
    renderTheme();
    renderAccount();
    renderSessionSuggestions();
    renderProjectPickers();
    renderStats();
    renderPeriod();
    renderRecords();
    renderTimer();
    renderRestTimer();
    renderSoundToggle();
    renderVolumeControl();
    renderTimerModeToggle();
    renderTreePicker();
    renderNotes();
    renderCalendar();
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
      // A timer adopted from another device brings its project with it. Only
      // repaint the pickers when it actually differs — this runs every second.
      if (timer.projectId && state.selectedProjectId !== timer.projectId) {
        state.selectedProjectId = timer.projectId;
        localStorage.setItem(STORAGE_SELECTED_PROJECT, timer.projectId);
        renderProjectPickers();
        renderTreePicker();
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
      els.timerState.textContent = t("timer.growing");
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
      els.timerState.textContent = t("timer.ready");
      els.timerDisplay.textContent = isStopwatch ? "00:00" : formatClock(state.selectedDuration * 60);
      els.startButton.disabled = false;
      els.finishButton.disabled = true;
      setFormDisabled(false);
      return;
    }

    els.timerState.textContent = t("timer.growing");
    els.startButton.disabled = true;
    els.finishButton.disabled = false;
    setFormDisabled(true);
  }

  function renderSessionSuggestions() {
    const fragment = document.createDocumentFragment();
    const seen = new Set();

    sortedSessions().forEach((record) => {
      if (isRestRecord(record)) return; // not a session name you'd reuse
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
    const label = state.soundEnabled ? t("sound.on") : t("sound.off");
    const emoji = state.soundEnabled ? "🔊" : "🔇";
    els.soundToggleButton.innerHTML =
      `<span class="btn-emoji" aria-hidden="true">${emoji}</span><span>${label}</span>`;
    els.soundToggleButton.setAttribute("aria-pressed", String(state.soundEnabled));
    els.soundToggleButton.title = label;
  }

  function renderRestTimer() {
    const elapsedSeconds = state.restTimer ? getRestElapsedSeconds() : 0;
    const isRunning = Boolean(state.restTimer);

    els.restDisplay.textContent = formatClock(elapsedSeconds);
    els.restState.textContent = isRunning ? t("rest.resting") : t("rest.title");
    els.restModeLabel.textContent = t("rest.elapsed");
    els.restStartButton.disabled = isRunning;
    els.restResetButton.disabled = !isRunning;
    renderRestTree(elapsedSeconds);
    updateDocumentTitle();
  }

  // Resting grows a wilted tree instead of a healthy one — it starts as a small
  // sprout and creeps up over the first half hour of rest.
  function renderRestTree(elapsedSeconds) {
    const restProject = getProject(REST_PROJECT_ID);
    const treeKey = `wilted|${restProject.color}`;
    if (els.restPlant.dataset.treeKey !== treeKey) {
      els.restPlant.innerHTML = buildTreeSVG(WILTED_TREE.id, getTreePalette(restProject));
      els.restPlant.dataset.treeKey = treeKey;
    }
    const growth = clamp(elapsedSeconds / 1800, 0, 1);
    // 0.46 keeps the idle sprout readable; 0.86 fills the shorter rest stage.
    els.restStage.style.setProperty("--active-scale", (0.46 + growth * 0.4).toFixed(3));
  }

  function updateDocumentTitle() {
    if (state.timer) {
      // Both modes show their clock in the tab: the countdown counts its time
      // down, the stopwatch counts the time it has gathered up.
      const seconds = state.timer.mode === "stopwatch"
        ? getElapsedSeconds()
        : getRemainingSeconds();
      document.title = `${formatClock(seconds)} ${t("title.focus")} | ${APP_TITLE}`;
      return;
    }

    if (state.restTimer) {
      document.title = `${formatClock(getRestElapsedSeconds())} ${t("title.rest")} | ${APP_TITLE}`;
      return;
    }

    document.title = `${t("title.ready")} | ${APP_TITLE}`;
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
    const elapsedMinutes = state.timer ? getElapsedSeconds() / 60 : 0;
    const growthStage = getFocusGrowthStage(elapsedMinutes);
    const activeStageScales = [0.84, 0.96, 1.08, 1.2];
    const progressScale = 0.25 + getActiveTreeGrowth() * 0.82;
    const project = getProject(state.timer?.projectId || state.selectedProjectId);
    const speciesId = state.timer?.selectedTreeId || state.selectedTreeId;
    const species =
      [...TREE_SPECIES, WILTED_TREE].find((s) => s.id === speciesId) ||
      TREE_SPECIES.find((s) => s.id === "pine");
    const palette = getTreePalette(project);

    // The progress ring picks up the project's colour, so the running session
    // reads as that project at a glance.
    els.progressRingFill.style.stroke = project.color;

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
      // Searching by project name as well, now that it is part of a record.
      const searchable = `${record.title} ${projectDisplayName(getRecordProject(record))}`.toLowerCase();
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

    const rest = isRestRecord(record);
    const project = getRecordProject(record);

    const title = document.createElement("h3");
    title.className = "record-title";
    title.textContent = recordDisplayTitle(record);

    const status = document.createElement("span");
    status.className = `record-status ${rest ? "rested" : record.status}`;
    status.textContent = rest
      ? t("record.rested")
      : (record.status === "completed" ? t("record.planted") : t("record.abandoned"));

    titleRow.append(title, status);

    const projectChip = document.createElement("span");
    projectChip.className = "project-chip";
    projectChip.textContent = projectDisplayName(project);
    applyProjectVars(projectChip, project);

    const date = document.createElement("div");
    date.className = "record-date";
    date.textContent = formatRecordRange(record);

    const metrics = document.createElement("div");
    metrics.className = "record-metrics";
    metrics.append(
      createMetric(t("metric.focused", { n: record.actual_minutes })),
      createMetric(t("metric.goal", { n: record.duration_minutes })),
      createMetric(treeDisplayFromKind(speciesForRecord(record).label))
    );

    main.append(titleRow, projectChip, date, metrics);

    const actions = document.createElement("div");
    actions.className = "record-actions";
    actions.append(
      createActionButton("edit", record.id, t("action.edit"), "✏️"),
      createActionButton("delete", record.id, t("action.delete"), "🗑️")
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

  function createActionButton(action, id, label, emoji) {
    const button = document.createElement("button");
    button.className = "icon-only emoji-btn";
    button.type = "button";
    button.dataset.action = action;
    button.dataset.id = id;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.textContent = emoji;
    return button;
  }

  function renderStats() {
    // Focus stats count time spent focusing, whether or not the session was
    // seen through; rests have their own project and are excluded.
    const focus = state.sessions.filter((record) => !isRestRecord(record));
    const today = localDateKey(new Date());
    const todayMinutes = focus
      .filter((record) => localDateKey(record.ended_at || record.started_at) === today)
      .reduce((sum, record) => sum + Number(record.actual_minutes || 0), 0);
    const totalMinutes = focus.reduce((sum, record) => sum + Number(record.actual_minutes || 0), 0);

    els.todayStat.textContent = formatMinutes(todayMinutes);
    els.totalStat.textContent = formatMinutes(totalMinutes);
  }

  // The period chosen here drives both the forest and the project summary, so
  // there is one place to look at "how did this day / week / month go".
  function getPeriodRange() {
    const view = state.groveView;

    if (view === "month") {
      const start = new Date(state.monthStart);
      return {
        view,
        start,
        end: new Date(start.getFullYear(), start.getMonth() + 1, 1),
        rangeText: formatMonthRange(start),
        emptyText: t("grove.empty_month"),
        kicker: t("grove.monthly"),
      };
    }

    if (view === "week") {
      const start = new Date(state.weekStart);
      return {
        view,
        start,
        end: addDays(start, 7),
        rangeText: formatWeekRange(start),
        emptyText: t("grove.empty_week"),
        kicker: t("grove.weekly"),
      };
    }

    const today = startOfDay(new Date());
    return {
      view: "today",
      start: today,
      end: addDays(today, 1),
      rangeText: new Intl.DateTimeFormat(localeTag(), {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(today),
      emptyText: t("grove.empty_today"),
      kicker: t("grove.today"),
    };
  }

  function recordsInRange(start, end, { completedOnly = true } = {}) {
    return state.sessions
      .filter((record) => {
        const plantedAt = new Date(record.ended_at || record.started_at);
        if (completedOnly && record.status !== "completed") return false;
        return plantedAt >= start && plantedAt < end;
      })
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
  }

  function renderPeriod() {
    const range = getPeriodRange();
    renderWeekGrove(range);
    renderProjectSummary(range);
  }

  function renderWeekGrove(range = getPeriodRange()) {
    const { view, start, end, rangeText, emptyText, kicker } = range;

    // Trees come from completed sessions — an abandoned one grows nothing — but
    // the time it took still counts toward the totals.
    const completed = recordsInRange(start, end);
    const tracked = recordsInRange(start, end, { completedOnly: false });
    const minutesOf = (records) =>
      records.reduce((sum, record) => sum + Number(record.actual_minutes || 0), 0);
    const focusMinutes = minutesOf(tracked.filter((r) => !isRestRecord(r)));
    const restMinutes = minutesOf(tracked.filter(isRestRecord));

    els.grovePanelKicker.textContent = kicker;
    els.weekRange.textContent = rangeText;
    els.weekTreeCount.textContent = t(completed.length === 1 ? "grove.tree_one" : "grove.trees", { n: completed.length });
    els.weekFocusTime.textContent = t("grove.focused", { time: formatMinutes(focusMinutes) });
    els.weekRestTime.textContent = t("grove.rested", { time: formatMinutes(restMinutes) });
    els.weekRestTime.hidden = restMinutes === 0;

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
    renderPeriod();
  }

  function changeWeek(direction) {
    if (state.groveView === "month") {
      const d = new Date(state.monthStart);
      d.setMonth(d.getMonth() + direction);
      state.monthStart = startOfMonth(d);
    } else {
      state.weekStart = addDays(state.weekStart, direction * 7);
    }
    renderPeriod();
  }

  // --- Time by project (donut + legend) ------------------------------------

  function projectTotals(records) {
    const totals = new Map();
    records.forEach((record) => {
      const project = getRecordProject(record);
      const minutes = Number(record.actual_minutes || 0);
      if (minutes <= 0) return;
      const entry = totals.get(project.id) || { project, minutes: 0, count: 0 };
      entry.minutes += minutes;
      entry.count += 1;
      totals.set(project.id, entry);
    });
    return [...totals.values()].sort((a, b) => b.minutes - a.minutes);
  }

  // Time tracked, not trees earned: an abandoned session still cost you the
  // time, it just never grew anything, so it counts here.
  function renderProjectSummary(range = getPeriodRange()) {
    const rows = projectTotals(recordsInRange(range.start, range.end, { completedOnly: false }));
    const totalMinutes = rows.reduce((sum, row) => sum + row.minutes, 0);

    els.summaryTotal.textContent = formatMinutes(totalMinutes);
    els.donutTotal.textContent = formatMinutes(totalMinutes);
    els.donutCount.textContent = t(rows.length === 1 ? "summary.project_one" : "summary.projects", { n: rows.length });
    els.summaryBody.hidden = rows.length === 0;
    els.summaryEmpty.hidden = rows.length > 0;

    renderDonut(rows, totalMinutes);
    renderProjectLegend(rows, totalMinutes);
  }

  // Plain SVG: one arc per project, drawn with stroke-dasharray on a circle
  // whose circumference is exactly 100, so a percentage *is* the dash length.
  const DONUT_RADIUS = 15.9154943;

  function renderDonut(rows, totalMinutes) {
    const svgNS = "http://www.w3.org/2000/svg";
    const fragment = document.createDocumentFragment();

    const track = document.createElementNS(svgNS, "circle");
    track.setAttribute("class", "donut-track");
    track.setAttribute("cx", "21");
    track.setAttribute("cy", "21");
    track.setAttribute("r", String(DONUT_RADIUS));
    fragment.appendChild(track);

    let offset = 0;
    rows.forEach((row) => {
      const pct = totalMinutes ? (row.minutes / totalMinutes) * 100 : 0;
      // Leave a hairline gap between arcs, but never on a single full ring.
      const gap = rows.length > 1 ? Math.min(0.8, pct / 4) : 0;
      const arc = document.createElementNS(svgNS, "circle");
      arc.setAttribute("cx", "21");
      arc.setAttribute("cy", "21");
      arc.setAttribute("r", String(DONUT_RADIUS));
      arc.setAttribute("stroke", row.project.color);
      arc.setAttribute("stroke-dasharray", `${Math.max(0, pct - gap)} ${100 - Math.max(0, pct - gap)}`);
      arc.setAttribute("stroke-dashoffset", String(-offset));
      const label = document.createElementNS(svgNS, "title");
      label.textContent = `${projectDisplayName(row.project)} — ${formatMinutes(row.minutes)} (${Math.round(pct)}%)`;
      arc.appendChild(label);
      fragment.appendChild(arc);
      offset += pct;
    });

    els.projectDonut.replaceChildren(fragment);
  }

  function renderProjectLegend(rows, totalMinutes) {
    const fragment = document.createDocumentFragment();

    rows.forEach((row) => {
      const item = document.createElement("li");
      item.className = "legend-item";
      applyProjectVars(item, row.project);

      const dot = document.createElement("span");
      dot.className = "legend-dot";

      const name = document.createElement("span");
      name.className = "legend-name";
      name.textContent = projectDisplayName(row.project);

      const time = document.createElement("span");
      time.className = "legend-time";
      time.textContent = formatMinutes(row.minutes);

      const pct = document.createElement("span");
      pct.className = "legend-pct";
      pct.textContent = `${totalMinutes ? Math.round((row.minutes / totalMinutes) * 100) : 0}%`;

      item.append(dot, name, time, pct);
      item.title = t(row.count === 1 ? "project.record_one" : "project.records", { n: row.count });
      fragment.appendChild(item);
    });

    els.projectLegend.replaceChildren(fragment);
  }

  function createGroveTree(record, index) {
    const project = getRecordProject(record);
    const species = speciesForRecord(record);
    // Abandoned sessions keep the project's colour, drained of life.
    const palette = getTreePalette(project, { muted: record.status === "abandoned" });
    // The jitter that keeps the forest from looking like a plantation stays
    // per-record, so two trees of the same project still differ.
    const seed = getTreeSeed(`${project.id}:${record.id}`);
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
    const projectName = projectDisplayName(project);
    tree.title = `${projectName} · ${record.title} — ${formatMinutes(record.actual_minutes)}`;
    tree.setAttribute(
      "aria-label",
      `${projectName}, ${record.title}, ${species.label}, ${record.actual_minutes} minutes`
    );

    const visual = document.createElement("span");
    visual.className = "grove-plant plant";
    visual.setAttribute("aria-hidden", "true");
    visual.innerHTML = buildTreeSVG(species.id, palette);

    const label = document.createElement("span");
    label.className = "tree-label";
    label.textContent = projectName;
    applyProjectVars(label, project);

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

  // --- Views ---------------------------------------------------------------
  // Two screens, one document: the calendar is a section that swaps in, so
  // switching costs nothing and no state has to be rebuilt. The hash keeps the
  // back button working.

  function applyRoute() {
    const hash = (window.location.hash || "").replace(/^#/, "");
    setView(hash === "calendar" ? "calendar" : "timer", { fromRoute: true });
  }

  function setView(view, { fromRoute = false } = {}) {
    const next = view === "calendar" ? "calendar" : "timer";
    const changed = state.view !== next;
    state.view = next;

    els.workspace.hidden = next !== "timer";
    els.calendarView.hidden = next !== "calendar";
    els.viewFocusTab.classList.toggle("is-selected", next === "timer");
    els.viewCalendarTab.classList.toggle("is-selected", next === "calendar");
    els.viewFocusTab.setAttribute("aria-current", next === "timer" ? "page" : "false");
    els.viewCalendarTab.setAttribute("aria-current", next === "calendar" ? "page" : "false");

    if (!fromRoute) {
      if (next === "calendar") {
        if (window.location.hash !== "#calendar") window.location.hash = "calendar";
      } else if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }

    if (next !== "calendar") return;

    if (changed) state.calAnchor = defaultCalendarAnchor();
    renderCalendar();
    if (changed) scrollCalendarToNow();
  }

  // --- Calendar ------------------------------------------------------------
  // A Toggl-style day grid: 1–7 days side by side, zoomable, every record a
  // block coloured by its project. Blocks are laid out from CSS variables, so
  // zooming only changes one custom property instead of re-measuring anything.

  function loadCalDays() {
    const saved = Number(localStorage.getItem(STORAGE_CAL_DAYS));
    return Number.isFinite(saved) && saved >= 1 && saved <= 7 ? Math.round(saved) : CAL_DEFAULT_DAYS;
  }

  function loadCalZoom() {
    const saved = Number(localStorage.getItem(STORAGE_CAL_ZOOM));
    return Number.isFinite(saved) && saved > 0 ? clamp(saved, CAL_MIN_ZOOM, CAL_MAX_ZOOM) : CAL_DEFAULT_ZOOM;
  }

  // Today sits in the middle of the visible range, so yesterday's work and the
  // rest of today are both one glance away.
  function defaultCalendarAnchor() {
    return addDays(startOfDay(new Date()), -Math.floor((state.calDays - 1) / 2));
  }

  function setCalendarDays(days) {
    const next = clamp(Math.round(days) || CAL_DEFAULT_DAYS, 1, 7);
    if (next === state.calDays) return;
    const showedToday = calendarShowsToday();
    state.calDays = next;
    localStorage.setItem(STORAGE_CAL_DAYS, String(next));
    // Keep today on screen if it already was, rather than drifting away as the
    // range grows or shrinks.
    if (showedToday) state.calAnchor = defaultCalendarAnchor();
    renderCalendar();
  }

  function setCalendarZoom(zoom) {
    const next = clamp(Math.round(zoom), CAL_MIN_ZOOM, CAL_MAX_ZOOM);
    if (next === state.calZoom) return;
    // Keep whatever hour is at the top of the viewport pinned while zooming.
    const anchorHours = els.calScroll.scrollTop / state.calZoom;
    state.calZoom = next;
    localStorage.setItem(STORAGE_CAL_ZOOM, String(next));
    renderCalendar();
    els.calScroll.scrollTop = anchorHours * next;
  }

  function calendarShowsToday() {
    const today = startOfDay(new Date()).getTime();
    const start = startOfDay(state.calAnchor).getTime();
    return today >= start && today < addDays(state.calAnchor, state.calDays).getTime();
  }

  function shiftCalendar(direction) {
    state.calAnchor = addDays(state.calAnchor, direction * state.calDays);
    renderCalendar();
  }

  function renderCalendar() {
    if (state.view !== "calendar") return;
    // Rebuilding the grid under a live drag would tear out the block being
    // moved; every drag finishes with a render of its own.
    if (state.calDrag && state.calDrag.active) return;

    const days = state.calDays;
    const start = startOfDay(state.calAnchor);
    const dayDates = [];
    for (let index = 0; index < days; index += 1) dayDates.push(addDays(start, index));

    els.calDaysSelect.value = String(days);
    els.calGrid.style.setProperty("--cal-days", String(days));
    els.calGrid.style.setProperty("--cal-hour", `${state.calZoom}px`);
    els.calRange.textContent = formatCalendarRange(dayDates);
    els.calTodayButton.classList.toggle("is-current", calendarShowsToday());
    els.calZoomInButton.disabled = state.calZoom >= CAL_MAX_ZOOM;
    els.calZoomOutButton.disabled = state.calZoom <= CAL_MIN_ZOOM;

    const segmentsByDay = buildCalendarSegments(dayDates);
    const todayKey = localDateKey(new Date());
    const fragment = document.createDocumentFragment();

    const corner = document.createElement("div");
    corner.className = "cal-corner";
    fragment.appendChild(corner);

    dayDates.forEach((date, index) => {
      fragment.appendChild(createCalendarDayHead(date, segmentsByDay[index], todayKey));
    });

    fragment.appendChild(createCalendarGutter());

    dayDates.forEach((date, index) => {
      fragment.appendChild(createCalendarDayColumn(date, segmentsByDay[index], todayKey));
    });

    els.calGrid.replaceChildren(fragment);
    state.calMinuteStamp = Math.floor(Date.now() / 60000);
  }

  // Records plus the timer that is running right now, so the calendar shows the
  // block filling in live.
  function calendarEntries() {
    const entries = state.sessions.map((record) => {
      const startTime = new Date(record.started_at).getTime();
      const endTime = new Date(record.ended_at || record.started_at).getTime();
      return { record, start: startTime, end: Math.max(startTime, endTime), running: false };
    });

    if (state.timer) {
      const startTime = new Date(state.timer.startedAt).getTime();
      entries.push({ record: null, timer: state.timer, start: startTime, end: Date.now(), running: true });
    }

    return entries;
  }

  // Split every entry into per-day pieces (a session across midnight shows in
  // both columns), then lay overlapping pieces out side by side.
  function buildCalendarSegments(dayDates) {
    const rangeStart = dayDates[0].getTime();
    const rangeEnd = addDays(dayDates[dayDates.length - 1], 1).getTime();
    const entries = calendarEntries().filter(
      (entry) => entry.end > rangeStart && entry.start < rangeEnd
    );

    const perDay = dayDates.map(() => []);

    dayDates.forEach((date, index) => {
      const dayStart = date.getTime();
      const dayEnd = addDays(date, 1).getTime();

      entries.forEach((entry) => {
        const from = Math.max(entry.start, dayStart);
        const to = Math.min(entry.end, dayEnd);
        const startsHere = entry.start >= dayStart && entry.start < dayEnd;
        if (to <= from && !startsHere) return;

        const startMin = clamp((from - dayStart) / 60000, 0, 1440);
        const endMin = clamp((to - dayStart) / 60000, startMin, 1440);
        perDay[index].push({
          entry,
          // One piece of a record that runs past midnight: editable, but there
          // is no single block here to drag.
          partial: entry.start < dayStart || entry.end > dayEnd,
          startMin,
          // Very short records still need a tappable block.
          endMin: Math.min(1440, Math.max(endMin, startMin + 5)),
          minutes: Math.round((Math.min(entry.end, dayEnd) - from) / 60000),
        });
      });

      packCalendarSegments(perDay[index]);
    });

    return perDay;
  }

  // Greedy column packing: within each run of overlapping blocks, each one takes
  // the first column that is free, and they share the width of that run.
  function packCalendarSegments(segments) {
    segments.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

    let cluster = [];
    let clusterEnd = -Infinity;

    const flush = () => {
      const columnEnds = [];
      cluster.forEach((segment) => {
        let column = columnEnds.findIndex((endMin) => endMin <= segment.startMin);
        if (column === -1) {
          columnEnds.push(segment.endMin);
          column = columnEnds.length - 1;
        } else {
          columnEnds[column] = segment.endMin;
        }
        segment.column = column;
      });
      cluster.forEach((segment) => { segment.columns = columnEnds.length; });
      cluster = [];
      clusterEnd = -Infinity;
    };

    segments.forEach((segment) => {
      if (cluster.length && segment.startMin >= clusterEnd) flush();
      cluster.push(segment);
      clusterEnd = Math.max(clusterEnd, segment.endMin);
    });
    if (cluster.length) flush();

    return segments;
  }

  function createCalendarDayHead(date, segments, todayKey) {
    const head = document.createElement("div");
    head.className = "cal-dayhead";
    if (localDateKey(date) === todayKey) head.classList.add("is-today");

    const weekday = document.createElement("span");
    weekday.className = "cal-weekday";
    weekday.textContent = new Intl.DateTimeFormat(localeTag(), { weekday: "short" }).format(date);

    const dayNumber = document.createElement("span");
    dayNumber.className = "cal-daynum";
    dayNumber.textContent = new Intl.DateTimeFormat(localeTag(), {
      day: "2-digit",
      month: "2-digit",
    }).format(date);

    // All the time tracked on this day, the same measure the project summary
    // uses; only the timer still running is left out.
    const total = segments.reduce(
      (sum, segment) => sum + (segment.entry.record ? segment.minutes : 0),
      0
    );
    const totalNode = document.createElement("span");
    totalNode.className = "cal-daytotal";
    totalNode.textContent = total > 0 ? formatMinutes(total) : "";

    head.append(weekday, dayNumber, totalNode);
    return head;
  }

  function createCalendarGutter() {
    const gutter = document.createElement("div");
    gutter.className = "cal-gutter";
    const fragment = document.createDocumentFragment();

    // From 1: a label at 0:00 would be clipped by the header above it.
    for (let hour = 1; hour < 24; hour += 1) {
      const label = document.createElement("span");
      label.className = "cal-hour-label";
      label.style.top = `calc(${hour} * var(--cal-hour))`;
      label.textContent = formatHourLabel(hour);
      fragment.appendChild(label);
    }

    gutter.appendChild(fragment);
    return gutter;
  }

  function createCalendarDayColumn(date, segments, todayKey) {
    const column = document.createElement("div");
    column.className = "cal-day";
    column.dataset.date = localDateKey(date);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) column.classList.add("is-weekend");

    const fragment = document.createDocumentFragment();
    segments.forEach((segment) => fragment.appendChild(createCalendarEvent(segment)));

    if (localDateKey(date) === todayKey) {
      const now = new Date();
      const line = document.createElement("div");
      line.className = "cal-now";
      line.style.top = `calc(${((now.getHours() * 60 + now.getMinutes()) / 60).toFixed(4)} * var(--cal-hour))`;
      fragment.appendChild(line);
    }

    column.appendChild(fragment);
    return column;
  }

  function createCalendarEvent(segment) {
    const { entry } = segment;
    const record = entry.record;
    const project = record ? getRecordProject(record) : getProject(entry.timer.projectId);
    const spanHours = (segment.endMin - segment.startMin) / 60;
    const pixelHeight = spanHours * state.calZoom;

    const node = document.createElement("button");
    node.type = "button";
    node.className = "cal-event";
    if (record) {
      node.dataset.id = record.id;
      if (record.status === "abandoned") node.classList.add("is-abandoned");
    } else {
      node.classList.add("is-running");
      node.dataset.running = "true";
    }
    if (pixelHeight < 30) node.classList.add("is-short");
    else if (pixelHeight < 52) node.classList.add("is-medium");

    node.style.setProperty("--cal-start", (segment.startMin / 60).toFixed(4));
    node.style.setProperty("--cal-span", spanHours.toFixed(4));
    node.style.setProperty("--cal-left", (segment.column / segment.columns).toFixed(4));
    node.style.setProperty("--cal-width", (1 / segment.columns).toFixed(4));
    applyProjectVars(node, project, { alpha: state.theme === "dark" ? 0.24 : 0.16 });

    const title = document.createElement("span");
    title.className = "cal-event-title";
    title.textContent = record ? recordDisplayTitle(record) : entry.timer.title;

    const projectName = document.createElement("span");
    projectName.className = "cal-event-project";
    projectName.textContent = projectDisplayName(project);

    const time = document.createElement("span");
    time.className = "cal-event-time";
    time.textContent = entry.running
      ? `${formatTimeShort(entry.start)} · ${t("calendar.running")}`
      : `${formatTimeShort(entry.start)} – ${formatTimeShort(entry.end)}`;

    node.title = `${projectDisplayName(project)} · ${title.textContent} — ${formatMinutes(segment.minutes)}`;
    node.append(title, projectName, time);

    if (record && !segment.partial) {
      ["start", "end"].forEach((edge) => {
        const handle = document.createElement("span");
        handle.className = `cal-resize is-${edge}`;
        handle.dataset.edge = edge;
        handle.setAttribute("aria-hidden", "true");
        node.appendChild(handle);
      });
    } else if (segment.partial) {
      node.dataset.partial = "true";
    }

    return node;
  }

  function openRecordDialogAtSlot(dayNode, event) {
    const rect = dayNode.getBoundingClientRect();
    const minutesFromTop = ((event.clientY - rect.top) / state.calZoom) * 60;
    const slot = clamp(
      Math.floor(minutesFromTop / CAL_SNAP_MINUTES) * CAL_SNAP_MINUTES,
      0,
      1440 - CAL_SNAP_MINUTES
    );
    // The column's date is a local calendar day, so build the time locally too.
    const [year, month, day] = dayNode.dataset.date.split("-").map(Number);
    const startedAt = new Date(year, month - 1, day, 0, slot);
    openRecordDialog(null, { started_at: startedAt.toISOString(), minutes: 30 });
  }

  function scrollCalendarToNow() {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    els.calScroll.scrollTop = Math.max(0, ((minutes - 75) / 60) * state.calZoom);
  }

  // --- Calendar drag and drop ----------------------------------------------
  // Drag empty space to block out a new record, drag a block to move it, or
  // drag its top or bottom edge to change when it started or ended. Blocks are
  // positioned from CSS variables, so dragging just rewrites two numbers.

  function calendarDayBounds(column) {
    const [year, month, day] = column.dataset.date.split("-").map(Number);
    const start = new Date(year, month - 1, day);
    return { start: start.getTime(), end: addDays(start, 1).getTime() };
  }

  // Where in the day a pointer is, snapped to the grid. `forcedColumn` keeps a
  // gesture on the day it started on (only moving may cross days).
  function calendarPointToTime(clientX, clientY, forcedColumn) {
    const columns = Array.from(els.calGrid.querySelectorAll(".cal-day"));
    if (!columns.length) return null;

    let column = forcedColumn;
    if (!column) {
      column = columns.find((node) => {
        const rect = node.getBoundingClientRect();
        return clientX >= rect.left && clientX < rect.right;
      });
    }
    if (!column) {
      // Dragged off the side: stick to the nearest edge column.
      const first = columns[0].getBoundingClientRect();
      column = clientX < first.left ? columns[0] : columns[columns.length - 1];
    }

    const rect = column.getBoundingClientRect();
    const minutes = ((clientY - rect.top) / state.calZoom) * 60;
    const snapped = clamp(Math.round(minutes / CAL_SNAP_MINUTES) * CAL_SNAP_MINUTES, 0, 1440);
    return { column, time: calendarDayBounds(column).start + snapped * 60000 };
  }

  function onCalendarPointerDown(event) {
    if (event.button > 0 || state.calDrag) return;

    const dayNode = event.target.closest(".cal-day");
    if (!dayNode) return;

    const eventNode = event.target.closest(".cal-event");
    let mode = "create";
    let record = null;

    if (eventNode) {
      // Neither the timer that is still running nor one piece of a record that
      // crosses midnight is a whole block, so neither can be dragged.
      if (eventNode.dataset.running === "true" || eventNode.dataset.partial === "true") return;
      record = state.sessions.find((item) => item.id === eventNode.dataset.id);
      if (!record) return;
      const handle = event.target.closest(".cal-resize");
      mode = handle ? (handle.dataset.edge === "start" ? "resize-start" : "resize-end") : "move";
    }

    const point = calendarPointToTime(event.clientX, event.clientY, eventNode ? dayNode : null);
    if (!point) return;

    const from = record ? new Date(record.started_at).getTime() : point.time;
    const to = record ? new Date(record.ended_at || record.started_at).getTime() : point.time;

    state.calDrag = {
      pointerId: event.pointerId,
      touch: event.pointerType === "touch",
      mode,
      record,
      node: eventNode,
      column: dayNode,
      startX: event.clientX,
      startY: event.clientY,
      anchor: point.time,
      from,
      to,
      active: false,
      longPressId: null,
      ghost: null,
      current: { start: from, end: to, column: dayNode },
    };

    if (state.calDrag.touch) {
      const drag = state.calDrag;
      drag.longPressId = window.setTimeout(() => {
        if (state.calDrag === drag) beginCalendarDrag();
      }, CAL_LONG_PRESS_MS);
    }

    document.addEventListener("pointermove", onCalendarPointerMove, { passive: false });
    document.addEventListener("pointerup", onCalendarPointerUp);
    document.addEventListener("pointercancel", onCalendarPointerUp);
  }

  function beginCalendarDrag() {
    const drag = state.calDrag;
    if (!drag || drag.active) return;

    drag.active = true;
    document.body.classList.add("is-cal-dragging");

    if (drag.mode === "create") {
      drag.ghost = document.createElement("div");
      drag.ghost.className = "cal-ghost";
      drag.ghost.appendChild(document.createElement("span"));
      drag.column.appendChild(drag.ghost);
    } else {
      drag.node.classList.add("is-dragging");
      // Give the live time label room while it is being dragged.
      drag.node.classList.remove("is-short", "is-medium");
    }

    paintCalendarDrag();
  }

  function onCalendarPointerMove(event) {
    const drag = state.calDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;

    if (!drag.active) {
      const dx = Math.abs(event.clientX - drag.startX);
      const dy = Math.abs(event.clientY - drag.startY);
      // A finger already moving before the press completes is scrolling.
      if (drag.touch) {
        if (dx > 10 || dy > 10) cancelCalendarDrag();
        return;
      }
      if (dx < CAL_DRAG_THRESHOLD && dy < CAL_DRAG_THRESHOLD) return;
      beginCalendarDrag();
    }

    event.preventDefault();

    // Only a move may change day; creating and resizing stay where they began.
    const point = calendarPointToTime(
      event.clientX,
      event.clientY,
      drag.mode === "move" ? null : drag.column
    );
    if (point) updateCalendarDrag(point);
    autoScrollCalendar(event.clientY);
  }

  function updateCalendarDrag(point) {
    const drag = state.calDrag;
    const bounds = calendarDayBounds(point.column);
    const duration = drag.to - drag.from;

    if (drag.mode === "create") {
      drag.current = {
        start: Math.min(drag.anchor, point.time),
        end: Math.max(drag.anchor, point.time),
        column: drag.column,
      };
    } else if (drag.mode === "move") {
      // Records stay inside a single day, so a move that would spill over
      // midnight stops at the edge instead.
      let start = drag.from + (point.time - drag.anchor);
      start = clamp(start, bounds.start, Math.max(bounds.start, bounds.end - duration));
      drag.current = { start, end: start + duration, column: point.column };
    } else if (drag.mode === "resize-start") {
      const end = drag.current.end;
      const start = clamp(point.time, bounds.start, end - CAL_MIN_MINUTES * 60000);
      drag.current = { start, end, column: drag.column };
    } else {
      const start = drag.current.start;
      const end = clamp(point.time, start + CAL_MIN_MINUTES * 60000, bounds.end);
      drag.current = { start, end, column: drag.column };
    }

    paintCalendarDrag();
  }

  function paintCalendarDrag() {
    const drag = state.calDrag;
    const node = drag.mode === "create" ? drag.ghost : drag.node;
    if (!node) return;

    const column = drag.current.column;
    const bounds = calendarDayBounds(column);
    const startMin = clamp((drag.current.start - bounds.start) / 60000, 0, 1440);
    const endMin = clamp((drag.current.end - bounds.start) / 60000, startMin, 1440);

    if (node.parentElement !== column) column.appendChild(node);
    node.style.setProperty("--cal-start", (startMin / 60).toFixed(4));
    node.style.setProperty("--cal-span", Math.max(0.06, (endMin - startMin) / 60).toFixed(4));
    // A block being dragged takes the whole column, so it can't hide behind the
    // ones it is passing.
    node.style.setProperty("--cal-left", "0");
    node.style.setProperty("--cal-width", "1");

    const minutes = Math.round((drag.current.end - drag.current.start) / 60000);
    const label = `${formatTimeShort(drag.current.start)} – ${formatTimeShort(drag.current.end)} · ${formatMinutes(minutes)}`;
    const labelNode = drag.mode === "create" ? node.firstChild : node.querySelector(".cal-event-time");
    if (labelNode) labelNode.textContent = label;
  }

  // Nudge the day along when the pointer reaches the top or bottom of the
  // viewport, so a block can be dragged somewhere that isn't on screen yet.
  function autoScrollCalendar(clientY) {
    const rect = els.calScroll.getBoundingClientRect();
    const edge = 36;
    let delta = 0;
    if (clientY < rect.top + edge) delta = clientY - (rect.top + edge);
    else if (clientY > rect.bottom - edge) delta = clientY - (rect.bottom - edge);
    if (!delta) return;
    els.calScroll.scrollTop += clamp(delta * 0.35, -18, 18);
  }

  function detachCalendarDragListeners() {
    document.removeEventListener("pointermove", onCalendarPointerMove);
    document.removeEventListener("pointerup", onCalendarPointerUp);
    document.removeEventListener("pointercancel", onCalendarPointerUp);
  }

  function cancelCalendarDrag() {
    const drag = state.calDrag;
    if (!drag) return;
    detachCalendarDragListeners();
    window.clearTimeout(drag.longPressId);
    state.calDrag = null;
    document.body.classList.remove("is-cal-dragging");
    if (drag.ghost) drag.ghost.remove();
    if (drag.node) drag.node.classList.remove("is-dragging");
    if (drag.active) renderCalendar();
  }

  function onCalendarPointerUp(event) {
    const drag = state.calDrag;
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;

    detachCalendarDragListeners();
    window.clearTimeout(drag.longPressId);
    state.calDrag = null;
    document.body.classList.remove("is-cal-dragging");
    if (drag.ghost) drag.ghost.remove();
    if (drag.node) drag.node.classList.remove("is-dragging");

    // Nothing moved: this was a tap, and the click handler will open the editor.
    if (!drag.active) return;

    // A finished drag must not also register as a click on what it landed on.
    state.calSuppressClick = true;
    window.setTimeout(() => { state.calSuppressClick = false; }, 400);

    const minutes = Math.round((drag.current.end - drag.current.start) / 60000);

    if (drag.mode === "create") {
      renderCalendar();
      if (minutes < CAL_MIN_MINUTES) return;
      openRecordDialog(null, { started_at: new Date(drag.current.start).toISOString(), minutes });
      return;
    }

    commitCalendarDrag(drag.record, drag.current.start, Math.max(CAL_MIN_MINUTES, minutes), drag.mode);
  }

  async function commitCalendarDrag(record, startTime, minutes, mode) {
    // Land on whole minutes: a record made by the timer starts at some stray
    // second, and carrying that through a drag makes the times read a minute
    // out from the grid line it was dropped on.
    const start = Math.floor(startTime / 60000) * 60000;
    const started_at = new Date(start).toISOString();
    const ended_at = new Date(start + minutes * 60000).toISOString();

    if (record.started_at === started_at && Number(record.actual_minutes) === minutes) {
      renderCalendar();
      return;
    }

    // A block is easy to nudge by accident, so the new time is only written
    // once it has been confirmed. The block stays where it was dropped while
    // the question is on screen, and springs back if the answer is no.
    const confirmed = window.confirm(
      t(mode === "move" ? "confirm.move_record" : "confirm.resize_record", {
        title: recordDisplayTitle(record),
        from: formatDragSpan(record.started_at, record.ended_at || record.started_at),
        to: formatDragSpan(started_at, ended_at),
      })
    );

    if (!confirmed) {
      renderCalendar();
      return;
    }

    await updateRecord(record.id, { started_at, ended_at, actual_minutes: minutes });
    showToast(t("toast.record_saved"));
  }

  // "Sat, Aug 8 · 09:00 – 10:45"
  function formatDragSpan(start, end) {
    const day = new Intl.DateTimeFormat(localeTag(), {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(start));
    return `${day} · ${formatTimeShort(start)} – ${formatTimeShort(end)}`;
  }

  function renderAccount() {
    els.authActions.hidden = !state.supabaseConfigured || Boolean(state.user);
    els.signedInActions.hidden = !state.user;

    if (!state.supabaseConfigured) {
      els.syncBadge.textContent = t("badge.local");
      els.modeLabel.textContent = t("brand.local_garden");
      els.navAuthStatus.textContent = t("nav.local");
      els.accountButton.title = t("nav.account");
      setAccountStatus("hard-drive", t("account.status_local"));
      return;
    }

    if (!state.user) {
      els.syncBadge.textContent = t("badge.local");
      els.modeLabel.textContent = t("brand.local_garden");
      els.navAuthStatus.textContent = t("nav.sign_in");
      els.accountButton.title = t("account.continue_google");
      setAccountStatus("cloud", t("account.status_cloud"));
      return;
    }

    els.syncBadge.textContent = t("badge.synced");
    els.modeLabel.textContent = t("brand.cloud_garden");
    els.navAuthStatus.textContent = t("nav.signed_in");
    els.accountButton.title = getUserDisplayName(state.user);
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

    let { error } = await state.supabase
      .from("active_focus_timers")
      .upsert(toCloudActiveTimer(state.timer), { onConflict: "user_id" });

    // Most likely the project_id column hasn't been added yet; retry without it
    // so cross-device timer sync keeps working on an older database.
    if (error && !state.activeTimerProjectMissing) {
      state.activeTimerProjectMissing = true;
      ({ error } = await state.supabase
        .from("active_focus_timers")
        .upsert(toCloudActiveTimer(state.timer), { onConflict: "user_id" }));
    }

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
    showToast(t("toast.cloud_timer_sql"));
  }

  // Enter saves. Without this the browser submits the form through its first
  // submit button — which is the close button — so pressing Enter after typing
  // would throw the work away.
  function bindEnterToSave(form, save) {
    form.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      // Mid-composition Enter is how an IME accepts a word (Korean, Japanese,
      // pinyin), not how it submits a form.
      if (event.isComposing || event.keyCode === 229) return;
      const target = event.target;
      if (target.tagName === "BUTTON" || target.tagName === "TEXTAREA") return;
      event.preventDefault();
      save();
    });
  }

  // One way to open and close every dialog, with a fallback for browsers that
  // never shipped showModal().
  function showDialog(dialog) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    refreshIcons();
  }

  function hideDialog(dialog) {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function openAccountDialog() {
    showDialog(els.accountDialog);
    // Rendered here rather than at startup: the button is only ever seen in
    // this dialog, and Google's script shouldn't cost anything until then.
    renderGoogleSignIn();
  }

  function closeAccountDialog() {
    hideDialog(els.accountDialog);
  }

  // `record` edits an existing one; `defaults` seeds a new one (the calendar
  // passes the slot that was tapped).
  function openRecordDialog(record, defaults = {}) {
    const start = defaults.started_at ? new Date(defaults.started_at) : roundToQuarter(new Date());
    const fallbackMinutes = defaults.minutes || state.selectedDuration;
    const value = record || {
      id: "",
      title: "",
      project_id: defaults.project_id || state.selectedProjectId,
      started_at: start.toISOString(),
      ended_at: new Date(start.getTime() + fallbackMinutes * 60000).toISOString(),
      status: "completed",
      duration_minutes: fallbackMinutes,
      actual_minutes: fallbackMinutes,
    };

    els.dialogTitle.textContent = record ? t("dialog.edit_session") : t("dialog.add_session");
    els.recordIdInput.value = value.id;
    els.recordTitleInput.value = value.title;
    fillProjectSelect(els.recordProjectInput, resolveProjectId(value));
    els.recordStartedInput.value = toDatetimeLocal(value.started_at);
    els.recordEndedInput.value = toDatetimeLocal(
      value.ended_at || new Date(new Date(value.started_at).getTime() + value.actual_minutes * 60000)
    );
    els.recordStatusInput.value = value.status;
    els.recordDurationInput.value = value.duration_minutes;
    els.deleteRecordButton.hidden = !record;

    renderRecordDialogProject();
    renderRecordDurationHint();
    showDialog(els.recordDialog);
    refreshIcons();
  }

  function renderRecordDialogProject() {
    applyProjectVars(els.recordProjectDot, getProject(els.recordProjectInput.value));
  }

  // Live feedback while editing times: how long the record will be, and a
  // warning when the end is before the start.
  function renderRecordDurationHint() {
    const minutes = dialogRecordMinutes();
    els.recordDurationHint.textContent =
      minutes == null
        ? ""
        : `${t("metric.focused", { n: minutes })}`;
  }

  function dialogRecordMinutes() {
    const started = fromDatetimeLocal(els.recordStartedInput.value);
    const ended = fromDatetimeLocal(els.recordEndedInput.value);
    if (!started || !ended) return null;
    return clamp(Math.round((ended.getTime() - started.getTime()) / 60000), 0, MAX_RECORD_MINUTES);
  }

  async function saveDialogRecord() {
    if (!els.recordForm.reportValidity()) return;

    const startedAt = fromDatetimeLocal(els.recordStartedInput.value);
    const endedAtInput = fromDatetimeLocal(els.recordEndedInput.value);
    if (!startedAt || !endedAtInput) return;

    if (endedAtInput.getTime() < startedAt.getTime()) {
      els.recordEndedInput.setCustomValidity(t("dialog.end_before_start"));
      els.recordForm.reportValidity();
      els.recordEndedInput.setCustomValidity("");
      return;
    }

    const id = els.recordIdInput.value || createId();
    const projectId = els.recordProjectInput.value || DEFAULT_PROJECT_ID;
    const status = els.recordStatusInput.value;
    const actualMinutes = clamp(
      Math.round((endedAtInput.getTime() - startedAt.getTime()) / 60000),
      0,
      MAX_RECORD_MINUTES
    );
    const durationMinutes = cleanMinutes(els.recordDurationInput.value, actualMinutes || 1, 1);
    const title = els.recordTitleInput.value.trim() || projectDisplayName(getProject(projectId));
    const changes = {
      id,
      title,
      project_id: projectId,
      started_at: startedAt.toISOString(),
      // Store the end exactly as the minutes we keep, so the calendar block and
      // the "focused" figure can never disagree.
      ended_at: new Date(startedAt.getTime() + actualMinutes * 60000).toISOString(),
      status,
      duration_minutes: durationMinutes,
      actual_minutes: actualMinutes,
      tree_kind: pickTreeKind(projectId, status),
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

    if (!isRestRecord(changes)) rememberSessionName(changes.title);
    closeDialog();
    showToast(t("toast.record_saved"));
  }

  async function deleteDialogRecord() {
    const record = state.sessions.find((item) => item.id === els.recordIdInput.value);
    if (!record) return;
    closeDialog();
    await deleteRecord(record);
  }

  // --- Google sign-in ------------------------------------------------------
  // There are two ways in, and the first is preferred:
  //
  //   1. Google Identity Services — Google's own button, handled in a popup on
  //      this page. The prompt names *this site*, because the browser never
  //      leaves it. Needs a Google client id in the config.
  //   2. The redirect flow — the page hands off to Google and returns through
  //      Supabase's callback, so Google's prompt names that callback URL
  //      instead. This is the fallback, and what runs with no client id set.

  const GOOGLE_GSI_SRC = "https://accounts.google.com/gsi/client";

  function googleClientId() {
    const config = window.TIMBERTIMER_SUPABASE || {};
    return typeof config.googleClientId === "string" ? config.googleClientId.trim() : "";
  }

  // The in-page flow needs a client id, a signed-out session, and a secure
  // context (it hashes the nonce with WebCrypto, which http:// doesn't offer).
  function canUseGoogleIdentity() {
    return Boolean(
      googleClientId() &&
      state.supabase &&
      !state.user &&
      window.isSecureContext &&
      window.crypto &&
      window.crypto.subtle
    );
  }

  function loadGoogleIdentityScript() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      return Promise.resolve(true);
    }
    if (state.gsiPromise) return state.gsiPromise;

    // Loaded on demand, so opening the app never waits on Google's CDN.
    state.gsiPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = GOOGLE_GSI_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(Boolean(window.google && window.google.accounts && window.google.accounts.id));
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
    return state.gsiPromise;
  }

  // Google receives the hash and Supabase the original, which is how the token
  // is proved to belong to this sign-in rather than a replayed one.
  async function createGoogleNonce() {
    const bytes = window.crypto.getRandomValues(new Uint8Array(32));
    const raw = btoa(String.fromCharCode.apply(null, Array.from(bytes))).replace(/[^a-zA-Z0-9]/g, "");
    const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const hashed = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return { raw, hashed };
  }

  // The redirect button is always on screen — as the only way in when Google's
  // own button can't be used, and as a quiet second option when it can. Some
  // failures (an unregistered origin, say) happen inside Google's popup and
  // never report back here, so hiding it would leave no way to sign in at all.
  function setGoogleFallbackRole(role) {
    const label = els.googleSignInButton.querySelector("span");
    const key = role === "secondary" ? "account.other_way" : "account.continue_google";
    els.googleSignInButton.hidden = false;
    els.googleSignInButton.classList.toggle("is-secondary", role === "secondary");
    // Set the key too, so switching language keeps the right label.
    label.dataset.i18n = key;
    label.textContent = t(key);
  }

  async function renderGoogleSignIn() {
    els.googleButtonHolder.replaceChildren();

    if (!canUseGoogleIdentity()) {
      setGoogleFallbackRole("primary");
      return;
    }

    const loaded = await loadGoogleIdentityScript();
    // Blocked, offline, or an ad blocker ate it — the redirect still works.
    if (!loaded) {
      setGoogleFallbackRole("primary");
      return;
    }

    try {
      const nonce = await createGoogleNonce();
      state.googleNonce = nonce.raw;

      window.google.accounts.id.initialize({
        client_id: googleClientId(),
        callback: onGoogleCredential,
        nonce: nonce.hashed,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(els.googleButtonHolder, {
        type: "standard",
        theme: state.theme === "dark" ? "filled_black" : "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        // Follow the app's own language toggle rather than the browser's.
        locale: localeTag(),
        width: Math.round(clamp(els.googleButtonHolder.clientWidth || 320, 200, 400)),
      });

      setGoogleFallbackRole("secondary");
    } catch (error) {
      console.warn(error);
      setGoogleFallbackRole("primary");
    }
  }

  async function onGoogleCredential(response) {
    if (!response || !response.credential || !state.supabase) return;

    const { error } = await state.supabase.auth.signInWithIdToken({
      provider: "google",
      token: response.credential,
      nonce: state.googleNonce,
    });

    if (error) {
      // Most likely this client id isn't listed on Supabase's Google provider.
      console.warn(error);
      setGoogleFallbackRole("primary");
      showToast(t("toast.google_id_failed"));
      return;
    }

    closeAccountDialog();
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
    showToast(t("toast.signed_out"));
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
    // Skip rests: "Rest" is a record but never a session name you'd focus under.
    const latestFocus = sortedSessions().find((record) => !isRestRecord(record));
    const latestTitle = latestFocus ? latestFocus.title : "Deep focus";
    els.sessionTitle.value = savedTitle || latestTitle;
    rememberSessionName(els.sessionTitle.value);
    // The task name decides the project; failing that, pick up where the last
    // session left off.
    const paired = projectForTitle(els.sessionTitle.value);
    if (paired) {
      state.selectedProjectId = paired;
    } else if (!state.projects.some((project) => project.id === state.selectedProjectId)) {
      state.selectedProjectId = latestFocus ? resolveProjectId(latestFocus) : DEFAULT_PROJECT_ID;
    }
    syncSelectedTree();
  }

  function rememberSessionName(value) {
    const title = (value || els.sessionTitle.value || "Deep focus").trim() || "Deep focus";
    localStorage.setItem(STORAGE_SESSION_NAME, title);
  }

  // Only read now: the old per-title tree choices are folded into the projects
  // they became, the first time this version runs.
  function loadTreePrefs() {
    try { return JSON.parse(localStorage.getItem(STORAGE_TREE_PREF) || "{}"); }
    catch { return {}; }
  }

  function getTreePrefForName(name) {
    const key = (name || "").toLowerCase().trim() || "deep focus";
    return loadTreePrefs()[key] || null;
  }

  function fillTreeSelect(select, { includeWilted = false } = {}) {
    const species = includeWilted ? [...TREE_SPECIES, WILTED_TREE] : TREE_SPECIES;
    if (select.options.length !== species.length) {
      const fragment = document.createDocumentFragment();
      species.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        fragment.appendChild(option);
      });
      select.replaceChildren(fragment);
    }
    // Keep labels in sync with the current language.
    Array.from(select.options).forEach((option) => {
      option.textContent = t("tree." + option.value);
    });
  }

  function renderTreePicker() {
    const project = getProject(state.timer?.projectId || state.selectedProjectId);
    fillTreeSelect(els.treePicker, { includeWilted: project.tree === WILTED_TREE.id });
    els.treePicker.value = state.selectedTreeId;
    els.treePicker.disabled = Boolean(state.timer) || project.missing;
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
        projectId: timer.projectId || timer.project_id || DEFAULT_PROJECT_ID,
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
      projectId: timer.projectId || timer.project_id || DEFAULT_PROJECT_ID,
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
    // Records written before projects existed are mapped to one here, so the
    // rest of the app never has to think about the two shapes.
    const projectId = resolveProjectId(record);
    return {
      id: record.id || createId(),
      user_id: record.user_id || null,
      title,
      project_id: projectId,
      duration_minutes: duration,
      actual_minutes: actual,
      status,
      started_at: record.started_at || now,
      ended_at: record.ended_at || record.started_at || now,
      tree_kind: resolveTreeKind(record, projectId, status),
      created_at: record.created_at || now,
      updated_at: record.updated_at || now,
    };
  }

  // Keep the species that was actually chosen for this record. Only fall back
  // to the project's tree for records that never stored a tree_kind.
  function resolveTreeKind(record, projectId, status) {
    if (status === "abandoned") return WILTED_TREE.label;
    const stored = record.tree_kind;
    // A rest plants a wilted tree even though it completes, and WILTED_TREE is
    // not part of TREE_SPECIES — keep it rather than re-deriving a healthy one.
    if (stored === WILTED_TREE.label) return stored;
    if (stored && TREE_SPECIES.some((s) => s.label === stored)) return stored;
    return pickTreeKind(projectId, status);
  }

  // Rest records store the English "Rest" so they mean the same thing in every
  // language; only that untouched default is shown translated.
  function recordDisplayTitle(record) {
    return isRestRecord(record) && record.title === REST_RECORD_TITLE
      ? t("rest.record_title")
      : record.title;
  }

  // Rest is just a project now, which is what makes rests addable by hand.
  function isRestRecord(record) {
    return resolveProjectId(record) === REST_PROJECT_ID;
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

    // Databases that predate the projects migration have no such column; the
    // record still saves, and picks its project up from its title as before.
    if (!state.sessionsProjectColumnMissing) row.project_id = record.project_id || null;

    if (!forUpdate) {
      row.id = record.id;
      row.user_id = state.user.id;
      row.created_at = record.created_at || new Date().toISOString();
    }

    return row;
  }

  function toCloudActiveTimer(timer) {
    const row = {
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
    // Older databases predate the column; the timer still syncs without it.
    if (!state.activeTimerProjectMissing) row.project_id = timer.projectId || DEFAULT_PROJECT_ID;
    return row;
  }

  function fromCloudActiveTimer(row) {
    const projectId = row.project_id || DEFAULT_PROJECT_ID;
    return normalizeTimer({
      mode: row.mode || "countdown",
      title: row.title,
      id: row.timer_id,
      projectId,
      // The project owns the species, so a timer started on another device grows
      // the same tree here.
      selectedTreeId: getProject(projectId).tree,
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
      // Managing projects stays available while a session runs.
      if (element.hasAttribute("data-keep-enabled")) return;
      element.disabled = disabled;
    });
    els.durationButtons.forEach((button) => {
      button.disabled = disabled;
    });
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

    showToast(t(state.soundEnabled ? "toast.sound_on" : "toast.sound_off"));
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

  // --- Appearance ---------------------------------------------------------
  // Dark is the default; light is opt-in and remembered per device.

  function loadTheme() {
    return localStorage.getItem(STORAGE_THEME) === "light" ? "light" : "dark";
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_THEME, state.theme);
    // Project colours are adjusted per theme for contrast, so everything that
    // paints with them is repainted too.
    renderAll();
  }

  function renderTheme() {
    const isDark = state.theme === "dark";
    document.documentElement.dataset.theme = state.theme;
    els.themeColorMeta.setAttribute("content", THEME_COLORS[state.theme]);
    // Colourful emoji, offering the appearance you'd switch *to*.
    els.themeToggleButton.textContent = isDark ? "☀️" : "🌙";
    els.themeToggleButton.title = isDark ? "Switch to light appearance" : "Switch to dark appearance";
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
    const confirmed = window.confirm(
      t(canUseCloud() ? "confirm.delete_all_cloud" : "confirm.delete_all_local")
    );
    if (!confirmed) return;

    if (canUseCloud()) {
      const { error } = await state.supabase
        .from("focus_sessions")
        .delete()
        .eq("user_id", state.user.id);

      if (error) {
        showToast(t("toast.cloud_delete_all_fail"));
        console.warn(error);
        return;
      }
    } else {
      saveLocalSessions([]);
    }

    state.sessions = [];
    renderAll();
    showToast(t("toast.all_deleted"));
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

  // The species stored on a record. Abandoned sessions always wilt; everything
  // else takes the species its project is currently growing.
  function pickTreeKind(projectId, status) {
    if (status === "abandoned") return WILTED_TREE.label;
    return treeLabelFromId(getProject(projectId).tree);
  }

  function treeLabelFromId(speciesId) {
    const species = TREE_SPECIES.find((s) => s.id === speciesId);
    if (species) return species.label;
    return speciesId === WILTED_TREE.id ? WILTED_TREE.label : TREE_SPECIES[0].label;
  }

  // The species a record is *drawn* with. The project is the source of truth, so
  // changing a project's tree re-plants its whole forest; the stored kind is the
  // fallback for records whose project has been deleted.
  function speciesForRecord(record) {
    if (record.status === "abandoned") return WILTED_TREE;
    const project = getRecordProject(record);
    if (project.tree === WILTED_TREE.id) return WILTED_TREE;
    const fromProject = TREE_SPECIES.find((s) => s.id === project.tree);
    if (fromProject) return fromProject;
    return (
      TREE_SPECIES.find((s) => s.label === record.tree_kind) ||
      TREE_SPECIES.find((s) => s.id === record.tree_kind) ||
      TREE_SPECIES[0]
    );
  }

  // A new project gets a stable tree derived from its name, so projects vary
  // across species instead of all defaulting to pine. It can be changed anytime.
  function defaultTreeForName(name) {
    return TREE_SPECIES[mixedHash(`${getTreeSeed(name)}:species`) % TREE_SPECIES.length].id;
  }

  // --- Colour -------------------------------------------------------------
  // Every tree is painted from its project's colour, so a red project grows red
  // trees. Bark stays woody, nudged a little toward the project's hue.

  function hexToRgb(hex) {
    const value = normalizeColor(hex) || MISSING_PROJECT_COLOR;
    return {
      r: parseInt(value.slice(1, 3), 16),
      g: parseInt(value.slice(3, 5), 16),
      b: parseInt(value.slice(5, 7), 16),
    };
  }

  function hexToHsl(hex) {
    const { r, g, b } = hexToRgb(hex);
    const rr = r / 255;
    const gg = g / 255;
    const bb = b / 255;
    const max = Math.max(rr, gg, bb);
    const min = Math.min(rr, gg, bb);
    const l = (max + min) / 2;
    const delta = max - min;

    if (!delta) return { h: 0, s: 0, l: l * 100 };

    const s = delta / (1 - Math.abs(2 * l - 1));
    let h;
    if (max === rr) h = ((gg - bb) / delta) % 6;
    else if (max === gg) h = (bb - rr) / delta + 2;
    else h = (rr - gg) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;
    return { h, s: s * 100, l: l * 100 };
  }

  function hsl(h, s, l) {
    return `hsl(${Math.round(((h % 360) + 360) % 360)}, ${clamp(Math.round(s), 0, 100)}%, ${clamp(Math.round(l), 0, 100)}%)`;
  }

  // `muted` is used for wilted trees (abandoned sessions): the project's colour
  // is still recognisable, just drained of life.
  function paletteFromColor(color, { muted = false } = {}) {
    const { h, s, l } = hexToHsl(color);
    const sat = muted ? s * 0.34 : s;
    const light = muted ? Math.min(64, l + 6) : l;
    // Pull the bark toward brown while keeping a hint of the project's hue.
    const barkHue = h * 0.22 + 28 * 0.78;
    return {
      leafA: hsl(h, sat, clamp(light + 6, 26, 74)),
      leafB: hsl(h + 8, sat * 0.92, clamp(light - 20, 14, 52)),
      barkA: hsl(barkHue, muted ? 16 : 34, muted ? 44 : 46),
      barkB: hsl(barkHue, muted ? 14 : 30, muted ? 30 : 30),
    };
  }

  function getTreePalette(project, options) {
    return paletteFromColor(project && project.color ? project.color : MISSING_PROJECT_COLOR, options);
  }

  // A readable version of a project colour for text on the current theme:
  // lightened on dark, darkened on light.
  function projectInk(color) {
    const { h, s, l } = hexToHsl(color);
    return state.theme === "dark"
      ? hsl(h, Math.max(45, s), clamp(Math.max(l, 66), 66, 84))
      : hsl(h, Math.max(40, s * 0.96), clamp(Math.min(l, 42), 24, 42));
  }

  function projectSoft(color, alpha) {
    const { r, g, b } = hexToRgb(color);
    const opacity = alpha != null ? alpha : (state.theme === "dark" ? 0.2 : 0.14);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Hand a project's colours to CSS in one place, so components only style.
  function applyProjectVars(element, project, options = {}) {
    if (!element) return;
    const color = (project && project.color) || MISSING_PROJECT_COLOR;
    element.style.setProperty("--project-color", color);
    element.style.setProperty("--project-ink", projectInk(color));
    element.style.setProperty("--project-soft", projectSoft(color, options.alpha));
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
        // Run the trunk up into the crown (the circles paint over it) so no
        // bare gap shows between trunk and leaves.
        svgTrunk(68, 12, 8, p.barkA, p.barkB) +
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
    // A sad, bare tree: leaning trunk, dead branches, a few drooping leaves.
    wilted() {
      const bark = "#7a6a4e";
      const barkDark = "#5d5039";
      const leafA = "#8a7550";
      const leafB = "#6a5940";
      const trunk =
        `<path d="M 50 116 Q 45 92 54 70 Q 60 50 51 32" stroke="${bark}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
      const branches =
        `<path d="M 53 72 Q 38 66 28 52" stroke="${barkDark}" stroke-width="5.5" fill="none" stroke-linecap="round"/>` +
        `<path d="M 57 56 Q 72 52 80 39" stroke="${barkDark}" stroke-width="5.5" fill="none" stroke-linecap="round"/>` +
        `<path d="M 52 90 Q 66 86 73 76" stroke="${barkDark}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
      const leaves =
        svgBlade(28, 52, 105, 19, 6.5, 13, leafA) +
        svgBlade(80, 39, 72, 19, 6.5, 13, leafB) +
        svgBlade(73, 76, 84, 16, 5.5, 11, leafA) +
        svgBlade(51, 32, 96, 17, 6, 11, leafB);
      return trunk + branches + leaves;
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
    return clamp(number, min, MAX_RECORD_MINUTES);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatClock(seconds) {
    // Floor here so a fractional reading (the stopwatch keeps sub-second
    // precision) still prints as a clean clock rather than "05:33.417".
    const safeSeconds = Math.floor(Math.max(0, Number(seconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const leftover = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(leftover).padStart(2, "0")}`;
  }

  function formatMinutes(minutes) {
    const m = t("unit.m");
    const h = t("unit.h");
    const rounded = Math.max(0, Math.round(minutes));
    if (rounded < 60) return `${rounded}${m}`;
    const hours = Math.floor(rounded / 60);
    const leftover = rounded % 60;
    return leftover ? `${hours}${h} ${leftover}${m}` : `${hours}${h}`;
  }

  function formatRecordDate(value) {
    return new Intl.DateTimeFormat(localeTag(), {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  // "8 Aug 2026, 14:00 – 15:30" — the end time matters now that records can be
  // edited on a calendar.
  function formatRecordRange(record) {
    const started = new Date(record.started_at);
    const ended = new Date(record.ended_at || record.started_at);
    const startText = formatRecordDate(started);
    if (ended.getTime() <= started.getTime()) return startText;
    return `${startText} – ${formatTimeShort(ended)}`;
  }

  function formatTimeShort(value) {
    return new Intl.DateTimeFormat(localeTag(), {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function formatHourLabel(hour) {
    return new Intl.DateTimeFormat(localeTag(), { hour: "numeric" }).format(new Date(2000, 0, 1, hour));
  }

  function formatCalendarRange(dayDates) {
    const first = dayDates[0];
    const last = dayDates[dayDates.length - 1];
    const sameMonth = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear();

    if (dayDates.length === 1) {
      return new Intl.DateTimeFormat(localeTag(), {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(first);
    }

    const startText = new Intl.DateTimeFormat(localeTag(), {
      month: "short",
      day: "numeric",
    }).format(first);
    const endText = new Intl.DateTimeFormat(localeTag(), {
      month: sameMonth ? undefined : "short",
      day: "numeric",
    }).format(last);
    return `${startText} – ${endText}`;
  }

  function localDateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function startOfDay(value) {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // New records snap to a quarter hour, which is where people actually put them.
  function roundToQuarter(value) {
    const date = new Date(value);
    date.setSeconds(0, 0);
    date.setMinutes(Math.round(date.getMinutes() / 15) * 15);
    return date;
  }

  function startOfWeek(value) {
    const date = startOfDay(value);
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
    return new Intl.DateTimeFormat(localeTag(), { month: "long", year: "numeric" }).format(date);
  }

  function addDays(value, days) {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
  }

  function formatWeekRange(start) {
    const end = addDays(start, 6);
    const formatter = new Intl.DateTimeFormat(localeTag(), {
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
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
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
    hideDialog(els.recordDialog);
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
