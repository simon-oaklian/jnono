const AUTH_TOKEN_KEY = "jnono-auth-token-v1";
const API_BASE = /^https?:\/\//i.test(window.location.origin || "") ? window.location.origin : "";
const MEMBERSHIP_SYNC_INTERVAL_MS = 15000;

const state = {
  bank: null,
  user: null,
  currentIndustryId: null,
  currentExamFamilyKey: null,
  currentTradeCode: null,
  currentExamType: null,
  currentExamId: null,
  quizQuestions: [],
  currentIndex: 0,
  answers: {},
  timerEnabled: true,
  timeLeft: 75,
  timerId: null,
  authToken: "",
  syncTimerId: null,
  syncInFlight: false,
  showChinese: false,
  lastWrongItems: [],
  practiceModeContext: "category",
  dashboardModules: [],
  progressSummary: {},
  courseContents: [],
  activeSideNavKey: "home",
  currentMemberView: "dashboard",
  continueRecommendation: null,
  learningPathState: null,
  onboardingStep: 1,
  sessionSectionCode: "",
  sessionSectionName: ""
};

const welcomeText = document.getElementById("welcomeText");
const logoutBtn = document.getElementById("logoutBtn");
const industrySelect = document.getElementById("industrySelect");
const examFamilySelect = document.getElementById("examFamilySelect");
const tradeSelect = document.getElementById("tradeSelect");
const examTypeSelect = document.getElementById("examTypeSelect");
const timedMode = document.getElementById("timedMode");
const bilingualToggleWrap = document.getElementById("bilingualToggleWrap");
const showChineseToggle = document.getElementById("showChineseToggle");
const startBtn = document.getElementById("startBtn");
const catalogEmptyState = document.getElementById("catalogEmptyState");

const quizSection = document.getElementById("quizSection");
const resultSection = document.getElementById("resultSection");
const quizTitle = document.getElementById("quizTitle");
const quizMeta = document.getElementById("quizMeta");
const questionText = document.getElementById("questionText");
const questionLayout = document.getElementById("questionLayout");
const questionAssistPane = document.getElementById("questionAssistPane");
const questionTextZh = document.getElementById("questionTextZh");
const optionsWrap = document.getElementById("options");
const optionsZhWrap = document.getElementById("optionsZh");
const learningSupport = document.getElementById("learningSupport");
const supportExplanationZh = document.getElementById("supportExplanationZh");
const supportKeyPointZh = document.getElementById("supportKeyPointZh");
const supportVocabZh = document.getElementById("supportVocabZh");
const supportMemoryTipZh = document.getElementById("supportMemoryTipZh");
const supportMemoryTrickWrap = document.getElementById("supportMemoryTrickWrap");
const supportMemoryTrick = document.getElementById("supportMemoryTrick");
const optionTemplate = document.getElementById("optionTemplate");
const timerWrap = document.getElementById("timerWrap");
const timerEl = document.getElementById("timer");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");

const scoreText = document.getElementById("scoreText");
const rightText = document.getElementById("rightText");
const wrongText = document.getElementById("wrongText");
const reviewBtn = document.getElementById("reviewBtn");
const reviewList = document.getElementById("reviewList");
const dashboardModuleSections = document.getElementById("dashboardModuleSections");
const dashboardExamSection = document.getElementById("dashboardExamSection");
const dashboardExamGrid = document.getElementById("dashboardExamGrid");
const dashboardModulesEmpty = document.getElementById("dashboardModulesEmpty");
const continueLearningTitle = document.getElementById("continueLearningTitle");
const continueLearningMeta = document.getElementById("continueLearningMeta");
const continueLearningBtn = document.getElementById("continueLearningBtn");
const recentAccuracy = document.getElementById("recentAccuracy");
const recentMode = document.getElementById("recentMode");
const recentAttempts = document.getElementById("recentAttempts");
const weakFocus = document.getElementById("weakFocus");
const learningPathSection = document.getElementById("learningPathSection");
const learningPathStageBadge = document.getElementById("learningPathStageBadge");
const learningPathTierHint = document.getElementById("learningPathTierHint");
const learningPathStageDesc = document.getElementById("learningPathStageDesc");
const learningPathNextSummary = document.getElementById("learningPathNextSummary");
const learningPathReason = document.getElementById("learningPathReason");
const learningPathContinueMeta = document.getElementById("learningPathContinueMeta");
const learningPathActionBtn = document.getElementById("learningPathActionBtn");
const learningPathHintPractice = document.getElementById("learningPathHintPractice");
const learningPathHintProgress = document.getElementById("learningPathHintProgress");
const modulePlaceholderSection = document.getElementById("modulePlaceholderSection");
const modulePlaceholderTitle = document.getElementById("modulePlaceholderTitle");
const modulePlaceholderDesc = document.getElementById("modulePlaceholderDesc");
const modulePlaceholderBody = document.getElementById("modulePlaceholderBody");
const accountCenterSection = document.getElementById("accountCenterSection");
const accountDisplayNameInput = document.getElementById("accountDisplayNameInput");
const accountNicknameInput = document.getElementById("accountNicknameInput");
const accountEmailInput = document.getElementById("accountEmailInput");
const accountPhoneInput = document.getElementById("accountPhoneInput");
const accountAssignedExamsInput = document.getElementById("accountAssignedExamsInput");
const saveAccountProfileBtn = document.getElementById("saveAccountProfileBtn");
const accountProfileMsg = document.getElementById("accountProfileMsg");
const accountChangePasswordBtn = document.getElementById("accountChangePasswordBtn");
const accountSecurityMsg = document.getElementById("accountSecurityMsg");
const accountCurrentPlanName = document.getElementById("accountCurrentPlanName");
const accountCurrentPlanTier = document.getElementById("accountCurrentPlanTier");
const accountCurrentPlanExpiry = document.getElementById("accountCurrentPlanExpiry");
const accountCurrentPlanDesc = document.getElementById("accountCurrentPlanDesc");
const accountCurrentBenefits = document.getElementById("accountCurrentBenefits");
const accountUpgradeGrid = document.getElementById("accountUpgradeGrid");
const accountUpgradeMsg = document.getElementById("accountUpgradeMsg");
const licensingProgressSnapshot = document.getElementById("licensingProgressSnapshot");
const applicationNumberInput = document.getElementById("applicationNumberInput");
const examDateInput = document.getElementById("examDateInput");
const studyStartedInput = document.getElementById("studyStartedInput");
const examScheduledInput = document.getElementById("examScheduledInput");
const examPassedInput = document.getElementById("examPassedInput");
const licensingNotesInput = document.getElementById("licensingNotesInput");
const saveLicensingProgressBtn = document.getElementById("saveLicensingProgressBtn");
const licensingProgressMsg = document.getElementById("licensingProgressMsg");
const practiceContextExam = document.getElementById("practiceContextExam");
const practiceContextMode = document.getElementById("practiceContextMode");
const summaryExamEls = Array.from(document.querySelectorAll('[data-summary="exam"]'));
const summaryProgressEls = Array.from(document.querySelectorAll('[data-summary="study-progress"]'));
const summarySubmittedEls = Array.from(document.querySelectorAll('[data-summary="application-submitted"]'));
const summaryScheduledEls = Array.from(document.querySelectorAll('[data-summary="exam-scheduled"]'));
const summaryContinueBtns = Array.from(document.querySelectorAll('[data-action="summary-continue"]'));
const memberSidebar = document.querySelector(".member-sidebar");
const memberDynamicNavSection = document.getElementById("memberDynamicNavSection");
const memberDynamicNav = document.getElementById("memberDynamicNav");
const memberViewDashboard = document.getElementById("memberViewDashboard");
const memberViewPractice = document.getElementById("memberViewPractice");
const memberViewProgress = document.getElementById("memberViewProgress");
const memberViewPlaceholder = document.getElementById("memberViewPlaceholder");
const onboardingModal = document.getElementById("onboardingModal");
const onboardingStepLabel = document.getElementById("onboardingStepLabel");
const onboardingCloseBtn = document.getElementById("onboardingCloseBtn");
const onboardingPrevBtn = document.getElementById("onboardingPrevBtn");
const onboardingNextBtn = document.getElementById("onboardingNextBtn");
const onboardingSaveLaterBtn = document.getElementById("onboardingSaveLaterBtn");
const onboardingSaveBtn = document.getElementById("onboardingSaveBtn");
const onboardingApplicationNumber = document.getElementById("onboardingApplicationNumber");
const onboardingExamDate = document.getElementById("onboardingExamDate");
const onboardingReview = document.getElementById("onboardingReview");
const onboardingSteps = Array.from(document.querySelectorAll(".onboarding-step"));
const onboardingOpenBtn = document.getElementById("onboardingOpenBtn");
const sidebarProgressAlert = document.getElementById("sidebarProgressAlert");

const CATALOG_EMPTY_PRIMARY = "训练内容正在整理中，请稍后再试";
const CATALOG_EMPTY_SECONDARY = "当前训练模块即将上线，可先查看会员方案或稍后开始训练";
const CORE_DASHBOARD_TYPES = new Set(["exam_card", "practice_center", "mock_exam_entry", "progress_tracker"]);
const ONBOARDING_DEFER_HOURS = 24;
const CONTINUE_STATE_VERSION = 1;
const DEFAULT_CONTINUE_EXAM_CODES = ["LAW_BUSINESS", "B_GENERAL", "CA_GENERAL_B"];
const ACCOUNT_PROFILE_STORAGE_VERSION = 1;
const LEARNING_STAGE_META = Object.freeze({
  prepare: {
    label: "准备阶段",
    description: "先完成关键进度信息并启动第一轮分项练习，建立稳定学习节奏。"
  },
  section_learning: {
    label: "分项学习阶段",
    description: "你正在夯实基础，建议按分项逐块训练，先保证覆盖率。"
  },
  reinforce: {
    label: "强化与查漏阶段",
    description: "你已进入提分阶段，优先处理弱项并修复易错知识点。"
  },
  mock_exam: {
    label: "模拟考试阶段",
    description: "基础已具备，建议按真实节奏完成整套模拟，提升考试稳定性。"
  },
  sprint: {
    label: "考前冲刺阶段",
    description: "距离考试较近，建议集中做高频错题与模考冲刺。"
  }
});
const MEMBERSHIP_PLAN_META = Object.freeze({
  trial: {
    planName: "Trial / 试学",
    tierLabel: "TRIAL",
    description: "可体验基础训练流程，适合先熟悉系统后再升级完整训练。",
    benefits: ["试学题库", "学习进度记录", "账号设置与进度管理"]
  },
  basic_399: {
    planName: "Basic",
    tierLabel: "BASIC",
    description: "适合先系统刷题与熟悉考试风格的考生。",
    benefits: ["基础题库", "分项练习", "模拟考试"]
  },
  pro_599: {
    planName: "Pro",
    tierLabel: "PRO",
    description: "适合希望更快理解题意并提升通过率的考生。",
    benefits: ["包含 Basic 全部", "题目解析", "双语辅助", "更完整学习支持"]
  },
  ai_999: {
    planName: "AI",
    tierLabel: "AI",
    description: "适合希望强化弱项并获得更高效训练建议的考生。",
    benefits: ["包含 Pro 全部", "Continue Learning 智能推荐", "AI 学习建议（预留）", "弱项强化推荐（预留）"]
  }
});

init();

async function init() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = "/";
    return;
  }

  state.authToken = token;

  try {
    const me = await apiFetch("/api/auth/me", { token });
    if (me.role !== "user") {
      window.location.href = "/";
      return;
    }
    if (me.user.plan === "paid") {
      window.location.href = "/member.html";
      return;
    }

    state.user = me.user;
    refreshWelcomeText();
    state.showChinese = false;
    applyBilingualAccessUI();
    renderLicensingProgressSnapshot();

    state.bank = await apiFetch("/api/question-bank", { token });
    await loadDashboardModules();

    renderIndustryOptions();
    bindEvents();
    startMembershipSync();
    await renderProgress();
    await loadAccountProfile({ silent: true });
    renderAccountSettingsCenter();
    maybeOpenOnboardingWizard();
    if (!hasRunnableTrialContent()) {
      showCatalogEmptyState();
    } else {
      hideCatalogEmptyState();
    }
    setTrialPracticeMode("category");
    setMemberView("dashboard", { scroll: false });
    syncMemberSideNavActive();
  } catch {
    clearAuthToken();
    window.location.href = "/";
  }
}

function bindEvents() {
  logoutBtn.addEventListener("click", () => {
    void onLogout();
  });

  industrySelect.addEventListener("change", () => {
    state.currentIndustryId = industrySelect.value;
    renderExamFamilyOptions();
    updatePracticeContext();
  });

  examFamilySelect.addEventListener("change", () => {
    state.currentExamFamilyKey = examFamilySelect.value;
    renderTradeOptions();
    updatePracticeContext();
  });

  tradeSelect.addEventListener("change", () => {
    state.currentTradeCode = tradeSelect.value;
    renderExamTypeOptions();
    updatePracticeContext();
  });

  examTypeSelect.addEventListener("change", () => {
    state.currentExamType = examTypeSelect.value;
    syncCurrentExamFromFilters();
    updatePracticeContext();
  });

  timedMode.addEventListener("change", () => {
    state.timerEnabled = timedMode.checked;
  });
  showChineseToggle?.addEventListener("change", () => {
    state.showChinese = showChineseToggle.checked;
    if (!quizSection.classList.contains("hidden")) {
      renderQuestion();
    }
    if (!resultSection.classList.contains("hidden")) {
      renderReview(state.lastWrongItems);
    }
  });

  startBtn.addEventListener("click", startQuiz);
  prevBtn.addEventListener("click", () => moveQuestion(-1));
  nextBtn.addEventListener("click", () => moveQuestion(1));
  submitBtn.addEventListener("click", () => {
    void submitQuiz();
  });
  reviewBtn.addEventListener("click", () => reviewList.classList.toggle("hidden"));
  dashboardModuleSections?.addEventListener("click", (event) => {
    void onDashboardModuleClick(event);
  });
  saveLicensingProgressBtn?.addEventListener("click", () => {
    void onSaveLicensingProgress();
  });
  saveAccountProfileBtn?.addEventListener("click", () => {
    void onSaveAccountProfile();
  });
  accountChangePasswordBtn?.addEventListener("click", onAccountPasswordPlaceholder);
  accountUpgradeGrid?.addEventListener("click", onAccountUpgradeClick);
  memberSidebar?.addEventListener("click", onMemberSideNavClick);
  continueLearningBtn?.addEventListener("click", onContinueLearningClick);
  learningPathActionBtn?.addEventListener("click", onLearningPathActionClick);
  for (const button of summaryContinueBtns) {
    button.addEventListener("click", onContinueLearningClick);
  }
  onboardingOpenBtn?.addEventListener("click", onSidebarNextStepClick);
  onboardingCloseBtn?.addEventListener("click", () => closeOnboardingWizard("later"));
  onboardingPrevBtn?.addEventListener("click", onOnboardingPrev);
  onboardingNextBtn?.addEventListener("click", onOnboardingNext);
  onboardingSaveLaterBtn?.addEventListener("click", () => {
    void onOnboardingSaveLater();
  });
  onboardingSaveBtn?.addEventListener("click", () => {
    void onOnboardingSaveComplete();
  });
}

async function onLogout() {
  stopMembershipSync();
  clearInterval(state.timerId);
  try {
    await apiFetch("/api/auth/logout", { method: "POST", token: state.authToken, body: {} });
  } catch {}
  clearAuthToken();
  window.location.href = "/";
}

function resolveTradeCode(exam) {
  return String(exam?.specializationCode || exam?.tradeCode || "").trim();
}

function isSharedTradeCode(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return !normalized || normalized === "none" || normalized === "shared" || normalized === "law_business";
}

function resolveExamType(exam) {
  return String(exam?.examType || "").trim() === "law_business" ? "law_business" : "trade";
}

function examTypeLabel(examType) {
  return examType === "law_business" ? "Law & Business" : "Trade";
}

function renderIndustryOptions() {
  industrySelect.innerHTML = "";
  const industries = (state.bank?.industries || []).filter((item) => Array.isArray(item.exams) && item.exams.length);
  for (const item of industries) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    industrySelect.appendChild(option);
  }
  if (!industrySelect.options.length) {
    setSelectPlaceholder(industrySelect, "暂无可用题库");
    setSelectPlaceholder(examFamilySelect, "暂无可用 license type");
    setSelectPlaceholder(tradeSelect, "暂无可用 specialization");
    setSelectPlaceholder(examTypeSelect, "暂无可用 exam type");
    startBtn.disabled = true;
    state.currentIndustryId = null;
    state.currentExamFamilyKey = null;
    state.currentTradeCode = null;
    state.currentExamType = null;
    state.currentExamId = null;
    showCatalogEmptyState();
    updatePracticeContext();
    return;
  }
  hideCatalogEmptyState();
  industrySelect.disabled = false;
  startBtn.disabled = false;
  state.currentIndustryId = industrySelect.value;
  renderExamFamilyOptions();
  updatePracticeContext();
}

function renderExamFamilyOptions() {
  const industry = getCurrentIndustry();
  examFamilySelect.innerHTML = "";
  if (!industry || !industry.exams.length) {
    setSelectPlaceholder(examFamilySelect, "暂无可用 license type");
    state.currentExamFamilyKey = null;
    renderTradeOptions();
    return;
  }

  const families = [];
  const seen = new Set();
  for (const exam of industry.exams) {
    const familyKey = String(exam.examFamilyKey || "general").trim() || "general";
    if (seen.has(familyKey)) continue;
    seen.add(familyKey);
    families.push({
      key: familyKey,
      name: String(exam.examFamilyName || familyKey).trim() || familyKey
    });
  }
  families.sort((a, b) => `${a.name}-${a.key}`.localeCompare(`${b.name}-${b.key}`, "en"));

  for (const family of families) {
    const option = document.createElement("option");
    option.value = family.key;
    option.textContent = `${family.name} (${family.key})`;
    examFamilySelect.appendChild(option);
  }
  examFamilySelect.disabled = false;
  state.currentExamFamilyKey = examFamilySelect.value || families[0].key;
  renderTradeOptions();
}

function getFamilyFilteredExams(industry) {
  if (!industry || !Array.isArray(industry.exams)) return [];
  const familyKey = String(state.currentExamFamilyKey || "").trim();
  if (!familyKey) return industry.exams.slice();
  return industry.exams.filter((exam) => String(exam.examFamilyKey || "general").trim() === familyKey);
}

function getExamsForCurrentSpecialization(industry) {
  const familyFiltered = getFamilyFilteredExams(industry);
  const specializationCode = String(state.currentTradeCode || "").trim();
  if (!familyFiltered.length) return [];

  if (!specializationCode) {
    return familyFiltered.filter((exam) => {
      const examType = resolveExamType(exam);
      const tradeCode = resolveTradeCode(exam);
      if (examType === "law_business") return true;
      return isSharedTradeCode(tradeCode);
    });
  }

  return familyFiltered.filter((exam) => {
    const examType = resolveExamType(exam);
    const tradeCode = resolveTradeCode(exam);
    if (examType === "law_business" && isSharedTradeCode(tradeCode)) {
      return true;
    }
    return tradeCode === specializationCode;
  });
}

function renderTradeOptions() {
  const industry = getCurrentIndustry();
  const exams = getFamilyFilteredExams(industry);
  tradeSelect.innerHTML = "";
  if (!industry || !exams.length) {
    setSelectPlaceholder(tradeSelect, "暂无可用 specialization");
    state.currentTradeCode = null;
    renderExamTypeOptions();
    return;
  }
  const trades = [];
  const seen = new Set();
  for (const exam of exams) {
    const tradeCode = resolveTradeCode(exam);
    if (isSharedTradeCode(tradeCode) || seen.has(tradeCode)) continue;
    seen.add(tradeCode);
    trades.push(tradeCode);
  }
  trades.sort((a, b) => a.localeCompare(b, "en"));

  if (!trades.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "共享（无需 specialization）";
    tradeSelect.appendChild(option);
  } else {
    for (const tradeCode of trades) {
      const option = document.createElement("option");
      option.value = tradeCode;
      option.textContent = tradeCode;
      tradeSelect.appendChild(option);
    }
  }
  tradeSelect.disabled = false;
  state.currentTradeCode = tradeSelect.value || "";
  renderExamTypeOptions();
}

function renderExamTypeOptions() {
  const industry = getCurrentIndustry();
  const exams = getExamsForCurrentSpecialization(industry);
  examTypeSelect.innerHTML = "";
  if (!industry || !exams.length) {
    setSelectPlaceholder(examTypeSelect, "暂无可用 exam type");
    startBtn.disabled = true;
    state.currentExamType = null;
    state.currentExamId = null;
    return;
  }
  const examTypes = Array.from(new Set(exams.map((exam) => resolveExamType(exam)))).sort((a, b) => {
    const rank = (value) => (value === "law_business" ? 0 : 1);
    return rank(a) - rank(b) || a.localeCompare(b, "en");
  });
  for (const examType of examTypes) {
    const option = document.createElement("option");
    option.value = examType;
    option.textContent = examTypeLabel(examType);
    examTypeSelect.appendChild(option);
  }
  examTypeSelect.disabled = false;
  startBtn.disabled = false;
  state.currentExamType = examTypeSelect.value || examTypes[0];
  syncCurrentExamFromFilters();
}

function getFilteredExams(industry) {
  const tradeFiltered = getExamsForCurrentSpecialization(industry);
  const examType = String(state.currentExamType || "").trim();
  if (!examType) return tradeFiltered;
  if (examType === "law_business") {
    const lawExams = getFamilyFilteredExams(industry).filter((exam) => resolveExamType(exam) === "law_business");
    if (!lawExams.length) return [];
    const selectedTrade = String(state.currentTradeCode || "").trim();
    if (selectedTrade) {
      const exact = lawExams.find((exam) => resolveTradeCode(exam) === selectedTrade);
      if (exact) return [exact];
    }
    const shared = lawExams.find((exam) => isSharedTradeCode(resolveTradeCode(exam)));
    if (shared) return [shared];
    return [lawExams[0]];
  }
  return tradeFiltered.filter((exam) => resolveExamType(exam) === "trade");
}

function syncCurrentExamFromFilters() {
  const industry = getCurrentIndustry();
  const exams = getFilteredExams(industry);
  if (!industry || !exams.length) {
    state.currentExamId = null;
    updatePracticeContext();
    return;
  }
  if (state.currentExamId && exams.some((item) => item.id === state.currentExamId)) {
    updatePracticeContext();
    return;
  }
  state.currentExamId = exams[0].id;
  updatePracticeContext();
}

function setTrialPracticeMode(mode) {
  state.practiceModeContext = mode === "mock" ? "mock" : "category";
  updatePracticeContext();
  updateContinueLearningPanel();
}

function getPracticeModeLabel() {
  return state.practiceModeContext === "mock" ? "模拟考试" : "分项练习";
}

function getCurrentExamLabel() {
  const exam = getCurrentExam();
  if (!exam) return "未选择";
  const name = String(exam.name || exam.examName || exam.id || "").trim();
  return name || "未选择";
}

function updatePracticeContext() {
  if (practiceContextExam) {
    practiceContextExam.textContent = getCurrentExamLabel();
  }
  if (practiceContextMode) {
    practiceContextMode.textContent = getPracticeModeLabel();
  }
  updateSummaryStrip();
}

function setSummaryText(nodes, value) {
  const text = String(value || "").trim() || "--";
  for (const node of nodes) {
    node.textContent = text;
  }
}

function setSummaryState(nodes, stateName = "") {
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    if (stateName) {
      node.dataset.state = stateName;
    } else {
      delete node.dataset.state;
    }
  }
}

function getLicensingProgressSnapshotData() {
  return state.user?.licensingProgress && typeof state.user.licensingProgress === "object"
    ? state.user.licensingProgress
    : {};
}

function updateSummaryStrip() {
  const progress = getLicensingProgressSnapshotData();
  const applicationNumber = String(progress.applicationNumber || "").trim();
  const submitted = toProgressBool(progress.applicationSubmitted, false) || Boolean(applicationNumber);
  const scheduled = toProgressBool(progress.examScheduled, false) || Boolean(progress.examDate);
  const rawPercent = Number(progress.studyProgressPercent);
  const progressText = Number.isFinite(rawPercent) ? `${Math.max(0, Math.min(100, Math.round(rawPercent)))}%` : "--";

  setSummaryText(summaryExamEls, getCurrentExamLabel());
  setSummaryText(summaryProgressEls, progressText);
  setSummaryText(summarySubmittedEls, submitted ? "已提交" : "未提交");
  setSummaryText(summaryScheduledEls, scheduled ? "已预约" : "未预约");
  setSummaryState(summaryProgressEls, Number.isFinite(rawPercent) && rawPercent >= 60 ? "good" : "warn");
  setSummaryState(summarySubmittedEls, submitted ? "good" : "warn");
  setSummaryState(summaryScheduledEls, scheduled ? "good" : "warn");
  updateSidebarProgressAlert(progress);
  updateLearningPathPanels();
}

function getTotalPracticeAttempts() {
  const progressMap = resolveProgressMap();
  let total = 0;
  for (const item of Object.values(progressMap)) {
    total += Number(item?.attempts || 0);
  }
  return total;
}

function getStudyPercent(progress) {
  let rawPercent = Number(progress?.studyProgressPercent);
  if (!Number.isFinite(rawPercent)) {
    const recent = getRecentProgressCandidate();
    rawPercent = Number(recent?.item?.percent);
  }
  return Number.isFinite(rawPercent) ? Math.max(0, Math.min(100, Math.round(rawPercent))) : null;
}

function getSidebarGuidance(progress) {
  const applicationNumber = String(progress?.applicationNumber || "").trim();
  const submitted = toProgressBool(progress?.applicationSubmitted, false) || Boolean(applicationNumber);
  const scheduled = toProgressBool(progress?.examScheduled, false) || Boolean(progress?.examDate);
  const studyStarted = toProgressBool(progress?.studyStarted, false);
  const studyPercent = getStudyPercent(progress);
  const attemptsTotal = getTotalPracticeAttempts();
  const lowProgress = studyPercent === null ? attemptsTotal < 3 : studyPercent < 30;

  if (!submitted) {
    return {
      tone: "warn",
      message: "⚠️ 你还没有提交 CSLB 申请，建议尽早完成，否则无法安排考试。",
      nextLabel: "去完善进度",
      nextAction: "onboarding",
      preferredStep: 1
    };
  }
  if (submitted && !scheduled) {
    return {
      tone: "warn",
      message: "⚠️ 你已提交申请，但尚未预约考试，建议尽早预约，避免排期延迟。",
      nextLabel: "继续完善",
      nextAction: "onboarding",
      preferredStep: 4
    };
  }
  if (lowProgress && (!studyStarted || attemptsTotal < 3)) {
    return {
      tone: "warn",
      message: "⚠️ 当前学习进度较低，建议先开始分项练习，逐步完成各板块训练。",
      nextLabel: "开始分项练习",
      nextAction: "practice"
    };
  }
  if (scheduled && studyPercent !== null && studyPercent < 60) {
    return {
      tone: "warn",
      message: "⚠️ 你已预约考试，但学习进度仍偏低，建议尽快强化练习。",
      nextLabel: "继续学习",
      nextAction: "continue"
    };
  }
  return {
    tone: "good",
    message: "继续保持当前节奏，优先完成薄弱项训练。",
    nextLabel: "继续学习",
    nextAction: "continue"
  };
}

function onSidebarNextStepClick() {
  const action = String(onboardingOpenBtn?.dataset.nextAction || "onboarding").trim();
  const preferredStep = Number(onboardingOpenBtn?.dataset.preferredStep || 0);
  if (action === "practice") {
    setTrialPracticeMode("category");
    jumpToTrainingSection("practice");
    return;
  }
  if (action === "continue") {
    onContinueLearningClick();
    return;
  }
  openOnboardingWizard({
    force: true,
    preferredStep: preferredStep >= 1 ? preferredStep : undefined
  });
}

function startQuiz() {
  const exam = getCurrentExam();
  if (!exam) {
    showCatalogEmptyState();
    return;
  }
  const englishQuestions = getQuestionsForExamSelection(exam).filter(hasRenderableEnglishSource);
  if (!englishQuestions.length) {
    showCatalogEmptyState();
    return;
  }
  hideCatalogEmptyState();
  state.quizQuestions = shuffle([...englishQuestions]).slice(0, Math.min(10, englishQuestions.length));
  state.currentIndex = 0;
  state.answers = {};
  state.lastWrongItems = [];
  state.timerEnabled = timedMode.checked;
  state.sessionSectionCode = "TRIAL_10";
  state.sessionSectionName = "10题模拟";

  resultSection.classList.add("hidden");
  reviewList.classList.add("hidden");
  quizSection.classList.remove("hidden");
  persistContinueInProgress();
  renderQuestion();
}

function renderQuestion() {
  const q = state.quizQuestions[state.currentIndex];
  if (!q) return;
  const exam = getCurrentExam();
  if (!exam) return;
  const view = getQuestionView(q);

  quizTitle.textContent = `${exam.name} 10题模拟`;
  quizMeta.textContent = `第 ${state.currentIndex + 1} 题 / 共 ${state.quizQuestions.length} 题`;
  questionText.textContent = view.english.prompt || "--";
  optionsWrap.innerHTML = "";

  view.english.options.forEach((opt, idx) => {
    const node = optionTemplate.content.cloneNode(true);
    const input = node.querySelector("input");
    const span = node.querySelector("span");

    input.value = String(idx);
    input.checked = state.answers[q.id] === idx;
    input.addEventListener("change", () => {
      state.answers[q.id] = idx;
      void saveProgressEvent(q.id, idx);
    });
    span.textContent = opt || "--";
    optionsWrap.appendChild(node);
  });
  renderChineseAssistPanel(view);

  prevBtn.disabled = state.currentIndex === 0;
  nextBtn.disabled = state.currentIndex === state.quizQuestions.length - 1;
  resetTimer();
}

function moveQuestion(delta) {
  const next = state.currentIndex + delta;
  if (next < 0 || next >= state.quizQuestions.length) return;
  state.currentIndex = next;
  persistContinueInProgress();
  renderQuestion();
}

async function saveProgressEvent(questionId, selectedIndex) {
  persistContinueInProgress();
  try {
    await apiFetch("/api/progress/event", {
      method: "POST",
      token: state.authToken,
      body: {
        exam_id: state.currentExamId,
        question_id: questionId,
        selected_index: selectedIndex,
        mode: "trial"
      }
    });
  } catch {}
}

async function submitQuiz() {
  clearInterval(state.timerId);

  let correct = 0;
  const wrongItems = [];

  for (const q of state.quizQuestions) {
    const chosen = state.answers[q.id];
    if (chosen === q.answerIndex) correct += 1;
    else wrongItems.push(q);
  }

  const total = state.quizQuestions.length;
  const percent = total ? Math.round((correct / total) * 100) : 0;

  scoreText.textContent = `${percent}%`;
  rightText.textContent = `${correct} / ${total}`;
  wrongText.textContent = String(wrongItems.length);

  await apiFetch("/api/progress/submit", {
    method: "POST",
    token: state.authToken,
    body: {
      exam_id: state.currentExamId,
      percent,
      mode: "trial",
      wrong_question_ids: wrongItems.map((q) => q.id)
    }
  });

  quizSection.classList.add("hidden");
  resultSection.classList.remove("hidden");
  state.lastWrongItems = wrongItems;
  persistContinueAfterSubmit(percent);
  renderReview(wrongItems);
}

function renderReview(wrongItems) {
  reviewList.innerHTML = "";
  if (!wrongItems.length) {
    const empty = document.createElement("div");
    empty.className = "review-item";
    empty.innerHTML = "<h4>恭喜，全对。</h4><p>升级付费会员可解锁完整题库与错题本。</p>";
    reviewList.appendChild(empty);
    return;
  }

  wrongItems.forEach((q) => {
    const view = getQuestionView(q);
    const showAssist = view.showChineseAssist;
    const canSeeExplanation = hasExplanationAccess();
    const canSeeMemoryTips = hasMemoryTipsAccess();
    const correctEnglish = view.english.options[q.answerIndex] || "--";
    const correctChinese = view.chinese.options[q.answerIndex] || "";
    const englishExplanation = view.english.explanation || "--";
    const chineseExplanation = view.chinese.explanation || "";
    const englishKeyPoint = view.english.keyPoint || "";
    const chineseKeyPoint = view.chinese.keyPoint || "";
    const englishReasoning = view.english.answerReasoning || "";
    const memoryTrick = view.english.memoryTrick || "";
    const chineseReasoning = view.chinese.answerReasoning || "";
    const chineseVocab = view.chinese.vocab || "";
    const chineseMemoryTip = view.chinese.memoryTip || "";
    const div = document.createElement("div");
    div.className = "review-item";
    div.innerHTML = `
      <h4>
        ${escapeHtml(view.english.prompt || "--")}
        ${
          showAssist && view.chinese.prompt
            ? `<br /><small style="color:#5f6d82;font-size:14px;">${escapeHtml(view.chinese.prompt)}</small>`
            : ""
        }
      </h4>
      <p><strong>Correct Answer：</strong>${escapeHtml(correctEnglish)}</p>
      ${showAssist && correctChinese ? `<p><strong>中文答案辅助：</strong>${escapeHtml(correctChinese)}</p>` : ""}
      ${canSeeMemoryTips && englishKeyPoint ? `<p><strong>Exam Point：</strong>${escapeHtml(englishKeyPoint)}</p>` : ""}
      ${
        canSeeMemoryTips && showAssist && chineseKeyPoint
          ? `<p><strong>考点分析：</strong>${escapeHtml(chineseKeyPoint)}</p>`
          : ""
      }
      ${canSeeExplanation ? `<p><strong>English Explanation：</strong>${escapeHtml(englishExplanation)}</p>` : ""}
      ${
        canSeeExplanation && showAssist && chineseExplanation
          ? `<p><strong>中文解析：</strong>${escapeHtml(chineseExplanation)}</p>`
          : ""
      }
      ${
        canSeeMemoryTips && englishReasoning
          ? `<p><strong>Answer Reasoning：</strong>${escapeHtml(englishReasoning)}</p>`
          : ""
      }
      ${canSeeMemoryTips && memoryTrick ? `<p><strong>Memory Trick：</strong>${escapeHtml(memoryTrick)}</p>` : ""}
      ${
        canSeeMemoryTips && showAssist && chineseReasoning
          ? `<p><strong>答题理由：</strong>${escapeHtml(chineseReasoning)}</p>`
          : ""
      }
      ${
        canSeeMemoryTips && showAssist && chineseVocab
          ? `<p><strong>重点单词：</strong>${escapeHtml(chineseVocab)}</p>`
          : ""
      }
      ${
        canSeeMemoryTips && showAssist && chineseMemoryTip
          ? `<p><strong>记忆方法：</strong>${escapeHtml(chineseMemoryTip)}</p>`
          : ""
      }
    `;
    reviewList.appendChild(div);
  });

  const upsell = document.createElement("div");
  upsell.className = "review-item";
  upsell.innerHTML = "<h4>升级提醒</h4><p>升级为付费会员后可进入完整刷题中心与错题专项训练。</p>";
  reviewList.appendChild(upsell);
}

function getModuleTitle(module) {
  return String(module?.titleZh || module?.title || "").trim() || String(module?.moduleCode || "Module");
}

function getModuleTypeLabel(moduleType) {
  const key = String(moduleType || "").trim();
  const map = {
    exam_card: "考试入口",
    practice_center: "分项练习",
    mock_exam_entry: "模拟考试",
    progress_tracker: "进度追踪",
    course_video: "视频课程",
    course_audio: "音频课程",
    live_stream: "直播课程",
    resources: "学习资源",
    account_settings: "账号设置",
    custom_link: "自定义链接"
  };
  return map[key] || "训练模块";
}

function normalizeExamCodeToken(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

function normalizeExamCodeList(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeExamCodeToken).filter(Boolean);
  }
  const raw = String(value || "").trim();
  if (!raw) return [];
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(normalizeExamCodeToken).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return raw
    .split(",")
    .map((item) => normalizeExamCodeToken(item))
    .filter(Boolean);
}

function normalizeMembershipTierValue(value, fallback = "free") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) return fallback;
  return normalized;
}

function getCurrentMembershipTier() {
  return normalizeMembershipTierValue(
    state.user?.membershipTier ?? state.user?.membership_tier ?? state.user?.plan,
    "free"
  );
}

function getCurrentAssignedExamCodes() {
  return new Set(
    normalizeExamCodeList(state.user?.assignedExamCodes ?? state.user?.assigned_exam_codes)
  );
}

function parseModuleSettingsObject(module) {
  const value = module?.settings ?? module?.settingsJson ?? module?.settings_json;
  if (!value) return {};
  if (typeof value === "object") return value;
  const raw = String(value).trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function extractModuleVisibleExamCodes(module) {
  return new Set(
    normalizeExamCodeList(module?.visibleForExamCodes ?? module?.visible_for_exam_codes)
  );
}

function extractModuleVisibleMembershipTiers(module) {
  return new Set(
    normalizeExamCodeList(module?.visibleForMembershipTiers ?? module?.visible_for_membership_tiers).map((item) =>
      normalizeMembershipTierValue(item)
    )
  );
}

function hasPaidTierToken(tierSet) {
  for (const tier of tierSet) {
    if (tier === "paid" || ["basic_399", "pro_599", "ai_999"].includes(tier)) {
      return true;
    }
  }
  return false;
}

function isMembershipTierAllowed(currentTier, allowedTiers) {
  if (!allowedTiers.size) return true;
  const tier = normalizeMembershipTierValue(currentTier, "free");
  if (allowedTiers.has(tier)) return true;
  if (tier === "paid") return hasPaidTierToken(allowedTiers);
  if (["basic_399", "pro_599", "ai_999"].includes(tier) && allowedTiers.has("paid")) return true;
  return false;
}

function deriveAssignmentTagsFromExamCode(source) {
  const code = normalizeExamCodeToken(source);
  const tags = new Set();
  if (!code) return tags;
  tags.add(code);

  if (code.includes("LAW") || code.includes("BUSINESS")) tags.add("LAW_BUSINESS");
  if (code.includes("B_GENERAL") || code === "CA_GENERAL_B" || code.startsWith("CA_GENERAL_B_")) {
    tags.add("B_GENERAL");
  }
  if (code.includes("C_SPECIALTY") || /^C\d{1,3}(_|$)/.test(code)) {
    tags.add("C_LICENSE");
  }
  return tags;
}

function mergeTagsInto(targetSet, codeList) {
  for (const code of codeList) {
    for (const tag of deriveAssignmentTagsFromExamCode(code)) {
      targetSet.add(tag);
    }
  }
}

function deriveModuleExamTagSet(module) {
  const tags = new Set();
  const visibleCodes = normalizeExamCodeList(module?.visibleForExamCodes ?? module?.visible_for_exam_codes);
  mergeTagsInto(tags, visibleCodes);

  const linkedExamCode = normalizeExamCodeToken(module?.linkedExamCode ?? module?.linked_exam_code);
  if (linkedExamCode) mergeTagsInto(tags, [linkedExamCode]);

  const routeType = String(module?.routeType ?? module?.route_type ?? "")
    .trim()
    .toLowerCase();
  const routeTargetRaw = String(module?.routeTarget ?? module?.route_target ?? "").trim();
  const routeTargetCode = normalizeExamCodeToken(routeTargetRaw);
  if (
    routeTargetCode &&
    ["exam_home", "category_practice", "mock_exam"].includes(routeType) &&
    /^[A-Z0-9_]+$/.test(routeTargetCode)
  ) {
    mergeTagsInto(tags, [routeTargetCode]);
  }

  const settings = parseModuleSettingsObject(module);
  const fromSettings = normalizeExamCodeList(
    settings.visibleForExamCodes ??
      settings.visible_for_exam_codes ??
      settings.examCodes ??
      settings.exam_codes ??
      settings.tags
  );
  mergeTagsInto(tags, fromSettings);
  return tags;
}

function hasTagIntersection(userTags, moduleTags) {
  if (!userTags.size || !moduleTags.size) return false;
  for (const tag of moduleTags) {
    if (userTags.has(tag)) return true;
  }
  return false;
}

function isModuleVisibleForCurrentUser(module) {
  if (!module || module.isActive === false || module.is_active === false) return false;
  const userExamCodes = getCurrentAssignedExamCodes();
  const visibleExamCodes = extractModuleVisibleExamCodes(module);
  const visibleMembershipTiers = extractModuleVisibleMembershipTiers(module);
  const currentTier = getCurrentMembershipTier();

  if (!isMembershipTierAllowed(currentTier, visibleMembershipTiers)) return false;

  if (visibleExamCodes.size) {
    if (!userExamCodes.size) return false;
    if (!hasTagIntersection(userExamCodes, visibleExamCodes)) return false;
  }

  const moduleType = String(module.moduleType || module.module_type || "")
    .trim()
    .toLowerCase();
  const moduleTags = deriveModuleExamTagSet(module);

  if (moduleType === "exam_card") {
    if (!userExamCodes.size) return false;
    if (!moduleTags.size) return false;
    return hasTagIntersection(userExamCodes, moduleTags);
  }

  if (userExamCodes.size && moduleTags.size && !hasTagIntersection(userExamCodes, moduleTags)) {
    return false;
  }

  return true;
}

function filterDashboardModulesForCurrentUser(items) {
  return (Array.isArray(items) ? items : []).filter((module) => isModuleVisibleForCurrentUser(module));
}

function renderDashboardModulesEmpty(message) {
  if (!dashboardModulesEmpty) return;
  dashboardModulesEmpty.innerHTML = `<strong>${escapeHtml(message)}</strong><span>${escapeHtml(
    CATALOG_EMPTY_SECONDARY
  )}</span>`;
  dashboardModulesEmpty.classList.remove("hidden");
}

function hideDashboardModulesEmpty() {
  dashboardModulesEmpty?.classList.add("hidden");
}

function setDashboardSectionVisible(sectionEl, visible) {
  if (!sectionEl) return;
  const isVisible = visible === true;
  sectionEl.classList.toggle("hidden", !isVisible);
  sectionEl.setAttribute("aria-hidden", isVisible ? "false" : "true");
}

function clearDashboardModuleSections() {
  dashboardExamGrid && (dashboardExamGrid.innerHTML = "");
  setDashboardSectionVisible(dashboardExamSection, false);
}

function buildDashboardModuleCard(module) {
  const card = document.createElement("article");
  card.className = "dashboard-module-card";
  card.dataset.moduleCode = String(module.moduleCode || "");
  const examName = getModuleTitle(module);
  const badge = String(module.badgeText || "").trim();
  card.innerHTML = `
    <div class="dashboard-module-meta">
      <span class="dashboard-module-type">考试入口</span>
      ${badge ? `<span class="dashboard-module-badge">${escapeHtml(badge)}</span>` : ""}
    </div>
    <h3>${escapeHtml(examName)}</h3>
    <button class="btn primary" data-action="open-module" data-module-code="${escapeHtml(module.moduleCode || "")}">
      进入训练
    </button>
  `;
  return card;
}

function getDashboardExamModules() {
  const items = Array.isArray(state.dashboardModules) ? state.dashboardModules : [];
  return items.filter((module) => {
    const type = String(module?.moduleType || "").trim().toLowerCase();
    return type === "exam_card";
  });
}

function getAllExamsFlat() {
  const industries = Array.isArray(state.bank?.industries) ? state.bank.industries : [];
  const out = [];
  for (const industry of industries) {
    for (const exam of industry?.exams || []) {
      out.push(exam);
    }
  }
  return out;
}

function findExamByIdOrCode(identifier) {
  const target = String(identifier || "").trim();
  if (!target) return null;
  return (
    getAllExamsFlat().find(
      (exam) =>
        String(exam?.id || "").trim() === target ||
        normalizeExamCodeValue(exam?.examCode || "") === normalizeExamCodeValue(target)
    ) || null
  );
}

function resolveProgressMap() {
  return state.progressSummary && typeof state.progressSummary === "object" ? state.progressSummary : {};
}

function getContinueStorageKey() {
  const userId = String(state.user?.id || state.user?.email || "unknown").trim();
  return `jnono-continue-learning-v${CONTINUE_STATE_VERSION}:${userId}`;
}

function readContinueState() {
  const fallback = {
    version: CONTINUE_STATE_VERSION,
    inProgress: null,
    recent: null,
    sectionStats: {}
  };
  try {
    const raw = localStorage.getItem(getContinueStorageKey());
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      version: CONTINUE_STATE_VERSION,
      inProgress: parsed.inProgress && typeof parsed.inProgress === "object" ? parsed.inProgress : null,
      recent: parsed.recent && typeof parsed.recent === "object" ? parsed.recent : null,
      sectionStats: parsed.sectionStats && typeof parsed.sectionStats === "object" ? parsed.sectionStats : {}
    };
  } catch {
    return fallback;
  }
}

function writeContinueState(data) {
  try {
    localStorage.setItem(getContinueStorageKey(), JSON.stringify(data || {}));
  } catch {}
}

function resolveExamCode(exam) {
  return String(exam?.examCode || exam?.id || "").trim();
}

function getRecentProgressCandidate() {
  const progressMap = resolveProgressMap();
  let best = null;
  for (const [examId, item] of Object.entries(progressMap)) {
    if (!item || typeof item !== "object") continue;
    const attempts = Number(item.attempts || 0);
    const percent = Number(item.percent || 0);
    if (!best || attempts > best.attempts || (attempts === best.attempts && percent > best.percent)) {
      best = { examId, attempts, percent, item };
    }
  }
  return best;
}

function buildContinueRecommendationFromInProgress(store) {
  const pending = store.inProgress;
  if (!pending || typeof pending !== "object") return null;
  const examCode = String(pending.examCode || "").trim();
  if (!examCode) return null;
  const totalQuestion = Number(pending.totalQuestion || 0);
  const currentQuestion = Number(pending.currentQuestion || 0);
  if (!Number.isFinite(totalQuestion) || totalQuestion <= 0) return null;
  if (!Number.isFinite(currentQuestion) || currentQuestion <= 0) return null;
  return {
    kind: "in_progress",
    examCode,
    examName: String(pending.examName || examCode),
    mode: String(pending.mode || "category").toLowerCase().includes("mock") ? "mock" : "category",
    sectionCode: String(pending.sectionCode || "").trim().toUpperCase(),
    sectionName: String(pending.sectionName || "分项练习"),
    currentQuestion: Math.min(totalQuestion, Math.max(1, Math.round(currentQuestion))),
    totalQuestion: Math.max(1, Math.round(totalQuestion)),
    questionIds: Array.isArray(pending.questionIds) ? pending.questionIds.map((v) => String(v || "").trim()).filter(Boolean) : [],
    answers: pending.answers && typeof pending.answers === "object" ? pending.answers : {},
    currentIndex: Number.isFinite(Number(pending.currentIndex)) ? Number(pending.currentIndex) : 0,
    title: "继续上次练习",
    actionLabel: "继续学习",
    subtitle: `${String(pending.examName || examCode)} · ${String(pending.sectionName || "分项练习")}`,
    detail: `进度：第 ${Math.min(totalQuestion, Math.max(1, Math.round(currentQuestion)))} / ${Math.max(1, Math.round(totalQuestion))} 题`
  };
}

function buildContinueRecommendationFromRecent(store) {
  const recent = store.recent;
  if (recent && typeof recent === "object") {
    const examCode = String(recent.examCode || "").trim();
    if (examCode) {
      const accuracy = Number(recent.accuracy);
      const accuracyText = Number.isFinite(accuracy) ? `${Math.max(0, Math.min(100, Math.round(accuracy)))}%` : "--";
      return {
        kind: "recent",
        examCode,
        examName: String(recent.examName || examCode),
        mode: String(recent.mode || "category").toLowerCase().includes("mock") ? "mock" : "category",
        sectionCode: String(recent.sectionCode || "").trim().toUpperCase(),
        sectionName: String(recent.sectionName || "最近练习"),
        accuracy: Number.isFinite(accuracy) ? Math.max(0, Math.min(100, Math.round(accuracy))) : null,
        title: "继续最近学习",
        actionLabel: "继续学习",
        subtitle: `${String(recent.examName || examCode)} · ${String(recent.sectionName || "最近练习")}`,
        detail: `上次正确率：${accuracyText}`
      };
    }
  }

  const candidate = getRecentProgressCandidate();
  if (!candidate) return null;
  const exam = findExamByIdOrCode(candidate.examId);
  return {
    kind: "recent",
    examCode: exam?.examCode || exam?.id || candidate.examId,
    examName: exam?.name || candidate.examId,
    mode: String(candidate.item?.lastMode || "").trim().toLowerCase().includes("mock") ? "mock" : "category",
    sectionCode: "",
    sectionName: "最近练习",
    accuracy: Number.isFinite(candidate.percent) ? Math.max(0, Math.min(100, Math.round(candidate.percent))) : null,
    title: "继续最近学习",
    actionLabel: "继续学习",
    subtitle: `${exam?.name || candidate.examId} · 最近练习`,
    detail: `上次正确率：${Number.isFinite(candidate.percent) ? `${Math.round(candidate.percent)}%` : "--"}`
  };
}

function buildContinueRecommendationFromWeakSection(store) {
  const sectionStats = store.sectionStats && typeof store.sectionStats === "object" ? store.sectionStats : {};
  let weakest = null;
  for (const item of Object.values(sectionStats)) {
    const row = item && typeof item === "object" ? item : null;
    if (!row) continue;
    const accuracy = Number(row.avgAccuracy);
    if (!Number.isFinite(accuracy) || accuracy >= 60) continue;
    if (!weakest || accuracy < weakest.accuracy) {
      weakest = {
        examCode: String(row.examCode || "").trim(),
        examName: String(row.examName || row.examCode || "").trim(),
        sectionCode: String(row.sectionCode || "").trim().toUpperCase(),
        sectionName: String(row.sectionName || row.sectionCode || "弱项分项").trim(),
        accuracy: Math.max(0, Math.min(100, Math.round(accuracy)))
      };
    }
  }
  if (!weakest || !weakest.examCode) return null;
  return {
    kind: "weak",
    examCode: weakest.examCode,
    examName: weakest.examName || weakest.examCode,
    mode: "category",
    sectionCode: weakest.sectionCode,
    sectionName: weakest.sectionName,
    accuracy: weakest.accuracy,
    title: "强化你的弱项",
    actionLabel: "开始强化",
    subtitle: weakest.sectionName,
    detail: `正确率：${weakest.accuracy}%`
  };
}

function buildDefaultContinueRecommendation() {
  const exams = getAllExamsFlat();
  if (!exams.length) return null;
  let targetExam =
    DEFAULT_CONTINUE_EXAM_CODES.map((code) => findExamByCode(code)?.exam).find(Boolean) || null;
  if (!targetExam) targetExam = exams[0];
  const examCode = resolveExamCode(targetExam);
  return {
    kind: "default",
    examCode,
    examName: String(targetExam.name || examCode),
    mode: "category",
    sectionCode: "BUSINESS_ORGANIZATION",
    sectionName: "Business Organization",
    title: "建议从这里开始",
    actionLabel: "开始学习",
    subtitle: `${String(targetExam.name || examCode)} · Business Organization`,
    detail: "系统将为你进入默认分项练习"
  };
}

function buildContinueRecommendation() {
  const store = readContinueState();
  return (
    buildContinueRecommendationFromInProgress(store) ||
    buildContinueRecommendationFromRecent(store) ||
    buildContinueRecommendationFromWeakSection(store) ||
    buildDefaultContinueRecommendation()
  );
}

function getDaysUntilExamDate(examDateText) {
  const raw = String(examDateText || "").trim();
  if (!raw) return null;
  const target = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function hasMockProgressActivity(store) {
  const safeStore = store && typeof store === "object" ? store : readContinueState();
  if (String(safeStore?.inProgress?.mode || "").toLowerCase().includes("mock")) return true;
  if (String(safeStore?.recent?.mode || "").toLowerCase().includes("mock")) return true;
  for (const item of Object.values(resolveProgressMap())) {
    if (String(item?.lastMode || "").toLowerCase().includes("mock")) return true;
  }
  return false;
}

function getTierPathHint(tier) {
  if (tier === "ai_999") {
    return "AI路径建议：系统会优先结合弱项与最近训练给出更具体下一步。";
  }
  if (tier === "pro_599") {
    return "Pro路径建议：可结合中文辅助先理解题意，再执行训练动作。";
  }
  return "基础路径建议：先按阶段完成核心动作，逐步建立稳定节奏。";
}

function buildLearningPathState() {
  const progress = getLicensingProgressSnapshotData();
  const rec = state.continueRecommendation || buildContinueRecommendation();
  const tier = getCurrentMembershipTier();
  const attemptsTotal = getTotalPracticeAttempts();
  const studyPercent = getStudyPercent(progress);
  const studyStarted = toProgressBool(progress?.studyStarted, false);
  const applicationNumber = String(progress?.applicationNumber || "").trim();
  const applicationSubmitted = toProgressBool(progress?.applicationSubmitted, false) || Boolean(applicationNumber);
  const examDate = String(progress?.examDate || "").trim();
  const examScheduled = toProgressBool(progress?.examScheduled, false) || Boolean(examDate);
  const daysUntilExam = getDaysUntilExamDate(examDate);
  const mockActive = hasMockProgressActivity();

  let stageKey = "prepare";
  if (examScheduled && daysUntilExam !== null && daysUntilExam <= 30) {
    stageKey = "sprint";
  } else if ((studyPercent !== null && studyPercent >= 70) || mockActive) {
    stageKey = "mock_exam";
  } else if (
    (studyPercent !== null && studyPercent >= 40) ||
    String(rec?.kind || "").trim() === "weak"
  ) {
    stageKey = "reinforce";
  } else if (studyStarted || attemptsTotal > 0 || (studyPercent !== null && studyPercent > 0)) {
    stageKey = "section_learning";
  }

  const primaryExamCode =
    String(rec?.examCode || "").trim() ||
    Array.from(getCurrentAssignedExamCodes())[0] ||
    "";

  let primaryAction = {
    type: "practice_category",
    label: "开始分项练习",
    mode: "category",
    examCode: primaryExamCode
  };
  let nextSummary = "下一步建议：先完成一组分项练习，建立连续训练记录。";
  let reason = "系统会根据你当前阶段优先安排最关键的一步。";

  if (!applicationSubmitted) {
    primaryAction = { type: "onboarding", label: "去完善进度", preferredStep: 1 };
    nextSummary = "下一步建议：先完善执照进度，便于系统给出更准确训练路径。";
    reason = "你尚未完成 CSLB 申请状态填写，先补齐可避免后续安排混乱。";
  } else if (stageKey === "sprint") {
    if (rec?.kind === "in_progress" && rec?.mode === "mock") {
      primaryAction = { type: "continue", label: "继续冲刺" };
      nextSummary = "下一步建议：继续当前冲刺训练，保持考试节奏。";
      reason = "你已接近考试日期，优先保证完整模拟与错题回顾。";
    } else {
      primaryAction = {
        type: "practice_mock",
        label: "开始冲刺模考",
        mode: "mock",
        examCode: primaryExamCode
      };
      nextSummary = "下一步建议：进入模拟考试模式，按真实时长完成一轮。";
      reason = "考试临近，模考训练能最快提升稳定性与时间控制。";
    }
  } else if (stageKey === "mock_exam") {
    if (rec?.kind === "in_progress" && rec?.mode === "mock") {
      primaryAction = { type: "continue", label: "继续模拟考试" };
      nextSummary = "下一步建议：继续最近模考，完成整套节奏训练。";
      reason = "你已进入模拟阶段，建议优先完成整套而非频繁切换。";
    } else {
      primaryAction = {
        type: "practice_mock",
        label: "开始模拟考试",
        mode: "mock",
        examCode: primaryExamCode
      };
      nextSummary = "下一步建议：开始模拟考试，检验当前阶段学习成果。";
      reason = "当前基础已达到模考门槛，适合进入整套测试。";
    }
  } else if (stageKey === "reinforce") {
    if (rec?.kind === "weak") {
      primaryAction = {
        type: "practice_category",
        label: "强化弱项",
        mode: "category",
        examCode: primaryExamCode
      };
      nextSummary = `下一步建议：优先强化 ${rec.sectionName || "薄弱分项"}。`;
      reason = `最近该分项正确率偏低（${Number.isFinite(rec.accuracy) ? `${rec.accuracy}%` : "待提升"}），先补弱项更高效。`;
    } else {
      primaryAction = { type: "continue", label: "继续强化" };
      nextSummary = "下一步建议：继续最近训练，并优先处理错题。";
      reason = "你已进入查漏阶段，持续训练可快速提升通过率。";
    }
  } else if (stageKey === "section_learning") {
    if (rec?.kind === "in_progress" || rec?.kind === "recent") {
      primaryAction = { type: "continue", label: "继续分项训练" };
      nextSummary = "下一步建议：继续最近分项训练，先完成基础覆盖。";
      reason = "当前阶段重点是建立知识面，保持连续练习最重要。";
    } else {
      primaryAction = {
        type: "practice_category",
        label: "开始分项练习",
        mode: "category",
        examCode: primaryExamCode
      };
      nextSummary = "下一步建议：进入分项练习，逐块完成知识点训练。";
      reason = "你已开始学习，分项推进能更稳地累积正确率。";
    }
  } else if (rec?.kind === "in_progress") {
    primaryAction = { type: "continue", label: "继续学习" };
    nextSummary = "下一步建议：继续上次训练，避免中断学习链路。";
    reason = "你有未完成练习，先完成当前进度效率更高。";
  }

  const stageMeta = LEARNING_STAGE_META[stageKey] || LEARNING_STAGE_META.prepare;
  const continueLine = rec
    ? `${rec.title || "继续学习"}：${rec.subtitle || rec.examName || "--"}${rec.detail ? ` · ${rec.detail}` : ""}`
    : "继续学习：暂无可继续记录，将从默认训练入口开始。";

  return {
    stageKey,
    stageLabel: stageMeta.label,
    stageDescription: stageMeta.description,
    nextSummary,
    reason,
    continueLine,
    primaryAction,
    tierHint: getTierPathHint(tier),
    practiceHint: `你当前处于“${stageMeta.label}”，建议动作：${primaryAction.label}。`,
    progressHint: `当前阶段：${stageMeta.label}。下一步建议：${primaryAction.label}。`
  };
}

function executeLearningPathAction(action) {
  const next = action && typeof action === "object" ? action : null;
  if (!next) {
    onContinueLearningClick();
    return;
  }
  if (next.type === "onboarding") {
    openOnboardingWizard({
      force: true,
      preferredStep: Number(next.preferredStep || 0) || undefined
    });
    return;
  }
  if (next.type === "continue") {
    onContinueLearningClick();
    return;
  }
  if (next.type === "practice_mock" || next.type === "practice_category") {
    const mode = next.type === "practice_mock" ? "mock" : "category";
    setTrialPracticeMode(mode);
    const examCode =
      String(next.examCode || "").trim() ||
      String(state.continueRecommendation?.examCode || "").trim();
    if (examCode) {
      focusExamByCode(examCode);
    }
    jumpToTrainingSection(mode === "mock" ? "mock" : "practice");
    return;
  }
  onContinueLearningClick();
}

function onLearningPathActionClick() {
  executeLearningPathAction(state.learningPathState?.primaryAction);
}

function updateLearningPathPanels() {
  const pathState = buildLearningPathState();
  state.learningPathState = pathState;

  if (learningPathSection) {
    setDashboardSectionVisible(learningPathSection, true);
  }
  if (learningPathStageBadge) {
    learningPathStageBadge.textContent = `当前阶段：${pathState.stageLabel}`;
    learningPathStageBadge.dataset.stage = pathState.stageKey;
  }
  if (learningPathTierHint) {
    learningPathTierHint.textContent = pathState.tierHint;
  }
  if (learningPathStageDesc) {
    learningPathStageDesc.textContent = pathState.stageDescription;
  }
  if (learningPathNextSummary) {
    learningPathNextSummary.textContent = pathState.nextSummary;
  }
  if (learningPathReason) {
    learningPathReason.textContent = `建议原因：${pathState.reason}`;
  }
  if (learningPathContinueMeta) {
    learningPathContinueMeta.textContent = pathState.continueLine;
  }
  if (learningPathActionBtn) {
    learningPathActionBtn.textContent = pathState.primaryAction?.label || "继续学习";
  }
  if (learningPathHintPractice) {
    learningPathHintPractice.textContent = pathState.practiceHint;
    learningPathHintPractice.dataset.stage = pathState.stageKey;
  }
  if (learningPathHintProgress) {
    learningPathHintProgress.textContent = pathState.progressHint;
    learningPathHintProgress.dataset.stage = pathState.stageKey;
  }
}

function updateContinueLearningPanel() {
  const rec = buildContinueRecommendation();
  state.continueRecommendation = rec;
  if (!continueLearningTitle || !continueLearningMeta || !continueLearningBtn) return;
  if (!rec) {
    continueLearningTitle.textContent = "暂无可继续的训练内容。";
    continueLearningMeta.textContent = "请先在左侧进入分项练习或模拟考试。";
    continueLearningBtn.textContent = "开始训练";
    return;
  }
  continueLearningTitle.textContent = rec.title || "继续学习";
  continueLearningMeta.textContent = `${rec.subtitle || rec.examName || "--"}${rec.detail ? ` · ${rec.detail}` : ""}`;
  continueLearningBtn.textContent = rec.actionLabel || "继续学习";
  updateLearningPathPanels();
}

function persistContinueInProgress() {
  const exam = getCurrentExam();
  if (!exam || !Array.isArray(state.quizQuestions) || !state.quizQuestions.length) return;
  const questionIds = state.quizQuestions.map((q) => String(q?.id || "").trim()).filter(Boolean);
  if (!questionIds.length) return;
  const answers = {};
  for (const [qid, selected] of Object.entries(state.answers || {})) {
    if (!questionIds.includes(qid)) continue;
    if (!Number.isFinite(Number(selected))) continue;
    answers[qid] = Number(selected);
  }
  const payload = readContinueState();
  payload.inProgress = {
    examCode: resolveExamCode(exam),
    examName: String(exam.name || resolveExamCode(exam)),
    mode: state.practiceModeContext === "mock" ? "mock" : "category",
    sectionCode: String(state.sessionSectionCode || "").trim().toUpperCase(),
    sectionName: String(state.sessionSectionName || "分项练习"),
    questionIds,
    answers,
    currentIndex: Math.max(0, Math.min(state.quizQuestions.length - 1, Number(state.currentIndex || 0))),
    currentQuestion: Math.max(1, Math.min(state.quizQuestions.length, Number(state.currentIndex || 0) + 1)),
    totalQuestion: state.quizQuestions.length,
    updatedAt: Date.now()
  };
  writeContinueState(payload);
  updateContinueLearningPanel();
}

function persistContinueAfterSubmit(percent) {
  const exam = getCurrentExam();
  if (!exam) return;
  const payload = readContinueState();
  const mode = state.practiceModeContext === "mock" ? "mock" : "category";
  const sectionCode = String(state.sessionSectionCode || "").trim().toUpperCase();
  const sectionName = String(state.sessionSectionName || "分项练习");
  payload.inProgress = null;
  payload.recent = {
    examCode: resolveExamCode(exam),
    examName: String(exam.name || resolveExamCode(exam)),
    mode,
    sectionCode,
    sectionName,
    accuracy: Number(percent),
    updatedAt: Date.now()
  };
  if (mode === "category") {
    const key = `${payload.recent.examCode}::${sectionCode || "ALL"}`;
    const current = payload.sectionStats?.[key] && typeof payload.sectionStats[key] === "object" ? payload.sectionStats[key] : {
      examCode: payload.recent.examCode,
      examName: payload.recent.examName,
      sectionCode: sectionCode || "ALL",
      sectionName,
      attempts: 0,
      avgAccuracy: 0
    };
    const attempts = Number(current.attempts || 0) + 1;
    const avgAccuracy = Math.round(((Number(current.avgAccuracy || 0) * Number(current.attempts || 0)) + Number(percent || 0)) / attempts);
    payload.sectionStats = payload.sectionStats && typeof payload.sectionStats === "object" ? payload.sectionStats : {};
    payload.sectionStats[key] = {
      ...current,
      attempts,
      avgAccuracy,
      lastAccuracy: Number(percent || 0),
      updatedAt: Date.now()
    };
  }
  writeContinueState(payload);
  updateContinueLearningPanel();
}

function restoreContinueInProgress(rec) {
  if (!rec || rec.kind !== "in_progress") return false;
  const examCode = String(rec.examCode || "").trim();
  if (!examCode || !focusExamByCode(examCode)) return false;
  const exam = getCurrentExam();
  if (!exam) return false;
  const sourceQuestions = getQuestionsForExamSelection(exam).filter(hasRenderableEnglishSource);
  const byId = new Map(sourceQuestions.map((q) => [String(q?.id || "").trim(), q]));
  const recovered = (Array.isArray(rec.questionIds) ? rec.questionIds : [])
    .map((qid) => byId.get(String(qid || "").trim()))
    .filter(Boolean);
  if (!recovered.length) return false;
  state.quizQuestions = recovered;
  state.answers = {};
  if (rec.answers && typeof rec.answers === "object") {
    for (const [qid, idx] of Object.entries(rec.answers)) {
      if (!byId.has(String(qid || "").trim())) continue;
      if (!Number.isFinite(Number(idx))) continue;
      state.answers[String(qid)] = Number(idx);
    }
  }
  state.currentIndex = Math.max(0, Math.min(recovered.length - 1, Number(rec.currentIndex || 0)));
  setTrialPracticeMode(rec.mode === "mock" ? "mock" : "category");
  state.sessionSectionCode = String(rec.sectionCode || "").trim().toUpperCase();
  state.sessionSectionName = String(rec.sectionName || "分项练习");
  resultSection.classList.add("hidden");
  reviewList.classList.add("hidden");
  quizSection.classList.remove("hidden");
  hideCatalogEmptyState();
  renderQuestion();
  return true;
}

function updateRecentPerformancePanel() {
  const candidate = getRecentProgressCandidate();
  if (!recentAccuracy || !recentMode || !recentAttempts || !weakFocus) return;
  if (!candidate) {
    recentAccuracy.textContent = "--";
    recentMode.textContent = "--";
    recentAttempts.textContent = "0";
    weakFocus.textContent = "暂无数据";
    return;
  }
  const modeLabel = String(candidate.item?.lastMode || "").trim() || "--";
  recentAccuracy.textContent = Number.isFinite(candidate.percent) ? `${Math.round(candidate.percent)}%` : "--";
  recentMode.textContent = modeLabel;
  recentAttempts.textContent = String(candidate.attempts || 0);

  let weakest = null;
  for (const [examId, item] of Object.entries(resolveProgressMap())) {
    const percent = Number(item?.percent || 0);
    if (!weakest || percent < weakest.percent) {
      weakest = { examId, percent };
    }
  }
  if (weakest) {
    const exam = findExamByIdOrCode(weakest.examId);
    weakFocus.textContent = exam?.name || weakest.examId;
  } else {
    weakFocus.textContent = "--";
  }
}

function renderDashboardModules() {
  if (!dashboardModuleSections) return;
  clearDashboardModuleSections();
  renderDynamicSideNavModules();
  const examModules = getDashboardExamModules();
  if (dashboardExamGrid) {
    for (const module of examModules) {
      dashboardExamGrid.appendChild(buildDashboardModuleCard(module));
    }
  }
  setDashboardSectionVisible(dashboardExamSection, examModules.length > 0);
  if (!examModules.length) {
    renderDashboardModulesEmpty("当前暂无可用考试入口");
  } else {
    hideDashboardModulesEmpty();
  }
  updateContinueLearningPanel();
  updateRecentPerformancePanel();
}

async function loadDashboardModules() {
  try {
    const payload = await apiFetch("/api/dashboard/modules", { token: state.authToken });
    state.dashboardModules = filterDashboardModulesForCurrentUser(payload?.items);
    state.courseContents = Array.isArray(payload?.courseContents) ? payload.courseContents : [];
    renderDashboardModules();
  } catch (err) {
    state.dashboardModules = [];
    state.courseContents = [];
    renderDashboardModules();
    renderDashboardModulesEmpty(`模块加载失败：${err.message}`);
  }
}

function normalizePlanTierForAccount(rawTier, rawPlan) {
  const tier = normalizeMembershipTierValue(rawTier, "");
  if (tier === "basic_399" || tier === "pro_599" || tier === "ai_999") return tier;
  if (tier === "paid") return "basic_399";
  if (tier === "free") return "trial";
  const plan = normalizeMembershipTierValue(rawPlan, "free");
  return plan === "paid" ? "basic_399" : "trial";
}

function getCurrentPlanMeta() {
  const tierKey = normalizePlanTierForAccount(
    state.user?.membershipTier ?? state.user?.membership_tier,
    state.user?.plan
  );
  return { tierKey, meta: MEMBERSHIP_PLAN_META[tierKey] || MEMBERSHIP_PLAN_META.trial };
}

function getAccountProfileStorageKey() {
  const userId = String(state.user?.id || state.user?.email || "unknown").trim();
  return `jnono-account-profile-v${ACCOUNT_PROFILE_STORAGE_VERSION}:${userId}`;
}

function readAccountProfileFallbackDraft() {
  try {
    const raw = localStorage.getItem(getAccountProfileStorageKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAccountProfileFallbackDraft(payload) {
  try {
    localStorage.setItem(getAccountProfileStorageKey(), JSON.stringify(payload || {}));
  } catch {}
}

async function loadAccountProfile(options = {}) {
  const silent = options.silent === true;
  if (!state.authToken) return null;
  try {
    const payload = await apiFetch("/api/account/profile", { token: state.authToken });
    const profile = payload?.profile && typeof payload.profile === "object" ? payload.profile : null;
    if (!profile) return null;
    if (!state.user) state.user = {};
    if (String(profile.displayName || "").trim()) {
      state.user.name = String(profile.displayName || "").trim();
      state.user.displayName = String(profile.displayName || "").trim();
    }
    state.user.nickname = String(profile.nickname || "").trim();
    state.user.phone = String(profile.phone || "").trim();
    if (String(profile.email || "").trim()) {
      state.user.email = String(profile.email || "").trim();
    }
    return profile;
  } catch (err) {
    if (!silent && accountProfileMsg) {
      accountProfileMsg.innerHTML = `<strong>资料读取失败</strong><span>${escapeHtml(err.message || "请稍后重试")}</span>`;
      accountProfileMsg.classList.remove("hidden");
    }
    return null;
  }
}

function resolveAssignedExamSummaryText() {
  const assigned = normalizeExamCodeList(state.user?.assignedExamCodes ?? state.user?.assigned_exam_codes);
  if (!assigned.length) return "未分配";
  const names = assigned.map((code) => {
    const hit = findExamByCode(code);
    const exam = hit?.exam;
    if (!exam) return code;
    return String(exam.name || exam.examName || exam.id || code).trim() || code;
  });
  return names.join(" / ");
}

function formatExpiresAtText(rawValue) {
  const text = String(rawValue || "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return text;
}

function resolveMembershipExpiryText() {
  const candidateValues = [];
  const categoryDetails =
    state.user?.categoryEntitlementDetails && typeof state.user.categoryEntitlementDetails === "object"
      ? state.user.categoryEntitlementDetails
      : {};
  for (const detail of Object.values(categoryDetails)) {
    if (!detail || typeof detail !== "object") continue;
    if (detail.hasAccess !== true || detail.isActive !== true) continue;
    const expiresAt = formatExpiresAtText(detail.expiresAt);
    if (expiresAt) candidateValues.push(expiresAt);
  }
  for (const item of [state.user?.bilingualEntitlement, state.user?.aiEntitlement]) {
    if (!item || typeof item !== "object") continue;
    if (item.hasAccess !== true || item.isActive !== true) continue;
    const expiresAt = formatExpiresAtText(item.expiresAt);
    if (expiresAt) candidateValues.push(expiresAt);
  }
  if (!candidateValues.length) return "未设置";
  candidateValues.sort((a, b) => a.localeCompare(b, "en"));
  return candidateValues[0];
}

function updateAccountUpgradeButtons(tierKey) {
  const cards = Array.from(accountUpgradeGrid?.querySelectorAll(".account-upgrade-card") || []);
  let availableUpgradeCount = 0;
  for (const card of cards) {
    if (!(card instanceof HTMLElement)) continue;
    const cardTier = normalizePlanTierForAccount(card.dataset.tier || "", "");
    const isCurrent = cardTier === tierKey;
    card.classList.toggle("current", isCurrent);
    const badge = card.querySelector('[data-role="current-badge"]');
    if (badge instanceof HTMLElement) {
      badge.classList.toggle("hidden", !isCurrent);
    }
    const button = card.querySelector("button[data-upgrade-tier]");
    if (!(button instanceof HTMLButtonElement)) continue;
    if (isCurrent) {
      button.textContent = "当前套餐";
      button.disabled = true;
      button.classList.remove("primary");
      button.classList.add("ghost");
      button.classList.remove("hidden");
      continue;
    }
    if (tierKey === "ai_999") {
      button.classList.add("hidden");
      button.disabled = true;
      continue;
    }
    if (tierKey === "pro_599" && cardTier === "basic_399") {
      button.classList.add("hidden");
      button.disabled = true;
      continue;
    }
    button.disabled = false;
    button.classList.remove("hidden");
    button.classList.add("primary");
    button.classList.remove("ghost");
    if (tierKey === "trial" && cardTier === "basic_399") {
      button.textContent = "开通 Basic";
    } else if (cardTier === "pro_599") {
      button.textContent = "升级到 Pro";
    } else if (cardTier === "ai_999") {
      button.textContent = "升级到 AI";
    } else {
      button.textContent = "升级套餐";
    }
    availableUpgradeCount += 1;
  }
  if (accountUpgradeMsg) {
    if (tierKey === "ai_999") {
      accountUpgradeMsg.innerHTML = "<strong>你正在使用最高级计划</strong><span>已开通全部可见训练权益。</span>";
      accountUpgradeMsg.classList.remove("hidden");
    } else if (availableUpgradeCount > 0) {
      accountUpgradeMsg.classList.add("hidden");
      accountUpgradeMsg.textContent = "";
    }
  }
}

function renderAccountCurrentBenefits(list) {
  if (!accountCurrentBenefits) return;
  accountCurrentBenefits.innerHTML = "";
  for (const item of list) {
    const li = document.createElement("li");
    li.textContent = item;
    accountCurrentBenefits.appendChild(li);
  }
}

function renderAccountSettingsCenter() {
  if (!accountCenterSection) return;
  const fallbackDraft = readAccountProfileFallbackDraft();
  const { tierKey, meta } = getCurrentPlanMeta();
  const displayName = String(state.user?.displayName || state.user?.name || fallbackDraft.displayName || "").trim();
  const nickname = String(state.user?.nickname || fallbackDraft.nickname || "").trim();
  const phone = String(state.user?.phone || fallbackDraft.phone || "").trim();

  if (accountDisplayNameInput) accountDisplayNameInput.value = displayName;
  if (accountNicknameInput) accountNicknameInput.value = nickname;
  if (accountEmailInput) accountEmailInput.value = String(state.user?.email || "");
  if (accountPhoneInput) accountPhoneInput.value = phone;
  if (accountAssignedExamsInput) accountAssignedExamsInput.value = resolveAssignedExamSummaryText();

  if (accountCurrentPlanName) accountCurrentPlanName.textContent = meta.planName;
  if (accountCurrentPlanTier) accountCurrentPlanTier.textContent = meta.tierLabel;
  if (accountCurrentPlanExpiry) accountCurrentPlanExpiry.textContent = resolveMembershipExpiryText();
  if (accountCurrentPlanDesc) accountCurrentPlanDesc.textContent = meta.description;
  renderAccountCurrentBenefits(meta.benefits);
  updateAccountUpgradeButtons(tierKey);

  if (accountProfileMsg && !accountProfileMsg.classList.contains("hidden")) {
    accountProfileMsg.innerHTML = `<strong>资料已保存</strong><span>手机号${phone ? `：${escapeHtml(phone)}` : "未绑定"}。资料已同步到账号，可跨设备使用。</span>`;
  }
}

function hideAccountSettingsCenter() {
  accountCenterSection?.classList.add("hidden");
}

async function showAccountSettingsCenter() {
  if (!accountCenterSection) return;
  setMemberView("placeholder", { preserveNav: true });
  hideModulePlaceholder();
  await loadAccountProfile({ silent: true });
  renderAccountSettingsCenter();
  accountCenterSection.classList.remove("hidden");
  accountCenterSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function onSaveAccountProfile() {
  const displayName = String(accountDisplayNameInput?.value || "").trim();
  const nickname = String(accountNicknameInput?.value || "").trim();
  const phone = String(accountPhoneInput?.value || "").trim();
  const phoneValidChars = /^[0-9+()\-\s]+$/.test(phone);
  if (displayName.length < 2) {
    if (accountProfileMsg) {
      accountProfileMsg.innerHTML = "<strong>保存失败</strong><span>姓名至少 2 个字符。</span>";
      accountProfileMsg.classList.remove("hidden");
    }
    return;
  }
  if (!phone) {
    if (accountProfileMsg) {
      accountProfileMsg.innerHTML = "<strong>保存失败</strong><span>请先填写手机号。</span>";
      accountProfileMsg.classList.remove("hidden");
    }
    return;
  }
  if (phone.length < 6 || phone.length > 32 || !phoneValidChars) {
    if (accountProfileMsg) {
      accountProfileMsg.innerHTML = "<strong>保存失败</strong><span>手机号格式不正确，请检查后重试。</span>";
      accountProfileMsg.classList.remove("hidden");
    }
    return;
  }

  try {
    const payload = await apiFetch("/api/account/profile", {
      method: "POST",
      token: state.authToken,
      body: {
        displayName,
        nickname,
        phone
      }
    });
    const profile = payload?.profile && typeof payload.profile === "object" ? payload.profile : null;
    if (!profile) throw new Error("保存结果无效");
    if (!state.user) state.user = {};
    state.user.name = String(profile.displayName || profile.name || displayName).trim();
    state.user.displayName = String(profile.displayName || profile.name || displayName).trim();
    state.user.nickname = String(profile.nickname || "").trim();
    state.user.phone = String(profile.phone || "").trim();
    if (String(profile.email || "").trim()) {
      state.user.email = String(profile.email || "").trim();
    }
    writeAccountProfileFallbackDraft({
      displayName: state.user.displayName,
      nickname: state.user.nickname,
      phone: state.user.phone
    });
    refreshWelcomeText();
    renderAccountSettingsCenter();
    if (accountProfileMsg) {
      accountProfileMsg.innerHTML = "<strong>资料已保存</strong><span>已同步到账号，刷新后仍会保留。</span>";
      accountProfileMsg.classList.remove("hidden");
    }
  } catch (err) {
    writeAccountProfileFallbackDraft({ displayName, nickname, phone });
    if (accountProfileMsg) {
      accountProfileMsg.innerHTML = `<strong>保存失败</strong><span>${escapeHtml(
        err.message || "请稍后重试"
      )}。已暂存到当前设备，网络恢复后可再次保存。</span>`;
      accountProfileMsg.classList.remove("hidden");
    }
  }
}

function onAccountPasswordPlaceholder() {
  if (!accountSecurityMsg) return;
  accountSecurityMsg.textContent = "当前版本暂未开放在线改密，请联系管理员处理，后续将在此直接支持。";
  accountSecurityMsg.classList.remove("hidden");
}

function onAccountUpgradeClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest("button[data-upgrade-tier]");
  if (!(button instanceof HTMLButtonElement) || button.disabled) return;
  const tierKey = normalizePlanTierForAccount(button.dataset.upgradeTier || "", "");
  if (!accountUpgradeMsg) return;
  const tierName = MEMBERSHIP_PLAN_META[tierKey]?.planName || tierKey.toUpperCase();
  accountUpgradeMsg.innerHTML = `<strong>升级入口已就绪（支付待接入）</strong><span>你选择了 ${escapeHtml(
    tierName
  )}。当前版本请联系管理员或微信客服完成升级，后续可直接在线开通。</span>`;
  accountUpgradeMsg.classList.remove("hidden");
}

function showModulePlaceholder(module, introText = "") {
  if (!modulePlaceholderSection || !modulePlaceholderTitle || !modulePlaceholderDesc || !modulePlaceholderBody) return;
  hideAccountSettingsCenter();
  const moduleType = String(module?.moduleType || "").trim();
  const title = getModuleTitle(module);
  const desc = introText || String(module?.description || "").trim() || "该模块已预留入口，后续可在后台继续配置内容。";
  modulePlaceholderTitle.textContent = title;
  modulePlaceholderDesc.textContent = desc;
  modulePlaceholderBody.innerHTML = "";

  const typeToContent = {
    course_video: "video",
    course_audio: "audio",
    live_stream: "live"
  };
  const expectedType = typeToContent[moduleType];
  const rows = expectedType
    ? state.courseContents.filter((item) => String(item?.contentType || "").trim() === expectedType)
    : [];
  if (!rows.length) {
    const p = document.createElement("p");
    p.className = "catalog-empty-note";
    p.innerHTML = `<strong>内容正在准备中</strong><span>当前模块已开通入口，后台可继续维护课程占位内容。</span>`;
    modulePlaceholderBody.appendChild(p);
  } else {
    const ul = document.createElement("ul");
    ul.className = "module-placeholder-list";
    for (const row of rows) {
      const li = document.createElement("li");
      const tier = String(row.accessTier || "").trim();
      const examCode = String(row.linkedExamCode || "").trim();
      li.textContent = `${row.title || row.contentCode}${examCode ? ` · ${examCode}` : ""}${tier ? ` · ${tier}` : ""}`;
      ul.appendChild(li);
    }
    modulePlaceholderBody.appendChild(ul);
  }
  modulePlaceholderSection.classList.remove("hidden");
  modulePlaceholderSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideModulePlaceholder() {
  modulePlaceholderSection?.classList.add("hidden");
}

function findExamByCode(examCode) {
  const target = normalizeExamCodeValue(examCode);
  if (!target) return null;
  for (const industry of state.bank?.industries || []) {
    for (const exam of industry?.exams || []) {
      const code = normalizeExamCodeValue(exam?.examCode || exam?.id);
      if (code === target) return { industry, exam };
    }
  }
  return null;
}

function focusExamByCode(examCode) {
  const hit = findExamByCode(examCode);
  if (!hit) return false;
  state.currentIndustryId = hit.industry.id;
  renderIndustryOptions();
  if (industrySelect && Array.from(industrySelect.options).some((opt) => opt.value === hit.industry.id)) {
    industrySelect.value = hit.industry.id;
    state.currentIndustryId = hit.industry.id;
    renderExamFamilyOptions();
  }
  const family = String(hit.exam.examFamilyKey || "general").trim() || "general";
  if (examFamilySelect && Array.from(examFamilySelect.options).some((opt) => opt.value === family)) {
    examFamilySelect.value = family;
    state.currentExamFamilyKey = family;
    renderTradeOptions();
  }
  const tradeCode = resolveTradeCode(hit.exam);
  if (tradeSelect && Array.from(tradeSelect.options).some((opt) => opt.value === tradeCode)) {
    tradeSelect.value = tradeCode;
    state.currentTradeCode = tradeCode;
    renderExamTypeOptions();
  }
  const examType = resolveExamType(hit.exam);
  if (examTypeSelect && Array.from(examTypeSelect.options).some((opt) => opt.value === examType)) {
    examTypeSelect.value = examType;
    state.currentExamType = examType;
  }
  state.currentExamId = hit.exam.id;
  syncCurrentExamFromFilters();
  updatePracticeContext();
  return true;
}

function getMemberSideLinks() {
  return Array.from(document.querySelectorAll(".member-side-link"));
}

function isDynamicSideNavModule(module) {
  const moduleType = String(module?.moduleType || "")
    .trim()
    .toLowerCase();
  if (!moduleType) return false;
  return !CORE_DASHBOARD_TYPES.has(moduleType);
}

function renderDynamicSideNavModules() {
  if (!memberDynamicNavSection || !memberDynamicNav) return;
  memberDynamicNav.innerHTML = "";
  const modules = (Array.isArray(state.dashboardModules) ? state.dashboardModules : []).filter(isDynamicSideNavModule);
  if (!modules.length) {
    memberDynamicNavSection.classList.add("hidden");
    memberDynamicNavSection.setAttribute("aria-hidden", "true");
    if (String(state.activeSideNavKey || "").startsWith("dynamic:")) {
      setMemberSideNavActive("home");
    }
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const module of modules) {
    const moduleCode = String(module?.moduleCode || "").trim();
    if (!moduleCode) continue;
    const navKey = `dynamic:${moduleCode}`;
    const link = document.createElement("a");
    link.className = "member-side-link member-side-link-dynamic";
    link.href = "#modulePlaceholderSection";
    link.dataset.navKey = navKey;
    link.dataset.navAction = "module";
    link.dataset.moduleCode = moduleCode;
    link.innerHTML = `
      <span class="member-side-link-main">${escapeHtml(getModuleTitle(module))}</span>
      <span class="member-side-link-sub">${escapeHtml(getModuleTypeLabel(module.moduleType))}</span>
    `;
    fragment.appendChild(link);
  }
  memberDynamicNav.appendChild(fragment);
  memberDynamicNavSection.classList.remove("hidden");
  memberDynamicNavSection.setAttribute("aria-hidden", "false");
  setMemberSideNavActive(state.activeSideNavKey || "home");
}

function setMemberSideNavActive(navKey) {
  const key = String(navKey || "").trim();
  const links = getMemberSideLinks();
  if (!key || !links.length) return;
  state.activeSideNavKey = key;
  for (const link of links) {
    const linkKey = String(link.dataset.navKey || "").trim();
    link.classList.toggle("active", linkKey === key);
  }
}

function getMemberViewMap() {
  return {
    dashboard: memberViewDashboard,
    practice: memberViewPractice,
    progress: memberViewProgress,
    placeholder: memberViewPlaceholder
  };
}

function setMemberView(viewKey, options = {}) {
  const map = getMemberViewMap();
  const key = Object.prototype.hasOwnProperty.call(map, viewKey) ? viewKey : "dashboard";
  state.currentMemberView = key;
  const preserveNav = options.preserveNav === true;
  const shouldScroll = options.scroll !== false;

  for (const [candidateKey, el] of Object.entries(map)) {
    if (!el) continue;
    const active = candidateKey === key;
    el.classList.toggle("hidden", !active);
    el.setAttribute("aria-hidden", active ? "false" : "true");
  }

  if (!preserveNav) {
    const defaultNavMap = {
      dashboard: "home",
      practice: "practice",
      progress: "study-progress",
      placeholder: state.activeSideNavKey.startsWith("dynamic:") ? state.activeSideNavKey : "home"
    };
    setMemberSideNavActive(defaultNavMap[key] || "home");
  }

  if (shouldScroll) {
    map[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function ensureViewVisibleForSection(targetId) {
  const id = String(targetId || "").trim();
  if (!id) return;
  if (["dashboard", "dashboardOverviewSection"].includes(id)) {
    setMemberView("dashboard", { preserveNav: true, scroll: false });
    return;
  }
  if (["trialQuiz", "practiceCenterSection", "quizSection", "resultSection"].includes(id)) {
    setMemberView("practice", { preserveNav: true, scroll: false });
    return;
  }
  if (["progress", "progressSectionGroup"].includes(id)) {
    setMemberView("progress", { preserveNav: true, scroll: false });
    return;
  }
  if (["modulePlaceholderSection", "placeholderSectionGroup"].includes(id)) {
    setMemberView("placeholder", { preserveNav: true, scroll: false });
  }
}

function scrollToMemberTarget(targetId) {
  const id = String(targetId || "").trim();
  if (!id) return;
  ensureViewVisibleForSection(id);
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function onMemberSideNavClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const link = target.closest(".member-side-link");
  if (!(link instanceof HTMLAnchorElement)) return;
  event.preventDefault();

  const navKey = String(link.dataset.navKey || "").trim();
  const action = String(link.dataset.navAction || "").trim() || "scroll";
  const targetId = String(link.dataset.targetId || "").trim();

  if (action === "module") {
    const moduleCode = String(link.dataset.moduleCode || "").trim();
    if (!moduleCode) return;
    const module = state.dashboardModules.find((item) => String(item?.moduleCode || "").trim() === moduleCode);
    if (!module) return;
    setMemberSideNavActive(navKey || `dynamic:${moduleCode}`);
    openDashboardModule(module);
    return;
  }

  if (action === "mock") {
    setTrialPracticeMode("mock");
    setMemberView("practice", { preserveNav: true });
    jumpToTrainingSection("mock");
    return;
  }

  if (action === "practice") {
    setTrialPracticeMode("category");
    setMemberView("practice", { preserveNav: true });
    jumpToTrainingSection("practice");
    return;
  }

  if (targetId === "progress") {
    setMemberView("progress", { preserveNav: true });
    jumpToProgressSection(navKey || "study-progress");
    return;
  }

  if (targetId) {
    if (targetId === "dashboard") {
      setMemberView("dashboard", { preserveNav: true });
    }
    setMemberSideNavActive(navKey || "home");
    scrollToMemberTarget(targetId);
    return;
  }
}

function syncMemberSideNavActive() {
  if (!getMemberSideLinks().length) return;
  if (state.currentMemberView === "practice") {
    if (!["practice", "mock"].includes(state.activeSideNavKey)) {
      setMemberSideNavActive("practice");
    }
    return;
  }
  if (state.currentMemberView === "progress") {
    if (state.activeSideNavKey !== "study-progress") {
      setMemberSideNavActive("study-progress");
    }
    return;
  }
  if (state.currentMemberView === "placeholder") {
    if (!String(state.activeSideNavKey || "").startsWith("dynamic:")) {
      setMemberSideNavActive("home");
    }
    return;
  }
  setMemberSideNavActive("home");
}

function onContinueLearningClick() {
  const rec = state.continueRecommendation || buildContinueRecommendation();
  const targetMode = rec?.mode === "mock" ? "mock" : "category";
  if (rec?.kind === "in_progress" && restoreContinueInProgress(rec)) {
    setMemberView("practice", { preserveNav: true });
    setMemberSideNavActive(targetMode === "mock" ? "mock" : "practice");
    updatePracticeContext();
    scrollToMemberTarget("trialQuiz");
    return;
  }
  setTrialPracticeMode(targetMode);
  if (rec?.examCode) {
    focusExamByCode(rec.examCode);
  }
  jumpToTrainingSection(targetMode === "mock" ? "mock" : "practice");
}

function jumpToTrainingSection(navKey = "practice") {
  hideAccountSettingsCenter();
  hideModulePlaceholder();
  setMemberView("practice", { preserveNav: true });
  setMemberSideNavActive(navKey);
  updatePracticeContext();
  scrollToMemberTarget("trialQuiz");
}

function jumpToProgressSection(navKey = "study-progress") {
  hideAccountSettingsCenter();
  hideModulePlaceholder();
  setMemberView("progress", { preserveNav: true });
  setMemberSideNavActive(navKey);
  scrollToMemberTarget("progress");
}

function handleInternalModuleRoute(module) {
  const target = String(module?.routeTarget || "").trim();
  const moduleType = String(module?.moduleType || module?.module_type || "")
    .trim()
    .toLowerCase();
  if (moduleType === "account_settings") {
    showAccountSettingsCenter();
    return;
  }
  if (!target || target === "practice_center" || target === "catalog" || target === "trialQuiz") {
    setTrialPracticeMode("category");
    jumpToTrainingSection();
    return;
  }
  if (target === "mock_exam") {
    setTrialPracticeMode("mock");
    jumpToTrainingSection();
    return;
  }
  if (target === "licensing_progress") {
    jumpToProgressSection();
    return;
  }
  if (target === "account_settings") {
    showAccountSettingsCenter();
    return;
  }
  if (target.startsWith("#")) {
    scrollToMemberTarget(target.slice(1));
    return;
  }
  if (/^https?:\/\//i.test(target) || target.startsWith("/")) {
    window.location.href = target;
    return;
  }
  showModulePlaceholder(module);
}

async function onDashboardModuleClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.dataset.action !== "open-module") return;
  const moduleCode = String(target.dataset.moduleCode || "").trim();
  if (!moduleCode) return;
  const module = state.dashboardModules.find((item) => String(item?.moduleCode || "") === moduleCode);
  if (!module) return;

  openDashboardModule(module);
}

function openDashboardModule(module) {
  const moduleType = String(module.moduleType || module.module_type || "")
    .trim()
    .toLowerCase();
  if (moduleType === "account_settings") {
    showAccountSettingsCenter();
    return;
  }
  const routeType = String(module.routeType || "").trim();
  if (routeType === "external_link") {
    const link = String(module.routeTarget || "").trim();
    if (!link) {
      showModulePlaceholder(module, "该外部链接尚未配置。");
      return;
    }
    window.open(link, "_blank", "noopener");
    return;
  }
  if (routeType === "placeholder") {
    showModulePlaceholder(module);
    return;
  }
  if (routeType === "exam_home" || routeType === "category_practice" || routeType === "mock_exam") {
    const examCode = module.linkedExamCode || module.routeTarget;
    if (routeType === "mock_exam") {
      setTrialPracticeMode("mock");
    } else {
      setTrialPracticeMode("category");
    }
    if (examCode && focusExamByCode(examCode)) {
      jumpToTrainingSection();
    } else if (!examCode && routeType === "mock_exam") {
      jumpToTrainingSection();
    } else {
      showModulePlaceholder(module, "当前模块尚未绑定可用考试。");
    }
    return;
  }
  handleInternalModuleRoute(module);
}

function toProgressBool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return value === true;
}

function renderLicensingProgressSnapshot() {
  if (!licensingProgressSnapshot) return;
  const progress =
    state.user?.licensingProgress && typeof state.user.licensingProgress === "object" ? state.user.licensingProgress : {};
  const enrolled = toProgressBool(progress.enrolled, true);
  const applicationNumber = String(progress.applicationNumber || "").trim();
  const applicationSubmitted = toProgressBool(progress.applicationSubmitted, false) || Boolean(applicationNumber);
  const studyStarted = toProgressBool(progress.studyStarted, false);
  const examScheduled = toProgressBool(progress.examScheduled, false) || Boolean(progress.examDate);
  const examPassed = toProgressBool(progress.examPassed, false);

  if (applicationNumberInput) applicationNumberInput.value = applicationNumber;
  if (examDateInput) examDateInput.value = String(progress.examDate || "");
  if (studyStartedInput) studyStartedInput.checked = studyStarted;
  if (examScheduledInput) examScheduledInput.checked = examScheduled;
  if (examPassedInput) examPassedInput.checked = examPassed;
  if (licensingNotesInput) licensingNotesInput.value = String(progress.notes || "");

  const steps = [
    { label: "Enrolled", active: enrolled },
    { label: "Application Submitted", active: applicationSubmitted },
    { label: "Study Started", active: studyStarted },
    { label: "Exam Scheduled", active: examScheduled },
    { label: "Passed", active: examPassed }
  ];
  const stepHtml = steps
    .map(
      (step) =>
        `<div class="lp-step ${step.active ? "active" : ""}">${escapeHtml(step.label)}${step.active ? " ✓" : ""}</div>`
    )
    .join("");
  const metaParts = [];
  if (applicationNumber) metaParts.push(`Application #: ${applicationNumber}`);
  if (progress.examDate) metaParts.push(`Exam Date: ${progress.examDate}`);
  if (typeof progress.studyProgressPercent === "number") metaParts.push(`Study: ${progress.studyProgressPercent}%`);
  licensingProgressSnapshot.innerHTML = `
    <div class="licensing-progress-steps">${stepHtml}</div>
    <div class="lp-meta">${escapeHtml(metaParts.join(" · ") || "可在下方填写申请号/考试日期，系统会自动同步状态。")}</div>
  `;
  updateSummaryStrip();
}

async function onSaveLicensingProgress() {
  if (!saveLicensingProgressBtn) return;
  const payload = {
    applicationNumber: String(applicationNumberInput?.value || "").trim(),
    examDate: String(examDateInput?.value || "").trim(),
    studyStarted: studyStartedInput?.checked === true,
    examScheduled: examScheduledInput?.checked === true,
    examPassed: examPassedInput?.checked === true,
    notes: String(licensingNotesInput?.value || "").trim()
  };
  saveLicensingProgressBtn.disabled = true;
  saveLicensingProgressBtn.textContent = "保存中...";
  licensingProgressMsg?.classList.add("hidden");
  try {
    const result = await apiFetch("/api/licensing-progress", {
      method: "PUT",
      token: state.authToken,
      body: payload
    });
    if (!state.user) state.user = {};
    state.user.licensingProgress = result?.progress || {};
    renderLicensingProgressSnapshot();
    await renderProgress();
    if (licensingProgressMsg) {
      licensingProgressMsg.textContent = "进度已保存。输入 Application Number 后会自动标记 Application Submitted。";
      licensingProgressMsg.style.color = "#2757d6";
      licensingProgressMsg.classList.remove("hidden");
    }
  } catch (err) {
    if (licensingProgressMsg) {
      licensingProgressMsg.textContent = `保存失败：${err.message}`;
      licensingProgressMsg.style.color = "#be2f2f";
      licensingProgressMsg.classList.remove("hidden");
    }
  } finally {
    saveLicensingProgressBtn.disabled = false;
    saveLicensingProgressBtn.textContent = "保存执照进度";
  }
}

async function renderProgress() {
  const progress = await apiFetch("/api/progress/summary", { token: state.authToken });
  state.progressSummary = progress && typeof progress === "object" ? progress : {};
  updateContinueLearningPanel();
  updateRecentPerformancePanel();
  updateSummaryStrip();
}

function getOnboardingStorageKey() {
  const userId = String(state.user?.id || state.user?.email || "unknown").trim();
  return `jnono-licensing-onboarding-v1:${userId}`;
}

function readOnboardingMeta() {
  try {
    const raw = localStorage.getItem(getOnboardingStorageKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeOnboardingMeta(payload) {
  try {
    localStorage.setItem(getOnboardingStorageKey(), JSON.stringify(payload || {}));
  } catch {}
}

function mergeOnboardingMeta(patch = {}) {
  const current = readOnboardingMeta();
  const next = { ...current, ...(patch || {}) };
  writeOnboardingMeta(next);
  return next;
}

function isLicensingProgressComplete(progress) {
  const data = progress && typeof progress === "object" ? progress : {};
  const applicationNumber = String(data.applicationNumber || "").trim();
  const submitted = toProgressBool(data.applicationSubmitted, false) || Boolean(applicationNumber);
  const studyStarted = toProgressBool(data.studyStarted, false);
  const scheduled = toProgressBool(data.examScheduled, false) || Boolean(data.examDate);
  return submitted && studyStarted && scheduled;
}

function shouldOpenOnboardingWizard() {
  if (!onboardingModal || !onboardingSteps.length) return false;
  const progress = getLicensingProgressSnapshotData();
  if (isLicensingProgressComplete(progress)) return false;
  const meta = readOnboardingMeta();
  const now = Date.now();
  const dismissedUntil = Number(meta.dismissedUntil || 0);
  if (!meta.startedAt) return true;
  if (dismissedUntil > now) return false;
  return false;
}

function getFirstIncompleteOnboardingStep(progress) {
  const data = progress && typeof progress === "object" ? progress : {};
  const applicationNumber = String(data.applicationNumber || "").trim();
  const submitted = toProgressBool(data.applicationSubmitted, false) || Boolean(applicationNumber);
  const studyStarted = toProgressBool(data.studyStarted, false);
  const scheduled = toProgressBool(data.examScheduled, false) || Boolean(data.examDate);

  if (!submitted && !applicationNumber) return 1;
  if (submitted && applicationNumber.length < 3) return 2;
  if (!studyStarted) return 3;
  if (!scheduled) return 4;
  return 5;
}

function updateSidebarProgressAlert(progress) {
  if (!sidebarProgressAlert) return;
  const guidance = getSidebarGuidance(progress);
  sidebarProgressAlert.textContent = guidance.message;
  sidebarProgressAlert.dataset.state = guidance.tone;
  if (!onboardingOpenBtn) return;
  onboardingOpenBtn.textContent = guidance.nextLabel;
  onboardingOpenBtn.dataset.nextAction = guidance.nextAction;
  if (guidance.preferredStep) {
    onboardingOpenBtn.dataset.preferredStep = String(guidance.preferredStep);
  } else {
    delete onboardingOpenBtn.dataset.preferredStep;
  }
  onboardingOpenBtn.classList.toggle("action-warn", guidance.tone === "warn");
}

function setOnboardingRadio(name, value) {
  const radios = Array.from(document.querySelectorAll(`input[name="${name}"]`));
  for (const radio of radios) {
    radio.checked = radio.value === value;
  }
}

function getOnboardingRadio(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked instanceof HTMLInputElement ? checked.value : "";
}

function syncOnboardingStepView() {
  const total = onboardingSteps.length || 5;
  for (const stepEl of onboardingSteps) {
    const idx = Number(stepEl.dataset.step || 0);
    stepEl.classList.toggle("hidden", idx !== state.onboardingStep);
  }
  if (onboardingStepLabel) {
    onboardingStepLabel.textContent = `Step ${state.onboardingStep} / ${total}`;
  }
  onboardingPrevBtn && (onboardingPrevBtn.disabled = state.onboardingStep <= 1);
  onboardingNextBtn?.classList.toggle("hidden", state.onboardingStep >= total);
  if (onboardingNextBtn) {
    onboardingNextBtn.textContent = state.onboardingStep <= 1 ? "去完善进度" : "下一步";
  }
  onboardingSaveBtn?.classList.remove("hidden");
  onboardingSaveLaterBtn?.classList.remove("hidden");
  mergeOnboardingMeta({ lastStep: state.onboardingStep, startedAt: readOnboardingMeta().startedAt || Date.now() });
  if (state.onboardingStep >= total) {
    updateOnboardingReview();
  }
}

function openOnboardingWizard(options = {}) {
  if (!onboardingModal) return;
  const progress = getLicensingProgressSnapshotData();
  const meta = readOnboardingMeta();
  const applicationNumber = String(progress.applicationNumber || "").trim();
  const submitted = toProgressBool(progress.applicationSubmitted, false) || Boolean(applicationNumber);
  const studyStarted = toProgressBool(progress.studyStarted, false);
  const scheduled = toProgressBool(progress.examScheduled, false) || Boolean(progress.examDate);

  setOnboardingRadio("onboardingSubmitted", submitted ? "submitted" : "not_submitted");
  setOnboardingRadio("onboardingStudyStarted", studyStarted ? "yes" : "no");
  setOnboardingRadio("onboardingExamScheduled", scheduled ? "yes" : "no");
  if (onboardingApplicationNumber) onboardingApplicationNumber.value = applicationNumber;
  if (onboardingExamDate) onboardingExamDate.value = String(progress.examDate || "");

  const suggestedStep = getFirstIncompleteOnboardingStep(progress);
  const lastStep = Number(meta.lastStep || 0);
  const resumeStep = lastStep >= 1 && lastStep <= onboardingSteps.length ? lastStep : suggestedStep;
  const preferredStep = Number(options.preferredStep || 0);
  if (preferredStep >= 1 && preferredStep <= onboardingSteps.length) {
    state.onboardingStep = preferredStep;
  } else {
    state.onboardingStep = options.force === true ? resumeStep : suggestedStep;
  }
  onboardingModal.classList.remove("hidden");
  onboardingModal.setAttribute("aria-hidden", "false");
  mergeOnboardingMeta({
    startedAt: meta.startedAt || Date.now(),
    lastStep: state.onboardingStep,
    dismissedUntil: 0
  });
  syncOnboardingStepView();
}

function closeOnboardingWizard(mode = "later") {
  if (!onboardingModal) return;
  onboardingModal.classList.add("hidden");
  onboardingModal.setAttribute("aria-hidden", "true");
  const meta = readOnboardingMeta();
  const now = Date.now();
  if (mode === "completed") {
    meta.completedAt = now;
    meta.dismissedUntil = 0;
  } else if (mode === "later") {
    meta.dismissedUntil = now + ONBOARDING_DEFER_HOURS * 60 * 60 * 1000;
  }
  meta.lastStep = state.onboardingStep;
  writeOnboardingMeta(meta);
}

function validateOnboardingStep(step) {
  if (step === 1) {
    return Boolean(getOnboardingRadio("onboardingSubmitted"));
  }
  if (step === 2) {
    const submitted = getOnboardingRadio("onboardingSubmitted");
    if (submitted !== "submitted") return true;
    return String(onboardingApplicationNumber?.value || "").trim().length >= 3;
  }
  if (step === 3) {
    return Boolean(getOnboardingRadio("onboardingStudyStarted"));
  }
  if (step === 4) {
    const scheduled = getOnboardingRadio("onboardingExamScheduled");
    if (!scheduled) return false;
    if (scheduled === "no") return true;
    return String(onboardingExamDate?.value || "").trim().length > 0;
  }
  return true;
}

function onOnboardingPrev() {
  state.onboardingStep = Math.max(1, state.onboardingStep - 1);
  syncOnboardingStepView();
}

function onOnboardingNext() {
  const total = onboardingSteps.length || 5;
  state.onboardingStep = Math.min(total, state.onboardingStep + 1);
  syncOnboardingStepView();
}

function getOnboardingPayload({ preserveUnknown = true } = {}) {
  const current = getLicensingProgressSnapshotData();
  const submittedChoice = getOnboardingRadio("onboardingSubmitted");
  const studyChoice = getOnboardingRadio("onboardingStudyStarted");
  const scheduledChoice = getOnboardingRadio("onboardingExamScheduled");
  const rawApplicationNumber = String(onboardingApplicationNumber?.value || "").trim();
  const rawExamDate = String(onboardingExamDate?.value || "").trim();

  const fallbackApplicationNumber = String(current.applicationNumber || "").trim();
  const fallbackExamDate = String(current.examDate || "").trim();

  let applicationNumber = fallbackApplicationNumber;
  if (submittedChoice === "submitted") applicationNumber = rawApplicationNumber;
  if (submittedChoice === "not_submitted") applicationNumber = "";

  let examDate = fallbackExamDate;
  if (scheduledChoice === "yes") examDate = rawExamDate;
  if (scheduledChoice === "no") examDate = "";

  const submittedValue =
    submittedChoice === "submitted"
      ? true
      : submittedChoice === "not_submitted"
        ? false
        : preserveUnknown
          ? toProgressBool(current.applicationSubmitted, false) || Boolean(fallbackApplicationNumber)
          : false;
  const studyStartedValue =
    studyChoice === "yes" ? true : studyChoice === "no" ? false : preserveUnknown ? toProgressBool(current.studyStarted, false) : false;
  const scheduledValue =
    scheduledChoice === "yes"
      ? true
      : scheduledChoice === "no"
        ? false
        : preserveUnknown
          ? toProgressBool(current.examScheduled, false) || Boolean(fallbackExamDate)
          : false;

  return {
    applicationNumber,
    applicationSubmitted: submittedValue,
    examDate,
    studyStarted: studyStartedValue,
    examScheduled: scheduledValue,
    examPassed: toProgressBool(current.examPassed, false),
    notes: String(current.notes || "").trim()
  };
}

function updateOnboardingReview() {
  if (!onboardingReview) return;
  const payload = getOnboardingPayload();
  const submitted = payload.applicationNumber ? "已提交" : "未提交";
  const scheduled = payload.examScheduled ? `已预约（${payload.examDate || "日期未填写"}）` : "未预约";
  const studyStarted = payload.studyStarted ? "已开始学习" : "尚未开始学习";
  onboardingReview.innerHTML = `
    <div>申请状态：${escapeHtml(submitted)}</div>
    <div>申请号：${escapeHtml(payload.applicationNumber || "未填写")}</div>
    <div>学习状态：${escapeHtml(studyStarted)}</div>
    <div>考试预约：${escapeHtml(scheduled)}</div>
  `;
}

async function onOnboardingSave() {
  const payload = getOnboardingPayload({ preserveUnknown: true });
  onboardingSaveBtn && (onboardingSaveBtn.disabled = true);
  onboardingSaveLaterBtn && (onboardingSaveLaterBtn.disabled = true);
  try {
    const result = await apiFetch("/api/licensing-progress", {
      method: "PUT",
      token: state.authToken,
      body: payload
    });
    if (!state.user) state.user = {};
    state.user.licensingProgress = result?.progress || {};
    renderLicensingProgressSnapshot();
    await renderProgress();
    alert("已保存，你可以稍后继续完善。");
    closeOnboardingWizard("completed");
  } catch (err) {
    alert(`保存失败：${err.message}`);
  } finally {
    onboardingSaveBtn && (onboardingSaveBtn.disabled = false);
    onboardingSaveLaterBtn && (onboardingSaveLaterBtn.disabled = false);
  }
}

async function onOnboardingSaveLater() {
  const payload = getOnboardingPayload({ preserveUnknown: true });
  onboardingSaveBtn && (onboardingSaveBtn.disabled = true);
  onboardingSaveLaterBtn && (onboardingSaveLaterBtn.disabled = true);
  try {
    const result = await apiFetch("/api/licensing-progress", {
      method: "PUT",
      token: state.authToken,
      body: payload
    });
    if (!state.user) state.user = {};
    state.user.licensingProgress = result?.progress || {};
    renderLicensingProgressSnapshot();
    await renderProgress();
    mergeOnboardingMeta({ lastStep: state.onboardingStep, startedAt: readOnboardingMeta().startedAt || Date.now() });
    closeOnboardingWizard("later");
  } catch (err) {
    alert(`保存失败：${err.message}`);
  } finally {
    onboardingSaveBtn && (onboardingSaveBtn.disabled = false);
    onboardingSaveLaterBtn && (onboardingSaveLaterBtn.disabled = false);
  }
}

async function onOnboardingSaveComplete() {
  await onOnboardingSave();
}

function maybeOpenOnboardingWizard() {
  if (shouldOpenOnboardingWizard()) {
    openOnboardingWizard({ force: false });
  }
}

function getCurrentIndustry() {
  const industries = state.bank?.industries?.filter((item) => Array.isArray(item.exams) && item.exams.length) || [];
  if (!industries.length) return null;
  return industries.find((item) => item.id === state.currentIndustryId) || industries[0];
}

function getCurrentExam() {
  const industry = getCurrentIndustry();
  const exams = getFilteredExams(industry);
  if (!industry || !exams.length) return null;
  return exams.find((item) => item.id === state.currentExamId) || exams[0];
}

function normalizeExamCodeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");
}

function getQuestionsForExamSelection(exam) {
  if (!exam || typeof exam !== "object") return [];
  const examMap = new Map();
  for (const industry of state.bank?.industries || []) {
    for (const item of industry?.exams || []) {
      const code = normalizeExamCodeValue(item?.examCode || item?.id);
      if (!code) continue;
      examMap.set(code, item);
    }
  }
  const targetCodes = new Set([normalizeExamCodeValue(exam.examCode || exam.id)]);
  for (const code of exam?.includedExamCodes || []) {
    const normalized = normalizeExamCodeValue(code);
    if (normalized) targetCodes.add(normalized);
  }

  const output = [];
  const seen = new Set();
  for (const code of targetCodes) {
    const sourceExam = examMap.get(code);
    if (!sourceExam || !Array.isArray(sourceExam.questions)) continue;
    for (const question of sourceExam.questions) {
      const qid = String(question?.id || "").trim();
      const dedupeKey = `${code}::${qid}`;
      if (!qid || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      output.push(question);
    }
  }
  return output;
}

function resetTimer() {
  clearInterval(state.timerId);
  if (!state.timerEnabled) {
    timerWrap.classList.add("hidden");
    return;
  }

  timerWrap.classList.remove("hidden");
  timerWrap.classList.remove("warning");
  state.timeLeft = 75;
  timerEl.textContent = formatTime(state.timeLeft);

  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    timerEl.textContent = formatTime(state.timeLeft);
    if (state.timeLeft <= 15) timerWrap.classList.add("warning");
    if (state.timeLeft <= 0) {
      clearInterval(state.timerId);
      moveQuestion(1);
    }
  }, 1000);
}

function formatTime(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function refreshWelcomeText() {
  welcomeText.textContent = `欢迎，${state.user?.name || "学员"}（注册会员）`;
}

function getContentPermissions() {
  const tier = normalizeMembershipTierValue(
    state.user?.membershipTier ?? state.user?.membership_tier ?? state.user?.plan,
    "free"
  );
  const defaults = {
    bilingualEnabled: tier === "pro_599" || tier === "ai_999",
    explanationEnabled: tier === "ai_999",
    memoryTipsEnabled: tier === "ai_999"
  };
  const fromServer =
    state.user?.contentPermissions && typeof state.user.contentPermissions === "object"
      ? state.user.contentPermissions
      : {};
  return {
    bilingualEnabled:
      fromServer.bilingualEnabled !== undefined
        ? fromServer.bilingualEnabled === true
        : state.user?.entitlements?.bilingualEnabled !== undefined
          ? state.user.entitlements.bilingualEnabled === true
          : state.user?.entitlements?.bilingualAccess === true
            ? true
            : defaults.bilingualEnabled,
    explanationEnabled:
      fromServer.explanationEnabled !== undefined
        ? fromServer.explanationEnabled === true
        : state.user?.entitlements?.explanationEnabled !== undefined
          ? state.user.entitlements.explanationEnabled === true
          : defaults.explanationEnabled,
    memoryTipsEnabled:
      fromServer.memoryTipsEnabled !== undefined
        ? fromServer.memoryTipsEnabled === true
        : state.user?.entitlements?.memoryTipsEnabled !== undefined
          ? state.user.entitlements.memoryTipsEnabled === true
          : defaults.memoryTipsEnabled
  };
}

function hasBilingualAccess() {
  return getContentPermissions().bilingualEnabled === true;
}

function hasExplanationAccess() {
  return getContentPermissions().explanationEnabled === true;
}

function hasMemoryTipsAccess() {
  return getContentPermissions().memoryTipsEnabled === true;
}

function applyBilingualAccessUI() {
  const enabled = hasBilingualAccess();
  if (bilingualToggleWrap) {
    bilingualToggleWrap.classList.toggle("hidden", !enabled);
  }
  if (showChineseToggle) {
    showChineseToggle.disabled = !enabled;
    if (!enabled) {
      showChineseToggle.checked = false;
      state.showChinese = false;
    } else {
      showChineseToggle.checked = state.showChinese === true;
    }
  }
}

function getQuestionView(question) {
  const english = readLocale(question, "en");
  const chinese = readLocale(question, "zh");
  const hasEnglish = hasLocaleText(english);
  const hasChinese =
    hasLocaleText(chinese) ||
    String(chinese.keyPoint || "").trim().length > 0 ||
    String(chinese.vocab || "").trim().length > 0 ||
    String(chinese.memoryTip || "").trim().length > 0;
  const fallbackEnglish = {
    ...english,
    prompt: sanitizeEnglishText(english.prompt),
    options: sanitizeEnglishOptions(english.options, ["", "", "", ""]),
    explanation: sanitizeEnglishText(english.explanation)
  };
  const showChineseAssist = hasBilingualAccess() && state.showChinese === true && hasChinese;
  return {
    mode: showChineseAssist ? "en-zh-assist" : "en-only",
    english: hasEnglish ? english : fallbackEnglish,
    chinese,
    hasChinese,
    showChineseAssist
  };
}

function readLocale(question, locale) {
  const i18n = typeof question?.i18n === "object" && question.i18n ? question.i18n : {};
  const fromLocale = typeof i18n[locale] === "object" && i18n[locale] ? i18n[locale] : {};

  if (locale === "zh") {
    const rootPromptZh = String(question?.prompt_zh || question?.promptZh || "");
    const rootOptionsZh = normalizeOptions(
      [question?.option_a_zh, question?.option_b_zh, question?.option_c_zh, question?.option_d_zh],
      ["", "", "", ""]
    );
    const rootExplanationZh = String(question?.explanation_zh || question?.explanationZh || "");
    return {
      prompt: String(fromLocale.prompt || rootPromptZh || ""),
      options: normalizeOptions(fromLocale.options, rootOptionsZh),
      explanation: String(fromLocale.explanation || rootExplanationZh || ""),
      keyPoint: String(fromLocale.keyPoint || question?.key_point_zh || question?.keyPointZh || ""),
      answerReasoning: String(fromLocale.answerReasoning || question?.answer_reasoning_zh || question?.answerReasoningZh || ""),
      vocab: String(fromLocale.vocab || question?.vocab_zh || question?.vocabZh || ""),
      memoryTip: String(fromLocale.memoryTip || question?.memory_tip_zh || question?.memoryTipZh || "")
    };
  }

  const rootOptionsEn = sanitizeEnglishOptions(
    [question?.option_a_en, question?.option_b_en, question?.option_c_en, question?.option_d_en],
    sanitizeEnglishOptions(question?.options, ["", "", "", ""])
  );
  const localePromptEn = sanitizeEnglishText(fromLocale.prompt || "");
  const localeOptionsEn = sanitizeEnglishOptions(fromLocale.options, rootOptionsEn);
  const localeExplanationEn = sanitizeEnglishText(fromLocale.explanation || "");
  const rootPromptEn = sanitizeEnglishText(question?.prompt_en || question?.promptEn || question?.prompt || "");
  const rootExplanationEn = sanitizeEnglishText(
    question?.explanation_en || question?.explanationEn || question?.explanation || ""
  );
  return {
    prompt: localePromptEn || rootPromptEn || "",
    options: localeOptionsEn,
    explanation: localeExplanationEn || rootExplanationEn || "",
    keyPoint: sanitizeEnglishText(fromLocale.keyPoint || question?.key_point_en || question?.keyPointEn || ""),
    answerReasoning: sanitizeEnglishText(
      fromLocale.answerReasoning || question?.answer_reasoning_en || question?.answerReasoningEn || ""
    ),
    memoryTrick: sanitizeEnglishText(fromLocale.memoryTrick || question?.memory_trick || question?.memoryTrick || "")
  };
}

function hasLocaleText(localePayload) {
  if (!localePayload) return false;
  if (String(localePayload.prompt || "").trim()) return true;
  if (String(localePayload.explanation || "").trim()) return true;
  return (localePayload.options || []).some((item) => String(item || "").trim());
}

function normalizeOptions(options, fallback = ["", "", "", ""]) {
  const safeFallback = Array.isArray(fallback) ? fallback.slice(0, 4).map((item) => String(item || "")) : ["", "", "", ""];
  while (safeFallback.length < 4) safeFallback.push("");

  const list = Array.isArray(options) ? options.slice(0, 4).map((item) => String(item || "")) : [];
  while (list.length < 4) list.push("");
  return list.map((item, idx) => item || safeFallback[idx]);
}

function hasRenderableEnglishSource(question) {
  const en = readLocale(question, "en");
  const promptOk = String(en.prompt || "").trim().length > 0;
  const options = normalizeOptions(en.options, ["", "", "", ""]);
  const optionsOk = options.every((item) => String(item || "").trim().length > 0);
  return promptOk && optionsOk;
}

function hasCjkText(text) {
  return /[\u3400-\u9fff]/.test(String(text || ""));
}

function sanitizeEnglishText(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return hasCjkText(text) ? "" : text;
}

function sanitizeEnglishOptions(options, fallback = ["", "", "", ""]) {
  return normalizeOptions(options, fallback).map((item) => sanitizeEnglishText(item));
}

function renderChineseAssistPanel(view) {
  const showAssist = view.showChineseAssist === true;
  const canSeeExplanation = hasExplanationAccess();
  const canSeeMemoryTips = hasMemoryTipsAccess();
  const explanationText = showAssist
    ? String(view.chinese.explanation || view.english.explanation || "").trim()
    : String(view.english.explanation || view.chinese.explanation || "").trim();
  const keyPointText = showAssist
    ? String(view.chinese.keyPoint || view.english.keyPoint || "").trim()
    : String(view.english.keyPoint || view.chinese.keyPoint || "").trim();
  const vocabText = showAssist ? String(view.chinese.vocab || "").trim() : "";
  const memoryTipText = showAssist
    ? String(view.chinese.memoryTip || view.chinese.answerReasoning || view.english.answerReasoning || "").trim()
    : String(view.english.answerReasoning || view.chinese.answerReasoning || "").trim();
  const memoryTrickText = String(view.english.memoryTrick || "").trim();

  const showExplanationPanel = canSeeExplanation && explanationText.length > 0;
  const showKeyPointPanel = canSeeMemoryTips && keyPointText.length > 0;
  const showVocabPanel = canSeeMemoryTips && vocabText.length > 0;
  const showMemoryTipPanel = canSeeMemoryTips && memoryTipText.length > 0;
  const showMemoryTrickPanel = canSeeMemoryTips && memoryTrickText.length > 0;
  const showSupport =
    showExplanationPanel || showKeyPointPanel || showVocabPanel || showMemoryTipPanel || showMemoryTrickPanel;

  const explanationArticle = supportExplanationZh?.closest("article");
  const keyPointArticle = supportKeyPointZh?.closest("article");
  const vocabArticle = supportVocabZh?.closest("article");
  const memoryTipArticle = supportMemoryTipZh?.closest("article");

  questionLayout?.classList.toggle("bilingual", showAssist);
  questionAssistPane?.classList.toggle("hidden", !showAssist);
  learningSupport?.classList.toggle("hidden", !showSupport);
  explanationArticle?.classList.toggle("hidden", !showExplanationPanel);
  keyPointArticle?.classList.toggle("hidden", !showKeyPointPanel);
  vocabArticle?.classList.toggle("hidden", !showVocabPanel);
  memoryTipArticle?.classList.toggle("hidden", !showMemoryTipPanel);
  supportMemoryTrickWrap?.classList.toggle("hidden", !showMemoryTrickPanel);

  if (!showAssist) {
    if (questionTextZh) questionTextZh.textContent = "";
    if (optionsZhWrap) optionsZhWrap.innerHTML = "";
    if (supportExplanationZh) supportExplanationZh.textContent = "";
    if (supportKeyPointZh) supportKeyPointZh.textContent = "";
    if (supportVocabZh) supportVocabZh.textContent = "";
    if (supportMemoryTipZh) supportMemoryTipZh.textContent = "";
    if (supportMemoryTrick) supportMemoryTrick.textContent = "";
    supportMemoryTrickWrap?.classList.add("hidden");
    return;
  }

  if (questionTextZh) {
    questionTextZh.textContent = view.chinese.prompt || "暂无中文辅助";
  }

  if (optionsZhWrap) {
    const labels = ["A", "B", "C", "D"];
    optionsZhWrap.innerHTML = "";
    view.chinese.options.forEach((opt, idx) => {
      const line = document.createElement("div");
      line.className = "assist-option";
      line.textContent = `${labels[idx]}. ${opt || "--"}`;
      optionsZhWrap.appendChild(line);
    });
  }

  if (supportExplanationZh) {
    supportExplanationZh.textContent = showExplanationPanel ? explanationText : "";
  }
  if (supportKeyPointZh) {
    supportKeyPointZh.textContent = showKeyPointPanel ? keyPointText : "";
  }
  if (supportVocabZh) {
    supportVocabZh.textContent = showVocabPanel ? vocabText : "";
  }
  if (supportMemoryTipZh) {
    supportMemoryTipZh.textContent = showMemoryTipPanel ? memoryTipText : "";
  }
  if (supportMemoryTrick) {
    supportMemoryTrick.textContent = showMemoryTrickPanel ? memoryTrickText : "";
    supportMemoryTrickWrap?.classList.toggle("hidden", !showMemoryTrickPanel);
  }
}

function setSelectPlaceholder(selectEl, text) {
  selectEl.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = text;
  option.selected = true;
  selectEl.appendChild(option);
  selectEl.disabled = true;
}

function startMembershipSync() {
  stopMembershipSync();
  state.syncTimerId = setInterval(() => {
    void syncMembership();
  }, MEMBERSHIP_SYNC_INTERVAL_MS);
  document.addEventListener("visibilitychange", onMembershipVisibilityChange);
  window.addEventListener("focus", onMembershipVisibilityChange);
  void syncMembership();
}

function stopMembershipSync() {
  clearInterval(state.syncTimerId);
  state.syncTimerId = null;
  document.removeEventListener("visibilitychange", onMembershipVisibilityChange);
  window.removeEventListener("focus", onMembershipVisibilityChange);
}

function onMembershipVisibilityChange() {
  if (document.visibilityState && document.visibilityState !== "visible") return;
  void syncMembership();
}

async function syncMembership() {
  if (state.syncInFlight || !state.authToken) return;
  state.syncInFlight = true;

  try {
    const me = await apiFetch("/api/auth/me", { token: state.authToken });
    if (me.role !== "user") {
      clearAuthAndRedirect("/");
      return;
    }
    if (me.user?.plan === "paid") {
      window.location.href = "/member.html";
      return;
    }

    const nextVersion = Number(me.user?.membershipVersion || 1);
    const prevVersion = Number(state.user?.membershipVersion || 1);
    state.user = me.user;
    refreshWelcomeText();
    applyBilingualAccessUI();
    renderLicensingProgressSnapshot();
    renderAccountSettingsCenter();
    updateContinueLearningPanel();
    updateRecentPerformancePanel();
    if (!quizSection.classList.contains("hidden")) {
      renderQuestion();
    }
    if (!resultSection.classList.contains("hidden")) {
      renderReview(state.lastWrongItems);
    }

    if (nextVersion !== prevVersion) {
      state.bank = await apiFetch("/api/question-bank", { token: state.authToken });
      const preferredIndustryId = state.currentIndustryId;
      const preferredExamFamilyKey = state.currentExamFamilyKey;
      const preferredTradeCode = state.currentTradeCode;
      const preferredExamType = state.currentExamType;
      const preferredExamId = state.currentExamId;
      renderIndustryOptions();

      if (preferredIndustryId && Array.from(industrySelect.options).some((opt) => opt.value === preferredIndustryId)) {
        industrySelect.value = preferredIndustryId;
        state.currentIndustryId = preferredIndustryId;
        renderExamFamilyOptions();
      }

      if (
        preferredExamFamilyKey &&
        Array.from(examFamilySelect.options).some((opt) => opt.value === preferredExamFamilyKey)
      ) {
        examFamilySelect.value = preferredExamFamilyKey;
        state.currentExamFamilyKey = preferredExamFamilyKey;
        renderTradeOptions();
      }

      if (preferredTradeCode && Array.from(tradeSelect.options).some((opt) => opt.value === preferredTradeCode)) {
        tradeSelect.value = preferredTradeCode;
        state.currentTradeCode = preferredTradeCode;
        renderExamTypeOptions();
      }

      if (preferredExamType && Array.from(examTypeSelect.options).some((opt) => opt.value === preferredExamType)) {
        examTypeSelect.value = preferredExamType;
        state.currentExamType = preferredExamType;
        syncCurrentExamFromFilters();
      }

      if (preferredExamId && getFilteredExams(getCurrentIndustry()).some((item) => item.id === preferredExamId)) {
        state.currentExamId = preferredExamId;
      }

      if (!hasRunnableTrialContent()) {
        quizSection.classList.add("hidden");
        resultSection.classList.add("hidden");
        showCatalogEmptyState();
      }
      await loadDashboardModules();
      await renderProgress();
    }
    maybeOpenOnboardingWizard();
  } catch {
    clearAuthAndRedirect("/");
  } finally {
    state.syncInFlight = false;
  }
}

function clearAuthAndRedirect(path) {
  stopMembershipSync();
  clearInterval(state.timerId);
  clearAuthToken();
  window.location.href = path;
}

function hasRunnableTrialContent() {
  const exam = getCurrentExam();
  if (!exam) return false;
  return getQuestionsForExamSelection(exam).some(hasRenderableEnglishSource);
}

function showCatalogEmptyState() {
  if (!catalogEmptyState) return;
  catalogEmptyState.innerHTML = `<strong>${escapeHtml(CATALOG_EMPTY_PRIMARY)}</strong><span>${escapeHtml(
    CATALOG_EMPTY_SECONDARY
  )}</span>`;
  catalogEmptyState.classList.remove("hidden");
}

function hideCatalogEmptyState() {
  if (!catalogEmptyState) return;
  catalogEmptyState.classList.add("hidden");
}

async function apiFetch(path, options = {}) {
  const token = options.token || state.authToken || "";
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(resolveApiPath(path), {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`);
  }

  return data;
}

function resolveApiPath(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path}`;
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
