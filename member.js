// ================================================================
// JNONO member.js — 结构索引
// ----------------------------------------------------------------
// [核心逻辑]   L1      常量 / state / TTS / 题型配置
// [Shell UI]   L260    quiz-shell 侧栏控制 (shellEnsureControls 等)
// [补丁-P1]   L665    renderQuestion / submitQuiz 首层 hook
// [核心逻辑]   L832    MEMBERSHIP_PLAN_META / init / bindEvents
// [核心逻辑]   L1561   renderQuestion 主函数
// [权限]       L2114   normalizeMembershipTierValue / getContentPermissions
// [管理UI]     L3000+  账户设置 / 升级弹窗 / 仪表板模块
// [权限函数]   L4307   getContentPermissions / hasBilingualAccess 等
// [补丁-P2]   L5247   renderQuestion clean patch (防重复渲染)
// [补丁-P3]   L5492   renderQuestion round3 hook (计时器同步)
// [补丁-P4]   L5663+  submitQuiz round13/16/18 hooks (结果弹窗)
// ----------------------------------------------------------------
// 待办（考完执照后做）：将 P1-P4 补丁合并进主函数，统一 hook 链
// ================================================================
const AUTH_TOKEN_KEY = "jnono-auth-token-v1";
const API_BASE = /^https?:\/\//i.test(window.location.origin || "") ? window.location.origin : "";
const MEMBERSHIP_SYNC_INTERVAL_MS = 15000;
const CSLB_OFFICIAL_MOCK_DEFAULT = Object.freeze({
  questionCount: 115,
  minutes: 210
});

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
  timerMode: "question",
  timeLeft: 75,
  timerId: null,
  activeMode: "category",
  authToken: "",
  syncTimerId: null,
  syncInFlight: false,
  showChinese: false,
  lastWrongItems: [],
  mockSpec: null,
  dashboardModules: [],
  progressSummary: {},
  courseContents: [],
  activeSideNavKey: "home",
  currentMemberView: "dashboard",
  continueRecommendation: null,
  learningPathState: null,
  onboardingStep: 1,
  sessionSectionCode: "",
  sessionSectionName: "",
  ttsEnabled: false,
  bookmarkedIds: new Set()
};

// --- TTS (Web Speech API) ---
const _tts = {
  _voice: null,
  _ready: false,
  _PREFERRED: [
    "Microsoft Aria Online (Natural) - English (United States)",
    "Microsoft Jenny Online (Natural) - English (United States)",
    "Microsoft Guy Online (Natural) - English (United States)",
    "Microsoft Aria - English (United States)",
    "Google US English",
    "Samantha",
  ],
  _pickVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    for (const name of this._PREFERRED) {
      const v = voices.find(v => v.name === name);
      if (v) return v;
    }
    return voices.find(v => v.lang === "en-US") || null;
  },
  _init() {
    if (this._ready) return;
    const pick = () => { this._voice = this._pickVoice(); this._ready = true; };
    if (window.speechSynthesis.getVoices().length) { pick(); }
    else { window.speechSynthesis.addEventListener("voiceschanged", pick, { once: true }); }
  },
  speak(text) {
    if (!window.speechSynthesis || !text) return;
    this._init();
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.88;
    if (this._voice) utter.voice = this._voice;
    window.speechSynthesis.speak(utter);
  },
  stop() {
    window.speechSynthesis?.cancel();
  },
  _tooltipEl: null,
  showWordTooltip(anchorEl, word) {
    this._tooltipEl?.remove();
    const tip = document.createElement("div");
    tip.id = "_tts_word_tip";
    tip.style.cssText = [
      "position:fixed;z-index:99999;background:#1a1a2e;color:#fff",
      "padding:12px 16px;border-radius:10px;font-size:13px;line-height:1.65",
      "box-shadow:0 6px 20px rgba(0,0,0,0.35);max-width:320px;width:320px;pointer-events:auto",
      "transition:opacity .15s"
    ].join(";");
    tip.innerHTML = `<strong style="font-size:15px">${word}</strong><br><span style="opacity:.6;font-size:12px">查询中…</span>`;
    document.body.appendChild(tip);
    this._tooltipEl = tip;

    const rect = anchorEl.getBoundingClientRect();
    const tw = 320;
    let left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    const top = rect.bottom + 8;
    tip.style.left = left + "px";
    tip.style.top = top + "px";

    const POS_ZH = { n:"名", v:"动", vt:"动", vi:"动", adj:"形", adv:"副", prep:"介", conj:"连", int:"叹", pron:"代", num:"数" };

    fetch(`/api/dict?q=${encodeURIComponent(word)}`)
      .then(r => r.json())
      .then(data => {
        if (!tip.isConnected) return;

        const defs = Array.isArray(data.defs) ? data.defs : [];
        if (!defs.length) {
          tip.innerHTML = `<strong style="font-size:15px">${word}</strong><br><span style="opacity:.5;font-size:12px">未找到释义</span>`;
          return;
        }

        let html = `<strong style="font-size:15px">${word}</strong>`;
        if (data.phonetic) html += `&nbsp;<span style="opacity:.45;font-size:12px">/${data.phonetic}/</span>`;
        html += `<div style="margin-top:7px;border-top:1px solid rgba(255,255,255,.12);padding-top:7px">`;
        defs.forEach((d, i) => {
          const posLabel = POS_ZH[d.pos] || d.pos;
          html += `<div style="margin-bottom:${i < defs.length - 1 ? 6 : 0}px;display:flex;gap:5px;align-items:baseline">`;
          html += `<span style="flex-shrink:0;background:#1e3a5f;color:#94a3b8;font-size:10px;padding:1px 4px;border-radius:3px">${posLabel}</span>`;
          html += `<span style="color:#7dd3fc;font-size:13px">${d.zh}</span>`;
          html += `</div>`;
        });
        html += `</div>`;
        tip.innerHTML = html;
      })
      .catch(() => { if (tip.isConnected) tip.innerHTML = `<strong>${word}</strong><br><span style="opacity:.5">查询失败</span>`; });

    const dismiss = e => { if (!tip.contains(e.target)) { tip.remove(); document.removeEventListener("click", dismiss); } };
    setTimeout(() => document.addEventListener("click", dismiss), 150);
    setTimeout(() => { tip.remove(); document.removeEventListener("click", dismiss); }, 20000);
  }
};

const B_TOPIC_ORDER = [
  "Business Organization / 商业组织",
  "Business Finances / 商业财务",
  "Employment Requirements / 雇佣要求",
  "Bonds, Insurance, and Liens / 保证金、保险与留置权",
  "Contract Requirements and Execution / 合同要求与执行",
  "Licensing Requirements / 执照要求",
  "Safety / 安全规范",
  "Public Works / 公共工程",
  "B Planning & Estimating / B类计划与预算",
  "B Framing & Structural / B类结构与框架施工",
  "B Core Trades (Part 1) / B类核心工种（第1部分）",
  "B Core Trades (Part 2) / B类核心工种（第2部分）",
  "B Finish Trades / B类收尾工种",
  "B Health & Safety / B类健康与安全",
  "B General Building Updates I / B类建筑规范更新 I",
  "B General Building Updates II / B类建筑规范更新 II",
  "Health & Safety Test / 健康与安全测试"
];

const B_TOPIC_RULES = [
  { label: B_TOPIC_ORDER[0], patterns: [/business organization/i, /商业组织/] },
  { label: B_TOPIC_ORDER[1], patterns: [/business finances?/i, /商业财务/, /财务/] },
  { label: B_TOPIC_ORDER[2], patterns: [/employment requirements?/i, /雇佣要求/, /劳工/, /工资/] },
  { label: B_TOPIC_ORDER[3], patterns: [/bonds?, insurance,? and liens?/i, /保证金/, /留置权/, /保险/] },
  { label: B_TOPIC_ORDER[4], patterns: [/contract requirements?/i, /execution/i, /合同要求/, /合同/, /变更订单/] },
  { label: B_TOPIC_ORDER[5], patterns: [/licensing requirements?/i, /执照要求/, /\blicense\b/i] },
  { label: B_TOPIC_ORDER[6], patterns: [/\bsafety\b/i, /安全规范/, /OSHA/i] },
  { label: B_TOPIC_ORDER[7], patterns: [/public works?/i, /公共工程/] },
  { label: B_TOPIC_ORDER[8], patterns: [/planning\s*&\s*estimating/i, /计划与预算/, /估算/] },
  { label: B_TOPIC_ORDER[9], patterns: [/framing\s*&\s*structural/i, /结构与框架/, /框架施工/, /结构/] },
  { label: B_TOPIC_ORDER[10], patterns: [/core trades?.*part\s*1/i, /核心工种（?第? ?1 ?部分）?/] },
  { label: B_TOPIC_ORDER[11], patterns: [/core trades?.*part\s*2/i, /核心工种（?第? ?2 ?部分）?/] },
  { label: B_TOPIC_ORDER[12], patterns: [/finish trades?/i, /收尾工种/] },
  { label: B_TOPIC_ORDER[13], patterns: [/b health\s*&\s*safety/i, /B类健康与安全/] },
  { label: B_TOPIC_ORDER[14], patterns: [/general building updates?\s*i\b/i, /建筑规范更新\s*I/i, /更新\s*I/i] },
  { label: B_TOPIC_ORDER[15], patterns: [/general building updates?\s*ii\b/i, /建筑规范更新\s*II/i, /更新\s*II/i] },
  { label: B_TOPIC_ORDER[16], patterns: [/health\s*&\s*safety test/i, /健康与安全测试/] }
];

const welcomeText = document.getElementById("welcomeText");
const logoutBtn = document.getElementById("logoutBtn");
const practiceMode = document.getElementById("practiceMode");
const industrySelect = document.getElementById("industrySelect");
const examFamilySelect = document.getElementById("examFamilySelect");
const tradeSelect = document.getElementById("tradeSelect");
const examTypeSelect = document.getElementById("examTypeSelect");
const topicSelect = document.getElementById("topicSelect");
const countSelect = document.getElementById("countSelect");
const topicLabel = document.getElementById("topicLabel");
const countLabel = document.getElementById("countLabel");
const mockPresetLabel = document.getElementById("mockPresetLabel");
const mockPresetInput = document.getElementById("mockPresetInput");
const timedMode = document.getElementById("timedMode");
const timedModeText = document.getElementById("timedModeText");
const bilingualToggleWrap = document.getElementById("bilingualToggleWrap");
const showChineseToggle = document.getElementById("showChineseToggle");
const startBtn = document.getElementById("startBtn");
const wrongBookBtn = document.getElementById("wrongBookBtn");
const starBookBtn = document.getElementById("starBookBtn");
const bookmarkBtn = document.getElementById("bookmarkBtn");
const quizShellBookmarkBtn = document.getElementById("quizShellBookmarkBtn");
const resetProgressBtn = document.getElementById("resetProgressBtn");
const catalogEmptyState = document.getElementById("catalogEmptyState");

const quizSection = document.getElementById("quizSection");
const resultSection = document.getElementById("resultSection");
const quizTitle = document.getElementById("quizTitle");
const quizMeta = document.getElementById("quizMeta");
const questionTypeTag = document.getElementById("questionTypeTag");
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
const timerLabel = document.getElementById("timerLabel");
const timerEl = document.getElementById("timer");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");

const scoreText = document.getElementById("scoreText");
const rightText = document.getElementById("rightText");
const wrongText = document.getElementById("wrongText");
const reviewBtn = document.getElementById("reviewBtn");
const reviewList = document.getElementById("reviewList");
const progressCards = document.getElementById("progressCards");
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
const accountCurrentPassword = document.getElementById("accountCurrentPassword");
const accountNewPassword = document.getElementById("accountNewPassword");
const accountConfirmPassword = document.getElementById("accountConfirmPassword");
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
const practiceContextTypeBadge = document.getElementById("practiceContextTypeBadge");
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

init();


// QUIZ SHELL HOOKS START

// ===== Quiz Shell DOM =====
const quizShellOverlay = document.getElementById("quizShellOverlay");
const quizShellMain = document.getElementById("quizShellMain");
const quizShellSide = document.getElementById("quizShellSide");
const quizShellTitle = document.getElementById("quizShellTitle");
const quizShellMeta = document.getElementById("quizShellMeta");
const quizShellTimerLabel = document.getElementById("quizShellTimerLabel");
const quizShellTimer = document.getElementById("quizShellTimer");

const _quizSection = document.getElementById("quizSection");
const _questionCard = _quizSection?.querySelector(".question-card") || null;
const _questionLayout = document.getElementById("questionLayout");
const _questionAssistPane = document.getElementById("questionAssistPane");
const _learningSupport = document.getElementById("learningSupport");
const _timerWrap = document.getElementById("timerWrap");
const _timerLabel = document.getElementById("timerLabel");
const _timerEl = document.getElementById("timer");

let _quizShellMirrorTimer = null;

function shellCanChinese() {
  try {
    return typeof hasBilingualAccess === "function" ? hasBilingualAccess() : true;
  } catch {
    return true;
  }
}

function shellCanAi() {
  try {
    if (typeof hasExplanationAccess === "function" && hasExplanationAccess()) return true;
    if (typeof hasMemoryTipsAccess === "function" && hasMemoryTipsAccess()) return true;
  } catch {}
  return false;
}

function shellEnsureControls() {
  if (!quizShellSide) return;

  let controls = document.getElementById("quizShellAssistControls");
  if (!controls) {
    controls = document.createElement("div");
    controls.id = "quizShellAssistControls";
    controls.innerHTML = `
      <div class="quiz-shell-top-toggles" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
        <button type="button" class="btn" id="quizShellChineseToggleBtn">中文辅助：OFF</button>
        <button type="button" class="btn" id="quizShellAiToggleBtn">AI辅助：OFF</button>
        <button type="button" class="btn" id="quizShellTtsToggleBtn"><span class="tts-btn-icon">🔊</span><span class="tts-btn-label"> 读题: OFF</span></button>
      </div>
      <div class="quiz-shell-tabs" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
        <button type="button" class="btn" id="quizShellTabChinese">中文辅助</button>
        <button type="button" class="btn" id="quizShellTabExplanation">解析</button>
        <button type="button" class="btn" id="quizShellTabMemory">记忆技巧</button>
      </div>
    `;
    quizShellSide.prepend(controls);

    document.getElementById("quizShellChineseToggleBtn")?.addEventListener("click", () => {
      if (!shellCanChinese()) return;
      state.showChinese = !state.showChinese;
      if (typeof renderQuestion === "function") renderQuestion();
      shellSyncControls();
      shellRenderAssistMode();
    });

    document.getElementById("quizShellAiToggleBtn")?.addEventListener("click", () => {
      if (!shellCanAi()) return;
      state.showAiAssist = !state.showAiAssist;
      if (typeof renderQuestion === "function") renderQuestion();
      shellSyncControls();
      shellRenderAssistMode();
    });

    document.getElementById("quizShellTtsToggleBtn")?.addEventListener("click", () => {
      state.ttsEnabled = !state.ttsEnabled;
      shellSyncControls();
      if (!state.ttsEnabled) {
        _tts.stop();
      }
      if (typeof renderQuestion === "function") renderQuestion();
    });

    document.getElementById("quizShellTabChinese")?.addEventListener("click", () => {
      state.quizShellTab = "chinese";
      shellRenderAssistMode();
    });

    document.getElementById("quizShellTabExplanation")?.addEventListener("click", () => {
      state.quizShellTab = "explanation";
      shellRenderAssistMode();
    });

    document.getElementById("quizShellTabMemory")?.addEventListener("click", () => {
      state.quizShellTab = "memory";
      shellRenderAssistMode();
    });
  }

  if (!state.quizShellTab) {
    state.quizShellTab = "chinese";
  }

  shellSyncControls();
  // [jnono-phaseB] Move toggle buttons to header (runs once when controls first created)
  try {
    var _hdr = document.querySelector(".quiz-shell-header-right");
    var _zh = document.getElementById("quizShellChineseToggleBtn");
    var _ai = document.getElementById("quizShellAiToggleBtn");
    var _ttsBtn = document.getElementById("quizShellTtsToggleBtn");
    var _exit = document.getElementById("quizShellExitBtn");
    if (_hdr && _zh && _ai && _zh.parentElement !== _hdr) {
      _zh.classList.add("jnono-header-toggle");
      _ai.classList.add("jnono-header-toggle");
      if (_ttsBtn) _ttsBtn.classList.add("jnono-header-toggle");
      if (_exit) {
        _hdr.insertBefore(_zh, _exit);
        _hdr.insertBefore(_ai, _exit);
        if (_ttsBtn) _hdr.insertBefore(_ttsBtn, _exit);
      } else {
        _hdr.appendChild(_zh);
        _hdr.appendChild(_ai);
        if (_ttsBtn) _hdr.appendChild(_ttsBtn);
      }
      var _old = document.querySelector(".quiz-shell-top-toggles");
      if (_old) _old.style.display = "none";
      console.log("[jnono-phaseB] toggle buttons moved to header");
    }
  } catch(e) { console.warn("[jnono-phaseB] move failed", e); }
  shellRenderAssistMode();
}

function shellSyncControls() {
  const chineseBtn = document.getElementById("quizShellChineseToggleBtn");
  const aiBtn = document.getElementById("quizShellAiToggleBtn");

  if (chineseBtn) {
    if (!shellCanChinese()) {
      chineseBtn.style.display = "none";
    } else {
      chineseBtn.style.display = "";
      chineseBtn.textContent = `中: ${state.showChinese ? "ON" : "OFF"}`;
    }
  }

  if (aiBtn) {
    if (!shellCanAi()) {
      aiBtn.style.display = "none";
    } else {
      aiBtn.style.display = "";
      aiBtn.textContent = `AI: ${state.showAiAssist ? "ON" : "OFF"}`;
    }
  }

  const ttsBtn = document.getElementById("quizShellTtsToggleBtn");
  if (ttsBtn) {
    if (!hasTtsAccess()) {
      ttsBtn.style.display = "none";
      state.ttsEnabled = false;
    } else {
      ttsBtn.style.display = "";
      const lbl = ttsBtn.querySelector(".tts-btn-label");
      if (lbl) lbl.textContent = ` 读题: ${state.ttsEnabled ? "ON" : "OFF"}`;
      ttsBtn.classList.toggle("primary", !!state.ttsEnabled);
    }
  }
}



function shellRenderAssistMode() {
  const tabChinese = document.getElementById("quizShellTabChinese");
  const tabExplanation = document.getElementById("quizShellTabExplanation");
  const tabMemory = document.getElementById("quizShellTabMemory");

  const explanationArticle = typeof supportExplanationZh !== "undefined" ? supportExplanationZh?.closest("article") : null;
  const keyPointArticle = typeof supportKeyPointZh !== "undefined" ? supportKeyPointZh?.closest("article") : null;
  const vocabArticle = typeof supportVocabZh !== "undefined" ? supportVocabZh?.closest("article") : null;
  const memoryTipArticle = typeof supportMemoryTipZh !== "undefined" ? supportMemoryTipZh?.closest("article") : null;
  const memoryTrickWrap = typeof supportMemoryTrickWrap !== "undefined" ? supportMemoryTrickWrap : null;

  const canChinese = shellCanChinese() && !!state.showChinese;
  const canAi = shellCanAi() && !!state.showAiAssist;

  if (_questionAssistPane) {
    _questionAssistPane.classList.toggle("hidden", !(canChinese && state.quizShellTab === "chinese"));
  }

  if (_learningSupport) {
    _learningSupport.classList.toggle("hidden", !canAi);
  }

  if (tabChinese) {
    tabChinese.style.display = shellCanChinese() ? "" : "none";
    tabChinese.classList.toggle("primary", state.quizShellTab === "chinese");
  }

  if (tabExplanation) {
    tabExplanation.style.display = shellCanAi() ? "" : "none";
    tabExplanation.classList.toggle("primary", state.quizShellTab === "explanation");
  }

  if (tabMemory) {
    tabMemory.style.display = shellCanAi() ? "" : "none";
    tabMemory.classList.toggle("primary", state.quizShellTab === "memory");
  }

  if (!canAi) {
    explanationArticle?.classList.add("hidden");
    keyPointArticle?.classList.add("hidden");
    vocabArticle?.classList.add("hidden");
    memoryTipArticle?.classList.add("hidden");
    memoryTrickWrap?.classList.add("hidden");
    return;
  }

  if (state.quizShellTab === "explanation") {
    explanationArticle?.classList.remove("hidden");
    keyPointArticle?.classList.remove("hidden");
    vocabArticle?.classList.add("hidden");
    memoryTipArticle?.classList.add("hidden");
    memoryTrickWrap?.classList.add("hidden");
  } else if (state.quizShellTab === "memory") {
    explanationArticle?.classList.add("hidden");
    keyPointArticle?.classList.add("hidden");
    vocabArticle?.classList.remove("hidden");
    memoryTipArticle?.classList.remove("hidden");
    memoryTrickWrap?.classList.remove("hidden");
  } else {
    explanationArticle?.classList.add("hidden");
    keyPointArticle?.classList.add("hidden");
    vocabArticle?.classList.add("hidden");
    memoryTipArticle?.classList.add("hidden");
    memoryTrickWrap?.classList.add("hidden");
  }
}

function shellSyncHeader() {
  const qt = document.getElementById("quizTitle");
  const qm = document.getElementById("quizMeta");

  if (qt && quizShellTitle) quizShellTitle.textContent = qt.textContent || "练习中";
  if (qm && quizShellMeta) quizShellMeta.textContent = qm.textContent || "";

  if (_timerLabel && quizShellTimerLabel) {
    quizShellTimerLabel.textContent = _timerLabel.textContent || "剩余";
  }
  if (_timerEl && quizShellTimer) {
    quizShellTimer.textContent = _timerEl.textContent || "00:00";
  }
}

function startQuizShellMirror() {
  stopQuizShellMirror();
  shellSyncHeader();
  _quizShellMirrorTimer = setInterval(shellSyncHeader, 200);
}

function stopQuizShellMirror() {
  if (_quizShellMirrorTimer) {
    clearInterval(_quizShellMirrorTimer);
    _quizShellMirrorTimer = null;
  }
}

function mountQuizShellParts() {
  if (_questionLayout && quizShellMain && _questionLayout.parentElement !== quizShellMain) {
    quizShellMain.appendChild(_questionLayout);
  }

  if (_questionAssistPane && quizShellSide && _questionAssistPane.parentElement !== quizShellSide) {
    quizShellSide.appendChild(_questionAssistPane);
    if (state.showChinese) {
      _questionAssistPane.classList.remove("hidden");
    }
  }

  if (_learningSupport && quizShellSide && _learningSupport.parentElement !== quizShellSide) {
    quizShellSide.appendChild(_learningSupport);
    if (state.showAiAssist) {
      _learningSupport.classList.remove("hidden");
    }
  }
}

function restoreQuizShellParts() {
  if (_questionLayout && _questionCard && _questionLayout.parentElement !== _questionCard) {
    _questionCard.appendChild(_questionLayout);
  }

  if (_questionAssistPane && _questionLayout && _questionAssistPane.parentElement !== _questionLayout) {
    _questionLayout.appendChild(_questionAssistPane);
  }

  if (_learningSupport && _questionCard && _learningSupport.parentElement !== _questionCard) {
    _questionCard.appendChild(_learningSupport);
  }
}

function openQuizShell() {
  if (!quizShellOverlay) return;

  quizShellOverlay.classList.add("active");
  quizShellOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("quiz-shell-open");

  const practiceView = document.getElementById("memberViewPractice");
  if (practiceView) practiceView.style.display = "none";

  mountQuizShellParts();
  shellEnsureControls();
  shellSyncHeader();
  startQuizShellMirror();
}

function closeQuizShell() {
  if (!quizShellOverlay) return;

  stopQuizShellMirror();
  quizShellOverlay.classList.remove("active");
  quizShellOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("quiz-shell-open");
  // [jnono-round4] when exiting overlay, force-hide quiz/result DOM slots so they dont leak on mobile
  try {
    var _qs = document.getElementById("quizSection");
    if (_qs) _qs.classList.add("hidden");
    var _rs = document.getElementById("resultSection");
    if (_rs) _rs.classList.add("hidden");
  } catch (e) {}

  const practiceView = document.getElementById("memberViewPractice");
  if (practiceView) practiceView.style.display = "";

  restoreQuizShellParts();
}

document.getElementById("quizShellExitBtn")?.addEventListener("click", () => {
  closeQuizShell();
});

document.getElementById("quizShellSubmitBtn")?.addEventListener("click", () => {
  void submitQuiz(false);
});

document.getElementById("quizShellSubmitBtnBottom")?.addEventListener("click", () => {
  void submitQuiz(false);
});

document.getElementById("quizShellPrevBtn")?.addEventListener("click", () => moveQuestion(-1));
document.getElementById("quizShellNextBtn")?.addEventListener("click", () => moveQuestion(1));

// 开始训练后自动打开壳子
const _onStartClick_original = onStartClick;
onStartClick = async function() {
  await _onStartClick_original();
  openQuizShell();
};

const _startCategoryQuiz_original = startCategoryQuiz;
startCategoryQuiz = async function(useWrongBook) {
  await _startCategoryQuiz_original(useWrongBook);
  openQuizShell();
};

const _renderQuestion_original = renderQuestion;
renderQuestion = function(...args) {
  const result = _renderQuestion_original.apply(this, args);

  if (quizShellOverlay?.classList.contains("active")) {
    mountQuizShellParts();
    shellEnsureControls();
    shellSyncHeader();
    shellRenderAssistMode();
  }

  return result;
};

const _submitQuiz_original = submitQuiz;
submitQuiz = async function(isAutoSubmit) {
  await _submitQuiz_original(isAutoSubmit);
  // [jnono-round13] Mock mode: modal dialog shows (handled by round13 hook)
  // [jnono-round16] Category/wrong-book mode: move resultSection into shell so user SEES the score
  try {
    var mode = (typeof state !== "undefined" && state && state.activeMode) || "";
    console.log("[jnono-round16] submitQuiz done, mode=" + mode);
    if (mode !== "mock") {
      var result = document.getElementById("resultSection");
      var shellMain = document.getElementById("quizShellMain");
      var quizSec = document.getElementById("quizSection");
      if (result && shellMain) {
        // Hide the question section inside shell, show result instead
        if (quizSec) quizSec.classList.add("hidden");
        result.classList.remove("hidden");
        if (result.parentElement !== shellMain) {
          result.dataset.jnonoRound16Original = "memberViewPractice";
          shellMain.appendChild(result);
        }
        // Scroll shell to top so user sees the score
        shellMain.scrollTop = 0;
        console.log("[jnono-round16] result section moved into shell");

        // [jnono-round17+18] Force-enable chinese & ai assist permanently (until shell closes)
        // so category/wrong-book mode shows SAME tier-based content as mock mode.
        // Do NOT restore afterwards - if any subsequent renderReview fires, it will use the same state.
        try {
          if (typeof renderReview === "function" && state.lastWrongItems) {
            state.showChinese = true;
            state.showAiAssist = true;
            renderReview(state.lastWrongItems);
            console.log("[jnono-round18] review rendered, state forced ON, wrongCount=" + state.lastWrongItems.length);
          }
        } catch (e) {
          console.warn("[jnono-round18] review render failed", e);
        }

        // [jnono-round18] Hide questionLayout inside shell so result page gets full space
        try {
          var qLayout = document.getElementById("questionLayout");
          if (qLayout) {
            qLayout.dataset.jnonoRound18Hidden = "1";
            qLayout.style.display = "none";
          }
        } catch (e) {}

        // [jnono-round18] Add class so CSS allows scrolling inside shell for long review content
        try {
          shellMain.classList.add("jnono-showing-result");
        } catch (e) {}
      }
    }
  } catch (e) {
    console.warn("[jnono-round16] result move failed", e);
  }
};

// [jnono-round16] Restore resultSection back to its original place when shell closes,
// so the next training session starts fresh
(function () {
  "use strict";
  function installCloseHook() {
    if (typeof closeQuizShell !== "function") { setTimeout(installCloseHook, 500); return; }
    if (closeQuizShell.__jnonoRound16Hooked) return;
    var original = closeQuizShell;
    window.closeQuizShell = function () {
      try {
        var result = document.getElementById("resultSection");
        var practiceView = document.getElementById("memberViewPractice");
        if (result && practiceView && result.dataset.jnonoRound16Original === "memberViewPractice") {
          if (result.parentElement !== practiceView) {
            practiceView.appendChild(result);
          }
          result.classList.add("hidden");
          delete result.dataset.jnonoRound16Original;
        }
        // [jnono-round18] Restore questionLayout display for next session
        var qLayout = document.getElementById("questionLayout");
        if (qLayout && qLayout.dataset.jnonoRound18Hidden === "1") {
          qLayout.style.display = "";
          delete qLayout.dataset.jnonoRound18Hidden;
        }
        // [jnono-round18] Remove scroll class from shellMain
        var shellMain = document.getElementById("quizShellMain");
        if (shellMain) shellMain.classList.remove("jnono-showing-result");
      } catch (e) {
        console.warn("[jnono-round16+18] restore failed", e);
      }
      return original.apply(this, arguments);
    };
    window.closeQuizShell.__jnonoRound16Hooked = true;
    console.log("[jnono-round16] closeQuizShell hook installed");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installCloseHook);
  } else {
    installCloseHook();
  }
})();

// QUIZ SHELL HOOKS END


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
    benefits: ["包含 Pro 全部", "Continue Learning 智能推荐", "读题朗读 + 单词翻译", "弱项强化推荐"]
  }
});

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
    if (me.user.plan !== "paid") {
      window.location.href = "/trial.html";
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
    onModeChange();
    startMembershipSync();
    await renderProgress();
    await loadSessionFromServer();
    await loadAccountProfile({ silent: true });
    renderAccountSettingsCenter();
    setMemberView("dashboard", { scroll: false });
    syncMemberSideNavActive();
    maybeOpenOnboardingWizard();
  } catch {
    clearAuthToken();
    window.location.href = "/";
  }
}

function bindEvents() {
  logoutBtn.addEventListener("click", onLogout);

  practiceMode.addEventListener("change", onModeChange);
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
  examTypeSelect.addEventListener("change", async () => {
    state.currentExamType = examTypeSelect.value;
    syncCurrentExamFromFilters();
    renderTopicOptions();
    refreshMockPresetInfo();
    updatePracticeContext();
    await renderProgress();
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

  startBtn.addEventListener("click", () => {
    void onStartClick();
  });
  wrongBookBtn.addEventListener("click", () => {
    void startCategoryQuiz(true);
  });
  starBookBtn?.addEventListener("click", () => {
    void startBookmarkQuiz();
  });
  bookmarkBtn?.addEventListener("click", () => {
    void toggleBookmark();
  });
  quizShellBookmarkBtn?.addEventListener("click", () => {
    void toggleBookmark();
  });
  // 首页"下一步训练"卡的刷错题直达入口
  document.getElementById("continueWrongBookBtn")?.addEventListener("click", () => {
    if (practiceMode && practiceMode.value === "mock") {
      practiceMode.value = "category";
      onModeChange();
    }
    jumpToTrainingSection("practice");
    if (getCurrentExam()) {
      void startCategoryQuiz(true);
    }
  });
  // 首页"下一步训练"卡的刷收藏直达入口
  document.getElementById("continueStarBookBtn")?.addEventListener("click", () => {
    if (practiceMode && practiceMode.value === "mock") {
      practiceMode.value = "category";
      onModeChange();
    }
    if (getCurrentExam()) {
      void startBookmarkQuiz();
    } else {
      jumpToTrainingSection("practice");
    }
  });
  prevBtn.addEventListener("click", () => moveQuestion(-1));
  nextBtn.addEventListener("click", () => moveQuestion(1));
  submitBtn.addEventListener("click", () => {
    void submitQuiz(false);
  });
  reviewBtn.addEventListener("click", () => reviewList.classList.toggle("hidden"));
  resetProgressBtn.addEventListener("click", () => {
    void resetProgress();
  });
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
  for (const button of summaryContinueBtns) {
    button.addEventListener("click", onContinueLearningClick);
  }
  learningPathActionBtn?.addEventListener("click", onLearningPathActionClick);
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
  clearTimers();
  try {
    await apiFetch("/api/auth/logout", { method: "POST", token: state.authToken, body: {} });
  } catch {}
  clearAuthToken();
  window.location.href = "/";
}

function onModeChange() {
  const isMock = practiceMode.value === "mock";

  topicLabel.classList.toggle("hidden", isMock);
  countLabel.classList.toggle("hidden", isMock);
  mockPresetLabel?.classList.toggle("hidden", !isMock);

  startBtn.textContent = isMock ? "开始模拟考试" : "开始分项训练";

  if (isMock) {
    timedMode.checked = true;
    timedMode.disabled = true;
    timedModeText.textContent = "官方模拟总时长计时";
  } else {
    timedMode.disabled = false;
    timedModeText.textContent = "计时模式（每题 75 秒）";
  }

  refreshMockPresetInfo();
  state.timerEnabled = timedMode.checked;
  updateActionButtons();
  updatePracticeContext();
  if (state.currentMemberView === "practice") {
    setMemberSideNavActive(isMock ? "mock" : "practice");
  }
}

function getPracticeModeLabel() {
  return practiceMode?.value === "mock" ? "模拟考试" : "分项练习";
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
  if (practiceContextTypeBadge) {
    const examType = getCurrentExamType();
    if (examType) {
      practiceContextTypeBadge.textContent = examTypeLabel(examType);
      practiceContextTypeBadge.className = `exam-type-badge exam-type-badge--${examType === "law_business" ? "law" : "trade"}`;
      practiceContextTypeBadge.classList.remove("hidden");
    } else {
      practiceContextTypeBadge.textContent = "";
      practiceContextTypeBadge.classList.add("hidden");
    }
  }
  updateSummaryStrip();
}

function setSummaryText(nodes, value) {
  const text = String(value || "").trim() || "--";
  for (const node of nodes) {
    node.textContent = text;
  }
}

function setSummaryState(nodes, stateName) {
  for (const node of nodes) {
    if (!node) continue;
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
  let rawPercent = Number(progress.studyProgressPercent);
  if (!Number.isFinite(rawPercent)) {
    const recent = getRecentProgressCandidate();
    rawPercent = Number(recent?.item?.percent);
  }
  const progressText = Number.isFinite(rawPercent) ? `${Math.max(0, Math.min(100, Math.round(rawPercent)))}%` : "--";
  const progressLevel =
    Number.isFinite(rawPercent) && rawPercent >= 70 ? "good" : Number.isFinite(rawPercent) && rawPercent >= 1 ? "warn" : "";

  setSummaryText(summaryExamEls, getCurrentExamLabel());
  setSummaryText(summaryProgressEls, progressText);
  setSummaryText(summarySubmittedEls, submitted ? "已提交" : "未提交");
  setSummaryText(summaryScheduledEls, scheduled ? "已预约" : "未预约");
  setSummaryState(summaryProgressEls, progressLevel);
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
    if (practiceMode) {
      practiceMode.value = "category";
      onModeChange();
    }
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

async function onStartClick() {
  if (practiceMode.value === "mock") {
    startMockExam();
  } else {
    await startCategoryQuiz(false);
  }
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
  return examType === "law_business" ? "法律考试" : "技术考试";
}

function getCurrentExamType() {
  const exam = getCurrentExam();
  return exam ? resolveExamType(exam) : null;
}

function findExamById(examId) {
  const code = String(examId || "").trim();
  if (!code) return null;
  for (const industry of state.bank?.industries || []) {
    for (const exam of industry?.exams || []) {
      if (String(exam?.id || "").trim() === code) {
        return { industry, exam };
      }
    }
  }
  return null;
}

function normalizeExamCodeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");
}

function getQuestionCategoryCode(question, examId = "") {
  const raw =
    question?.categoryCode ||
    question?.category_code ||
    question?.questionCategory ||
    question?.question_category ||
    "";
  const code = String(raw || "")
    .trim()
    .toUpperCase();
  if (code) return code;
  const normalizedExamCode = normalizeExamCodeValue(examId || question?.examCode || question?.exam_id || "");
  if (!normalizedExamCode) return "UNCATEGORIZED";
  return `${normalizedExamCode}__UNCATEGORIZED`.toUpperCase();
}

function getExamCategories(exam) {
  if (!exam || !Array.isArray(exam.categories)) return [];
  return exam.categories.filter((item) => item && item.isActive !== false);
}

function getExamCategoryName(exam, categoryCode) {
  const code = String(categoryCode || "").trim().toUpperCase();
  if (!code) return "UNCATEGORIZED";
  const hit = getExamCategories(exam).find(
    (item) => String(item?.code || "").trim().toUpperCase() === code
  );
  return String(hit?.name || code).trim() || code;
}

function getQuestionsForMockExam(exam) {
  if (!exam || !Array.isArray(exam.questions)) return [];
  const byCode = new Map();
  for (const industry of state.bank?.industries || []) {
    for (const item of industry?.exams || []) {
      const code = normalizeExamCodeValue(item?.examCode || item?.id);
      if (!code) continue;
      byCode.set(code, item);
    }
  }
  const targetCodes = new Set([normalizeExamCodeValue(exam.examCode || exam.id)]);
  for (const code of exam?.includedExamCodes || []) {
    const normalized = normalizeExamCodeValue(code);
    if (normalized) targetCodes.add(normalized);
  }

  const picked = [];
  const seen = new Set();
  for (const code of targetCodes) {
    const sourceExam = byCode.get(code);
    if (!sourceExam || !Array.isArray(sourceExam.questions)) continue;
    for (const q of sourceExam.questions) {
      if (!hasRenderableEnglishSource(q)) continue;
      const key = `${normalizeExamCodeValue(sourceExam.examCode || sourceExam.id)}::${String(q.id || q.question_id || "").trim()}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      picked.push(q);
    }
  }
  return picked;
}

function renderIndustryOptions(preferredIndustryId, preferredExamFamilyKey, preferredTradeCode, preferredExamType, preferredExamId) {
  const industries = getAvailableIndustries();
  industrySelect.innerHTML = "";

  if (!industries.length) {
    state.currentIndustryId = null;
    state.currentExamFamilyKey = null;
    state.currentTradeCode = null;
    state.currentExamType = null;
    state.currentExamId = null;
    setSelectPlaceholder(industrySelect, "暂无可用题库");
    setSelectPlaceholder(examFamilySelect, "暂无可用 license type");
    setSelectPlaceholder(tradeSelect, "暂无可用 specialization");
    const expiredHint = getExpiredCategoryKeys().some((item) => item !== "双语");
    setSelectPlaceholder(examTypeSelect, expiredHint ? "分类权限已过期，请联系管理员续费" : "请联系管理员开通分类权限");
    setSelectPlaceholder(topicSelect, "暂无题型");
    showCatalogEmptyState();
    updateActionButtons();
    updatePracticeContext();
    return;
  }

  hideCatalogEmptyState();
  for (const item of industries) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    industrySelect.appendChild(option);
  }
  industrySelect.disabled = false;

  const selectionFromExam = findExamById(preferredExamId);
  const nextIndustryId = preferredIndustryId || selectionFromExam?.industry?.id || "";
  if (nextIndustryId && industries.some((item) => item.id === nextIndustryId)) {
    industrySelect.value = nextIndustryId;
  }
  state.currentIndustryId = industrySelect.value || industries[0].id;
  renderExamFamilyOptions(
    preferredExamFamilyKey || String(selectionFromExam?.exam?.examFamilyKey || "").trim(),
    preferredTradeCode || resolveTradeCode(selectionFromExam?.exam),
    preferredExamType || resolveExamType(selectionFromExam?.exam),
    preferredExamId
  );
  updatePracticeContext();
}

function renderExamFamilyOptions(preferredExamFamilyKey, preferredTradeCode, preferredExamType, preferredExamId) {
  const industry = getCurrentIndustry();
  examFamilySelect.innerHTML = "";

  if (!industry || !industry.exams.length) {
    state.currentExamFamilyKey = null;
    setSelectPlaceholder(examFamilySelect, "暂无可用 license type");
    renderTradeOptions(preferredTradeCode, preferredExamType, preferredExamId);
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

  if (preferredExamFamilyKey && families.some((item) => item.key === preferredExamFamilyKey)) {
    examFamilySelect.value = preferredExamFamilyKey;
  }
  state.currentExamFamilyKey = examFamilySelect.value || families[0].key;
  renderTradeOptions(preferredTradeCode, preferredExamType, preferredExamId);
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

function renderTradeOptions(preferredTradeCode, preferredExamType, preferredExamId) {
  const industry = getCurrentIndustry();
  tradeSelect.innerHTML = "";
  const exams = getFamilyFilteredExams(industry);

  if (!industry || !exams.length) {
    state.currentTradeCode = null;
    setSelectPlaceholder(tradeSelect, "暂无可用 specialization");
    renderExamTypeOptions(preferredExamType, preferredExamId);
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

  if (preferredTradeCode !== undefined && Array.from(tradeSelect.options).some((opt) => opt.value === preferredTradeCode)) {
    tradeSelect.value = preferredTradeCode;
  }
  state.currentTradeCode = tradeSelect.value || "";
  renderExamTypeOptions(preferredExamType, preferredExamId);
}

function renderExamTypeOptions(preferredExamType, preferredExamId) {
  const industry = getCurrentIndustry();
  examTypeSelect.innerHTML = "";
  const exams = getExamsForCurrentSpecialization(industry);

  if (!industry || !exams.length) {
    state.currentExamType = null;
    state.currentExamId = null;
    setSelectPlaceholder(examTypeSelect, "暂无可用 exam type");
    setSelectPlaceholder(topicSelect, "暂无题型");
    updateActionButtons();
    return;
  }

  const examTypes = [];
  const seen = new Set();
  for (const exam of exams) {
    const examType = resolveExamType(exam);
    if (seen.has(examType)) continue;
    seen.add(examType);
    examTypes.push(examType);
  }
  examTypes.sort((a, b) => {
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

  if (preferredExamType && examTypes.includes(preferredExamType)) {
    examTypeSelect.value = preferredExamType;
  }
  state.currentExamType = examTypeSelect.value || examTypes[0];
  syncCurrentExamFromFilters(preferredExamId);
  renderTopicOptions();
  refreshMockPresetInfo();
  updateActionButtons();
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

function syncCurrentExamFromFilters(preferredExamId = "") {
  const industry = getCurrentIndustry();
  const exams = getFilteredExams(industry);
  if (!industry || !exams.length) {
    state.currentExamId = null;
    updatePracticeContext();
    return;
  }
  if (preferredExamId && exams.some((item) => item.id === preferredExamId)) {
    state.currentExamId = preferredExamId;
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

function renderTopicOptions() {
  const exam = getCurrentExam();
  topicSelect.innerHTML = "";

  if (!exam) {
    setSelectPlaceholder(topicSelect, "暂无题型");
    updateActionButtons();
    return;
  }

  const baseQuestions = (Array.isArray(exam.questions) ? exam.questions : []).filter((q) => q && (q.id || q.question_id));
  const countByCategory = new Map();
  for (const q of baseQuestions) {
    const code = getQuestionCategoryCode(q, exam.id);
    countByCategory.set(code, (countByCategory.get(code) || 0) + 1);
  }

  const all = document.createElement("option");
  all.value = "all";
  all.textContent = `全部分类 (${baseQuestions.length})`;
  topicSelect.appendChild(all);

  const categories = getExamCategories(exam).slice().sort((a, b) => {
    const sa = Number(a?.sortOrder ?? 1000);
    const sb = Number(b?.sortOrder ?? 1000);
    if (sa !== sb) return sa - sb;
    return String(a?.code || "").localeCompare(String(b?.code || ""), "en");
  });
  const renderedCodes = new Set();
  for (const category of categories) {
    const code = String(category?.code || "").trim().toUpperCase();
    if (!code) continue;
    renderedCodes.add(code);
    const option = document.createElement("option");
    option.value = code;
    option.textContent = `${category?.name || code} (${countByCategory.get(code) || 0})`;
    topicSelect.appendChild(option);
  }
  for (const [code, count] of countByCategory.entries()) {
    if (renderedCodes.has(code)) continue;
    const option = document.createElement("option");
    option.value = code;
    option.textContent = `${code} (${count})`;
    topicSelect.appendChild(option);
  }

  topicSelect.disabled = false;
  updateActionButtons();
}

async function startCategoryQuiz(useWrongBook) {
  const exam = getCurrentExam();
  if (!exam) {
    showCatalogEmptyState();
    return;
  }
  // 模拟考模式下分类下拉是隐藏的，错题练习固定用全部分类，避免残留筛选值悄悄过滤
  const selectedCategoryCode = (useWrongBook && practiceMode?.value === "mock")
    ? "ALL"
    : String(topicSelect.value || "all").trim().toUpperCase();

  let wrongIds = [];
  if (useWrongBook) {
    const wrongRes = await apiFetch(`/api/progress/wrong-book?exam_id=${encodeURIComponent(state.currentExamId)}`, {
      token: state.authToken
    });
    wrongIds = wrongRes.question_ids || [];
  }

  let baseQuestions = exam.questions.filter((q) => q && (q.id || q.question_id));
  if (selectedCategoryCode !== "ALL") {
    baseQuestions = baseQuestions.filter((q) => getQuestionCategoryCode(q, exam.id) === selectedCategoryCode);
  }

  if (useWrongBook) {
    baseQuestions = baseQuestions.filter((q) => wrongIds.includes(q.id || q.question_id));
    if (!baseQuestions.length) {
      alert("当前筛选下没有错题记录。先做一轮分项练习。");
      return;
    }
  }

  if (!baseQuestions.length) {
    showCatalogEmptyState();
    return;
  }

  const countValue = countSelect.value;
  const selectedCount = countValue === "all" ? baseQuestions.length : Number(countValue);

  state.quizQuestions = shuffle([...baseQuestions]).slice(0, Math.min(selectedCount, baseQuestions.length));
  state.currentIndex = 0;
  state.answers = {};
  state.timerMode = "none";
  state.activeMode = useWrongBook ? "wrong-book" : "category";
  state.mockSpec = null;
  state.sessionSectionCode = selectedCategoryCode === "all" ? "" : selectedCategoryCode;
  state.sessionSectionName =
    selectedCategoryCode === "all"
      ? "全部分类"
      : getExamCategoryName(exam, selectedCategoryCode);

  hideCatalogEmptyState();
  beginQuiz();
}

async function loadBookmarks() {
  const examId = state.currentExamId;
  if (!examId || !state.authToken) return;
  try {
    const res = await apiFetch(`/api/progress/bookmarks?exam_id=${encodeURIComponent(examId)}`, { token: state.authToken });
    state.bookmarkedIds = new Set(res.question_ids || []);
  } catch {
    state.bookmarkedIds = new Set();
  }
  renderBookmarkButton();
}

async function toggleBookmark() {
  const q = state.quizQuestions[state.currentIndex];
  if (!q) return;
  const qid = String(q.id || q.question_id || "").trim();
  if (!qid) return;
  const examId = state.currentExamId;
  const isBookmarked = state.bookmarkedIds.has(qid);
  if (isBookmarked) {
    state.bookmarkedIds.delete(qid);
    renderBookmarkButton();
    try { await apiFetch("/api/progress/bookmarks", { method: "DELETE", token: state.authToken, body: { exam_id: examId, question_id: qid } }); }
    catch { state.bookmarkedIds.add(qid); renderBookmarkButton(); }
  } else {
    state.bookmarkedIds.add(qid);
    renderBookmarkButton();
    try { await apiFetch("/api/progress/bookmarks", { method: "POST", token: state.authToken, body: { exam_id: examId, question_id: qid } }); }
    catch { state.bookmarkedIds.delete(qid); renderBookmarkButton(); }
  }
}

function renderBookmarkButton() {
  const q = state.quizQuestions?.[state.currentIndex];
  const qid = q ? String(q.id || q.question_id || "").trim() : "";
  const marked = qid && state.bookmarkedIds.has(qid);
  const label = marked ? "★ 已收藏" : "☆ 收藏";
  if (bookmarkBtn) {
    bookmarkBtn.textContent = label;
    bookmarkBtn.style.color = marked ? "#f5a623" : "";
    bookmarkBtn.style.borderColor = marked ? "#f5a623" : "";
  }
  if (quizShellBookmarkBtn) {
    quizShellBookmarkBtn.textContent = label;
    quizShellBookmarkBtn.style.color = marked ? "#f5a623" : "";
    quizShellBookmarkBtn.style.borderColor = marked ? "#f5a623" : "";
  }
}

async function startBookmarkQuiz() {
  const exam = getCurrentExam();
  if (!exam) { showCatalogEmptyState(); return; }
  await loadBookmarks();
  const bookmarkIds = [...state.bookmarkedIds];
  if (!bookmarkIds.length) {
    alert("当前题库还没有收藏题。练习时点击「☆ 收藏」标记重要或不理解的题目。");
    return;
  }
  const allQuestions = exam.questions.filter((q) => q && (q.id || q.question_id));
  const bookmarked = allQuestions.filter((q) => bookmarkIds.includes(q.id || q.question_id));
  if (!bookmarked.length) {
    alert("当前题库下没有收藏题。");
    return;
  }
  state.quizQuestions = shuffle([...bookmarked]);
  state.currentIndex = 0;
  state.answers = {};
  state.timerMode = "none";
  state.activeMode = "category";
  state.mockSpec = null;
  state.sessionSectionCode = "";
  state.sessionSectionName = "收藏题";
  hideCatalogEmptyState();
  beginQuiz();
  openQuizShell();
}

// 分层抽题：按分类权重分配题数（后台配置官方比例优先，否则按题库占比），层内随机。
// 目的：每次模拟考的章节分布稳定、贴近 CSLB 官方结构，而不是纯随机导致分布漂移。
function sampleMockQuestions(exam, pool, targetCount) {
  if (pool.length <= targetCount) return shuffle([...pool]);
  const groups = new Map();
  for (const q of pool) {
    const code = getQuestionCategoryCode(q, exam.id) || "UNCATEGORIZED";
    if (!groups.has(code)) groups.set(code, []);
    groups.get(code).push(q);
  }
  if (groups.size <= 1) return shuffle([...pool]).slice(0, targetCount);

  const overrides =
    exam.simulation && typeof exam.simulation.categoryWeights === "object" && exam.simulation.categoryWeights
      ? exam.simulation.categoryWeights
      : null;
  const entries = [...groups.entries()].map(([code, list]) => {
    const w = overrides && Number(overrides[code]) > 0 ? Number(overrides[code]) : null;
    return { code, list, weight: w !== null ? w : list.length };
  });
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0) || 1;

  // 最大余数法分配整数题数，且不超过该分类实际题量
  const allocated = entries.map((e) => {
    const exact = (targetCount * e.weight) / totalWeight;
    return { ...e, exact, take: Math.min(Math.floor(exact), e.list.length) };
  });
  let used = allocated.reduce((s, e) => s + e.take, 0);
  const byRemainder = [...allocated].sort(
    (a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact))
  );
  let guard = pool.length;
  while (used < targetCount && guard-- > 0) {
    let progressed = false;
    for (const e of byRemainder) {
      if (used >= targetCount) break;
      if (e.take < e.list.length) {
        e.take += 1;
        used += 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  const picked = [];
  for (const e of allocated) picked.push(...shuffle([...e.list]).slice(0, e.take));
  return shuffle(picked);
}

function startMockExam() {
  const exam = getCurrentExam();
  if (!exam) {
    showCatalogEmptyState();
    return;
  }
  const baseQuestions = getQuestionsForMockExam(exam);

  if (!baseQuestions.length) {
    showCatalogEmptyState();
    return;
  }

  const config = getOfficialMockConfig(exam);
  const questionCount = Number(config.questionCount || CSLB_OFFICIAL_MOCK_DEFAULT.questionCount);
  const minutes = Number(config.minutes || CSLB_OFFICIAL_MOCK_DEFAULT.minutes);
  const actualCount = Math.min(questionCount, baseQuestions.length);

  if (baseQuestions.length < questionCount) {
    alert(`当前题库仅 ${baseQuestions.length} 题，未达到官方模拟 ${questionCount} 题，将按现有题量进行模拟。`);
  }

  state.quizQuestions = sampleMockQuestions(exam, baseQuestions, actualCount);
  state.currentIndex = 0;
  state.answers = {};
  state.timerEnabled = true;
  state.timerMode = "exam";
  state.timeLeft = minutes * 60;
  state.activeMode = "mock";
  state.mockSpec = { questionCount, minutes, actualCount };
  state.sessionSectionCode = "MOCK_EXAM";
  state.sessionSectionName = "模拟考试";

  hideCatalogEmptyState();
  beginQuiz();
  startExamTimer();
}

function beginQuiz() {
  clearTimers();
  state.lastWrongItems = [];
  resultSection.classList.add("hidden");
  reviewList.classList.add("hidden");
  quizSection.classList.remove("hidden");
  hideCatalogEmptyState();
  persistContinueInProgress();
  void loadBookmarks();
  renderQuestion();
}

function renderQuestion() {
  const q = state.quizQuestions[state.currentIndex];
  if (!q) return;

  const qid = q.id || q.question_id || "";
  if (!qid) return;

  const exam = getCurrentExam();
  if (!exam) {
    clearTimers();
    quizSection.classList.add("hidden");
    return;
  }

  let modeText = "分类训练";
  if (state.activeMode === "mock") {
    const spec = state.mockSpec || getOfficialMockConfig(exam);
    const officialCount = Number(spec.questionCount || CSLB_OFFICIAL_MOCK_DEFAULT.questionCount);
    const officialMinutes = Number(spec.minutes || CSLB_OFFICIAL_MOCK_DEFAULT.minutes);
    if (state.quizQuestions.length < officialCount) {
      modeText = `模拟考试（官方 ${officialCount} 题 / ${officialMinutes} 分钟，当前 ${state.quizQuestions.length} 题）`;
    } else {
      modeText = `模拟考试（${officialCount} 题 / ${officialMinutes} 分钟）`;
    }
  } else if (state.activeMode === "wrong-book") {
    modeText = "错题练习";
  } else if (state.activeMode === "category" && state.sessionSectionName === "收藏题") {
    modeText = "收藏练习";
  } else if (state.sessionSectionName && state.sessionSectionName !== "全部分类") {
    modeText = `分类：${state.sessionSectionName}`;
  }

  const view = getQuestionView(q);

  const _quizExamType = resolveExamType(exam);
  const _quizTypeLabel = _quizExamType === "law_business" ? "法律考试" : "技术考试";
  quizTitle.textContent = `${_quizTypeLabel} · ${modeText}`;
  quizMeta.textContent = `第 ${state.currentIndex + 1} 题 / 共 ${state.quizQuestions.length} 题`;
  const _pb = document.getElementById("quizShellProgressBar");
  if (_pb && state.quizQuestions.length > 0) {
    _pb.style.width = ((state.currentIndex + 1) / state.quizQuestions.length * 100).toFixed(1) + "%";
  }
  const _prompt = view.english.prompt || "--";
  questionText.onclick = null;
  questionText.style.cursor = "";
  if (state.ttsEnabled && hasTtsAccess()) {
    // wrap each word in a clickable span
    questionText.innerHTML = _prompt.replace(/([A-Za-z]+(?:[''][A-Za-z]+)*)/g, (w) =>
      `<span class="_tts_w" style="cursor:pointer;border-radius:3px;padding:0 1px" ` +
      `onmouseenter="this.style.background='rgba(99,179,237,.25)'" ` +
      `onmouseleave="this.style.background=''">${w}</span>`
    );
    questionText.querySelectorAll("._tts_w").forEach(el => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const w = el.textContent.trim();
        _tts.speak(w);
        _tts.showWordTooltip(el, w);
      });
    });
    // 🔊 read full question button
    let _readAllBtn = document.getElementById("_tts_read_all_btn");
    if (!_readAllBtn) {
      _readAllBtn = document.createElement("button");
      _readAllBtn.id = "_tts_read_all_btn";
      _readAllBtn.type = "button";
      _readAllBtn.title = "朗读全题";
      _readAllBtn.style.cssText = "margin-left:10px;background:none;border:none;cursor:pointer;font-size:16px;opacity:0.55;vertical-align:middle;padding:0;line-height:1;";
      _readAllBtn.textContent = "🔊";
      _readAllBtn.addEventListener("mouseenter", () => _readAllBtn.style.opacity = "1");
      _readAllBtn.addEventListener("mouseleave", () => _readAllBtn.style.opacity = "0.55");
      questionText.parentElement?.insertBefore(_readAllBtn, questionText.nextSibling);
    }
    _readAllBtn.onclick = () => _tts.speak(_prompt);
    _readAllBtn.style.display = "";
  } else {
    questionText.textContent = _prompt;
    const _old = document.getElementById("_tts_read_all_btn");
    if (_old) _old.style.display = "none";
  }
  questionTypeTag.textContent = `分类：${getQuestionType(q, exam.id)}`;
  questionTypeTag.classList.remove("hidden");

  const mediaBox = document.getElementById("questionMediaBox");
  const mediaInner = document.getElementById("questionMediaInner");
  if (mediaBox && mediaInner) {
    const imageUrl =
      String(
        q.media_image_url ||
        q.image_url ||
        q.imageUrl ||
        view.media_image_url ||
        ""
      ).trim();

    const videoUrl =
      String(
        q.media_video_url ||
        q.video_url ||
        q.videoUrl ||
        view.media_video_url ||
        ""
      ).trim();

    const mediaCaption =
      String(
        q.media_caption ||
        q.image_caption ||
        q.caption ||
        view.media_caption ||
        ""
      ).trim();

    const promptText = String(view?.english?.prompt || q.question_text || "").toLowerCase();
    const referencesFigure = /\b(figure|diagram|illustration|pictured|shown|arrow|blueprint|plan)\b/.test(promptText) || /refer to the/i.test(promptText);

    mediaInner.innerHTML = "";
    mediaBox.classList.add("hidden");

    if (imageUrl) {
      mediaBox.classList.remove("hidden");
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = mediaCaption || "Question image";
      img.style.maxWidth = "100%";
      img.style.maxHeight = "420px";
      img.style.borderRadius = "10px";
      img.style.cursor = "zoom-in";
      img.style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)";
      img.addEventListener("click", () => openImageLightbox(imageUrl, mediaCaption));
      mediaInner.appendChild(img);

      if (mediaCaption) {
        const cap = document.createElement("div");
        cap.textContent = mediaCaption;
        cap.style.marginTop = "8px";
        cap.style.fontSize = "13px";
        cap.style.color = "#5f6d82";
        mediaInner.appendChild(cap);
      }
    } else if (videoUrl) {
      mediaBox.classList.remove("hidden");
      const video = document.createElement("video");
      video.src = videoUrl;
      video.controls = true;
      video.style.maxWidth = "100%";
      video.style.maxHeight = "420px";
      video.style.borderRadius = "10px";
      mediaInner.appendChild(video);

      if (mediaCaption) {
        const cap = document.createElement("div");
        cap.textContent = mediaCaption;
        cap.style.marginTop = "8px";
        cap.style.fontSize = "13px";
        cap.style.color = "#5f6d82";
        mediaInner.appendChild(cap);
      }
    }
  }

  optionsWrap.innerHTML = "";
  view.english.options.forEach((opt, idx) => {
    const node = optionTemplate.content.cloneNode(true);
    const input = node.querySelector("input");
    const span = node.querySelector("span");

    input.value = String(idx);
    input.checked = state.answers[qid] === idx;
    input.addEventListener("change", () => {
      state.answers[qid] = idx;
      void saveProgressEvent(qid, idx);
    });
    if (state.ttsEnabled && hasTtsAccess() && opt) {
      span.innerHTML = opt.replace(/([A-Za-z]+(?:[''][A-Za-z]+)*)/g, (w) =>
        `<span class="_tts_w" style="cursor:pointer;border-radius:3px;padding:0 1px" ` +
        `onmouseenter="this.style.background='rgba(99,179,237,.25)'" ` +
        `onmouseleave="this.style.background=''">${w}</span>`
      );
      span.querySelectorAll("._tts_w").forEach(el => {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const w = el.textContent.trim();
          _tts.speak(w);
          _tts.showWordTooltip(el, w);
        });
      });
      // 🔊 read full option
      const speakBtn = document.createElement("button");
      speakBtn.type = "button";
      speakBtn.textContent = "🔊";
      speakBtn.title = "朗读此选项";
      speakBtn.style.cssText = "margin-left:8px;background:none;border:none;cursor:pointer;font-size:14px;opacity:0.6;vertical-align:middle;padding:0 2px;line-height:1;";
      speakBtn.addEventListener("mouseenter", () => speakBtn.style.opacity = "1");
      speakBtn.addEventListener("mouseleave", () => speakBtn.style.opacity = "0.6");
      speakBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        _tts.speak(opt);
      });
      span.appendChild(speakBtn);
    } else {
      span.textContent = opt || "--";
    }

    optionsWrap.appendChild(node);
  });

  _injectInlineChinese(view);
  renderChineseAssistPanel(view);

  prevBtn.disabled = state.currentIndex === 0;
  nextBtn.disabled = state.currentIndex === state.quizQuestions.length - 1;

  if (state.timerMode === "question") {
    if (state._timerQuestionKey !== qid || !state.timerId) {
      state._timerQuestionKey = qid;
      startQuestionTimer();
    }
  } else if (state.timerMode === "none") {
    timerWrap.classList.add("hidden");
  }
  renderBookmarkButton();
}

function getOfficialMockConfig(exam) {
  if (!exam || typeof exam !== "object") return { ...CSLB_OFFICIAL_MOCK_DEFAULT };
  const simulation = typeof exam.simulation === "object" && exam.simulation ? exam.simulation : {};
  const questionCount = Number(
    simulation.questionCount || exam.questionCount || CSLB_OFFICIAL_MOCK_DEFAULT.questionCount
  );
  const minutes = Number(
    simulation.examTimeMinutes || simulation.minutes || exam.examTimeMinutes || CSLB_OFFICIAL_MOCK_DEFAULT.minutes
  );
  return {
    questionCount: Number.isFinite(questionCount) && questionCount > 0 ? questionCount : CSLB_OFFICIAL_MOCK_DEFAULT.questionCount,
    minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : CSLB_OFFICIAL_MOCK_DEFAULT.minutes
  };
}

function refreshMockPresetInfo() {
  if (!mockPresetInput) return;
  const exam = getCurrentExam();
  const config = getOfficialMockConfig(exam);
  mockPresetInput.value = `CSLB 模拟：${config.questionCount}题 / ${config.minutes}分钟（固定）`;
}

function moveQuestion(delta) {
  const next = state.currentIndex + delta;
  if (next < 0 || next >= state.quizQuestions.length) return;
  state.currentIndex = next;
  persistContinueInProgress();
  renderQuestion();
  if (quizShellMain) quizShellMain.scrollTop = 0;
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
        mode: state.activeMode
      }
    });
  } catch {}
}

async function submitQuiz(isAutoSubmit) {
  clearTimers();

  let correct = 0;
  const wrongItems = [];
  for (const q of state.quizQuestions) {
    const qid = q?.id || q?.question_id;
    const chosen = state.answers[qid];
    if (chosen === q.answerIndex) {
      correct += 1;
    } else {
      wrongItems.push(q);
    }
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
      mode: state.activeMode,
      wrong_question_ids: wrongItems.map((q) => q?.id || q?.question_id).filter(Boolean),
      all_question_ids: state.quizQuestions.map((q) => q?.id || q?.question_id).filter(Boolean)
    }
  });

  quizSection.classList.add("hidden");
  resultSection.classList.remove("hidden");
  state.lastWrongItems = wrongItems;
  persistContinueAfterSubmit(percent);
  renderReview(wrongItems);
  await renderProgress();

}

function renderReview(wrongItems) {
  reviewList.innerHTML = "";
  if (!wrongItems.length) {
    const empty = document.createElement("div");
    empty.className = "review-item";
    empty.innerHTML = "<h4>恭喜，全对。</h4><p>本次没有错题，无需解析复习。</p>";
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
      <p><strong>题型：</strong>${getQuestionType(q, state.currentExamId)}</p>
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
  return (Array.isArray(state.dashboardModules) ? state.dashboardModules : []).filter((module) => {
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
  return getAllExamsFlat().find(
    (exam) => String(exam?.id || "").trim() === target || normalizeExamCodeValue(exam?.examCode || "") === normalizeExamCodeValue(target)
  ) || null;
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
  scheduleSyncSession();
}

let _syncSessionTimer = null;
function scheduleSyncSession() {
  clearTimeout(_syncSessionTimer);
  _syncSessionTimer = setTimeout(syncSessionToServer, 2000);
}

async function syncSessionToServer() {
  if (!state.authToken) return;
  try {
    const data = readContinueState();
    await apiFetch("/api/progress/session", { method: "PUT", token: state.authToken, body: data });
  } catch {}
}

async function loadSessionFromServer() {
  if (!state.authToken) return;
  try {
    const res = await apiFetch("/api/progress/session", { token: state.authToken });
    const serverState = res?.state;
    if (!serverState || typeof serverState !== "object") return;
    const localState = readContinueState();
    const serverTs = Number(serverState?.inProgress?.updatedAt || serverState?.recent?.updatedAt || 0);
    const localTs = Number(localState?.inProgress?.updatedAt || localState?.recent?.updatedAt || 0);
    if (serverTs > localTs) {
      try { localStorage.setItem(getContinueStorageKey(), JSON.stringify(serverState)); } catch {}
      updateContinueLearningPanel();
      updateLearningPathPanels();
    }
  } catch {}
}

function resolveExamCode(exam) {
  return String(exam?.examCode || exam?.id || "").trim();
}

function resolveSectionNameForContinue(exam, sectionCode, fallback = "") {
  const code = String(sectionCode || "").trim().toUpperCase();
  if (!code || code === "ALL") return String(fallback || "全部分类");
  const fromCategory = getExamCategoryName(exam, code);
  if (fromCategory && fromCategory !== code) return fromCategory;
  return String(fallback || code);
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
    timeLeft: Number.isFinite(Number(pending.timeLeft)) ? Number(pending.timeLeft) : 0,
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
  if (!targetExam) {
    targetExam = exams[0];
  }
  const examCode = resolveExamCode(targetExam);
  const categories = getExamCategories(targetExam);
  let targetCategory = categories.find((item) =>
    String(item?.code || "")
      .toUpperCase()
      .includes("BUSINESS_ORGANIZATION")
  );
  if (!targetCategory) targetCategory = categories[0] || null;
  const sectionCode = String(targetCategory?.code || "").trim().toUpperCase();
  const sectionName = String(targetCategory?.name || "Business Organization").trim();
  return {
    kind: "default",
    examCode,
    examName: String(targetExam.name || examCode),
    mode: "category",
    sectionCode,
    sectionName,
    title: "建议从这里开始",
    actionLabel: "开始学习",
    subtitle: `${String(targetExam.name || examCode)} · ${sectionName}`,
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
  const primarySectionCode = String(rec?.sectionCode || "").trim().toUpperCase();

  let primaryAction = {
    type: "practice_category",
    label: "开始分项练习",
    mode: "category",
    examCode: primaryExamCode,
    sectionCode: primarySectionCode
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
        examCode: primaryExamCode,
        sectionCode: primarySectionCode
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
        examCode: primaryExamCode,
        sectionCode: primarySectionCode
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
    if (practiceMode) {
      practiceMode.value = mode;
      onModeChange();
    }
    const examCode =
      String(next.examCode || "").trim() ||
      String(state.continueRecommendation?.examCode || "").trim();
    const sectionCode = String(next.sectionCode || "").trim().toUpperCase();
    if (examCode) {
      focusExamByCode(examCode, {
        mode,
        categoryCode: mode === "category" ? sectionCode : ""
      });
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

  const altBtn = document.getElementById("continueAltBtn");
  const isMock = rec?.mode === "mock";

  if (!rec) {
    continueLearningTitle.textContent = "还没有学习记录";
    continueLearningMeta.textContent = "先从分项练习开始，建立训练节奏。";
    continueLearningBtn.textContent = "开始分项练习";
    if (altBtn) { altBtn.textContent = "去模拟考试"; altBtn.style.display = ""; altBtn.onclick = () => { if (practiceMode) { practiceMode.value = "mock"; onModeChange(); } jumpToTrainingSection("mock"); }; }
    return;
  }

  continueLearningTitle.textContent = rec.title || "继续学习";
  continueLearningMeta.textContent = `${rec.subtitle || rec.examName || "--"}${rec.detail ? ` · ${rec.detail}` : ""}`;
  continueLearningBtn.textContent = isMock ? "继续模拟考试" : "继续分项训练";

  if (altBtn) {
    altBtn.textContent = isMock ? "去分项练习" : "去模拟考试";
    altBtn.style.display = "";
    altBtn.onclick = () => {
      const altMode = isMock ? "category" : "mock";
      if (practiceMode) { practiceMode.value = altMode; onModeChange(); }
      jumpToTrainingSection(isMock ? "practice" : "mock");
    };
  }

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
    mode: state.activeMode === "mock" ? "mock" : "category",
    sectionCode: String(state.sessionSectionCode || "").trim().toUpperCase(),
    sectionName: String(state.sessionSectionName || (state.activeMode === "mock" ? "模拟考试" : "分项练习")),
    questionIds,
    answers,
    currentIndex: Math.max(0, Math.min(state.quizQuestions.length - 1, Number(state.currentIndex || 0))),
    currentQuestion: Math.max(1, Math.min(state.quizQuestions.length, Number(state.currentIndex || 0) + 1)),
    totalQuestion: state.quizQuestions.length,
    timeLeft: Number(state.timeLeft || 0),
    updatedAt: Date.now()
  };
  writeContinueState(payload);
  updateContinueLearningPanel();
}

function persistContinueAfterSubmit(percent) {
  const exam = getCurrentExam();
  if (!exam) return;
  const payload = readContinueState();
  const mode = state.activeMode === "mock" ? "mock" : "category";
  const sectionCode = String(state.sessionSectionCode || "").trim().toUpperCase();
  const sectionName = String(state.sessionSectionName || (mode === "mock" ? "模拟考试" : "分项练习"));
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
  if (!examCode) return false;
  if (!focusExamByCode(examCode, { mode: rec.mode || "category", categoryCode: rec.sectionCode || "" })) {
    return false;
  }
  const exam = getCurrentExam();
  if (!exam) return false;
  const sourceQuestions =
    rec.mode === "mock"
      ? getQuestionsForMockExam(exam)
      : (exam.questions || []).filter(hasRenderableEnglishSource);
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
  const safeIndex = Math.max(0, Math.min(recovered.length - 1, Number(rec.currentIndex || 0)));
  state.currentIndex = safeIndex;
  state.activeMode = rec.mode === "mock" ? "mock" : "category";
  state.sessionSectionCode = String(rec.sectionCode || "").trim().toUpperCase();
  state.sessionSectionName = String(rec.sectionName || (rec.mode === "mock" ? "模拟考试" : "分项练习"));
  if (state.activeMode === "mock") {
    const config = getOfficialMockConfig(exam);
    state.timerEnabled = true;
    state.timerMode = "exam";
    state.mockSpec = { questionCount: config.questionCount, minutes: config.minutes, actualCount: recovered.length };
    state.timeLeft = Number.isFinite(Number(rec.timeLeft)) && Number(rec.timeLeft) > 0 ? Number(rec.timeLeft) : config.minutes * 60;
    beginQuiz();
    startExamTimer();
  } else {
    state.timerMode = state.timerEnabled ? "question" : "none";
    state.mockSpec = null;
    beginQuiz();
  }
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
    if (profile.bilingualEntitlement && typeof profile.bilingualEntitlement === "object") {
      state.user.bilingualEntitlement = profile.bilingualEntitlement;
    }
    if (profile.aiEntitlement && typeof profile.aiEntitlement === "object") {
      state.user.aiEntitlement = profile.aiEntitlement;
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

async function onAccountPasswordPlaceholder() {
  if (!accountSecurityMsg) return;
  const currentPwd = (accountCurrentPassword?.value || "").trim();
  const newPwd = (accountNewPassword?.value || "").trim();
  const confirmPwd = (accountConfirmPassword?.value || "").trim();
  accountSecurityMsg.classList.remove("hidden");
  if (!currentPwd || !newPwd || !confirmPwd) {
    accountSecurityMsg.textContent = "请填写所有密码字段";
    return;
  }
  if (newPwd.length < 6) {
    accountSecurityMsg.textContent = "新密码至少6位";
    return;
  }
  if (newPwd !== confirmPwd) {
    accountSecurityMsg.textContent = "两次输入的新密码不一致";
    return;
  }
  try {
    await apiFetch("/api/account/change-password", {
      method: "POST",
      body: { currentPassword: currentPwd, newPassword: newPwd },
    });
    accountSecurityMsg.textContent = "密码已修改，下次登录请使用新密码";
    if (accountCurrentPassword) accountCurrentPassword.value = "";
    if (accountNewPassword) accountNewPassword.value = "";
    if (accountConfirmPassword) accountConfirmPassword.value = "";
  } catch (err) {
    accountSecurityMsg.textContent = err.message || "修改失败，请重试";
  }
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
  setMemberView("placeholder", { preserveNav: true });
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
      if (code === target) {
        return { industry, exam };
      }
    }
  }
  return null;
}

function focusExamByCode(examCode, options = {}) {
  const hit = findExamByCode(examCode);
  if (!hit) return false;
  renderIndustryOptions(
    hit.industry.id,
    hit.exam.examFamilyKey || "",
    resolveTradeCode(hit.exam),
    resolveExamType(hit.exam),
    hit.exam.id
  );

  if (options.mode === "mock" && practiceMode) {
    practiceMode.value = "mock";
    onModeChange();
  } else if (options.mode === "category" && practiceMode) {
    practiceMode.value = "category";
    onModeChange();
  }

  const categoryCode = String(options.categoryCode || "").trim().toUpperCase();
  if (categoryCode && topicSelect && Array.from(topicSelect.options).some((opt) => opt.value === categoryCode)) {
    topicSelect.value = categoryCode;
  }
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
  const memberSideLinks = getMemberSideLinks();
  if (!key || !memberSideLinks.length) return;
  state.activeSideNavKey = key;
  for (const link of memberSideLinks) {
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
  if (["catalog", "practiceCenterSection", "quizSection", "resultSection"].includes(id)) {
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
    if (practiceMode) {
      practiceMode.value = "mock";
      onModeChange();
    }
    setMemberView("practice", { preserveNav: true });
    jumpToTrainingSection("mock");
    return;
  }

  if (action === "practice") {
    if (practiceMode) {
      practiceMode.value = "category";
      onModeChange();
    }
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
    if (practiceMode?.value === "mock") {
      setMemberSideNavActive("mock");
    } else if (!["practice", "mock"].includes(state.activeSideNavKey)) {
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
    scrollToMemberTarget("catalog");
    openQuizShell();
    return;
  }
  if (practiceMode) {
    practiceMode.value = targetMode;
    onModeChange();
  }
  if (rec?.examCode) {
    focusExamByCode(rec.examCode, {
      mode: rec.mode || "category",
      categoryCode: rec.sectionCode || ""
    });
  }
  jumpToTrainingSection(targetMode === "mock" ? "mock" : "practice");
}

function jumpToTrainingSection(navKey = "practice") {
  hideAccountSettingsCenter();
  hideModulePlaceholder();
  setMemberView("practice", { preserveNav: true });
  setMemberSideNavActive(navKey);
  updatePracticeContext();
  scrollToMemberTarget("catalog");
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
  if (!target || target === "practice_center" || target === "catalog") {
    if (practiceMode) {
      practiceMode.value = "category";
      onModeChange();
    }
    jumpToTrainingSection();
    return;
  }
  if (target === "mock_exam") {
    if (practiceMode) {
      practiceMode.value = "mock";
      onModeChange();
    }
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
    const id = target.slice(1);
    scrollToMemberTarget(id);
    return;
  }
  if (/^https?:\/\//i.test(target) || target.startsWith("/")) {
    window.location.href = target;
    return;
  }
  showModulePlaceholder(module);
}

function openDashboardModule(module) {
  if (!module) return;
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

  if (routeType === "exam_home") {
    const examCode = module.linkedExamCode || module.routeTarget;
    if (focusExamByCode(examCode, { mode: "category" })) {
      jumpToTrainingSection();
    } else {
      showModulePlaceholder(module, "当前模块尚未绑定可用考试，请到后台配置 linked_exam_code。");
    }
    return;
  }

  if (routeType === "category_practice") {
    const examCode = module.linkedExamCode || module.routeTarget;
    if (focusExamByCode(examCode, { mode: "category", categoryCode: module.linkedCategoryCode })) {
      jumpToTrainingSection();
    } else {
      showModulePlaceholder(module, "当前模块尚未绑定可用分项练习配置。");
    }
    return;
  }

  if (routeType === "mock_exam") {
    const examCode = module.linkedExamCode || module.routeTarget;
    if (!examCode || focusExamByCode(examCode, { mode: "mock" })) {
      if (practiceMode) {
        practiceMode.value = "mock";
        onModeChange();
      }
      jumpToTrainingSection();
    } else {
      showModulePlaceholder(module, "当前模块尚未绑定可用模考考试。");
    }
    return;
  }

  handleInternalModuleRoute(module);
}

async function onDashboardModuleClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  if (action !== "open-module") return;
  const moduleCode = String(target.dataset.moduleCode || "").trim();
  if (!moduleCode) return;
  const module = state.dashboardModules.find((item) => String(item?.moduleCode || "") === moduleCode);
  if (!module) return;
  openDashboardModule(module);
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

async function renderProgress() {
  const progress = await apiFetch("/api/progress/summary", { token: state.authToken });
  state.progressSummary = progress && typeof progress === "object" ? progress : {};
  progressCards.innerHTML = "";

  const exams = state.bank.industries.flatMap((ind) => ind.exams);
  if (!exams.length) {
    const card = document.createElement("article");
    card.className = "progress-card";
    card.innerHTML = `<h3>${CATALOG_EMPTY_PRIMARY}</h3><div>${CATALOG_EMPTY_SECONDARY}</div>`;
    progressCards.appendChild(card);
    return;
  }

  for (const exam of exams) {
    const item = progress[exam.id];
    const card = document.createElement("article");
    card.className = "progress-card";
    card.innerHTML = `
      <h3>${exam.name}</h3>
      <div>最近正确率：${item ? `${item.percent}%` : "暂无"}</div>
      <div>累计练习：${item ? item.attempts : 0} 次</div>
      <div>最高分：${item ? `${item.best}%` : "--"}</div>
      <div>最近模式：${item?.lastMode || "--"}</div>
    `;
    progressCards.appendChild(card);
  }
  updateContinueLearningPanel();
  updateRecentPerformancePanel();
  updateSummaryStrip();
}

async function resetProgress() {
  const ok = confirm("确认清空所有学习进度和错题本吗？");
  if (!ok) return;

  await apiFetch("/api/progress/reset", {
    method: "POST",
    token: state.authToken,
    body: {}
  });

  await renderProgress();
}

function startQuestionTimer() {
  clearTimers();
  // [jnono-round2] category/wrong-book = learning mode, no timer, no auto-advance
  if (state.activeMode === "category" || state.activeMode === "wrong-book") {
    if (timerWrap) timerWrap.classList.add("hidden");
    return;
  }
  if (!state.timerEnabled) {
    timerWrap.classList.add("hidden");
    return;
  }

  timerWrap.classList.remove("hidden");
  timerWrap.classList.remove("warning");
  timerLabel.textContent = "剩余（本题）";
  state.timeLeft = 75;
  timerEl.textContent = formatTime(state.timeLeft);

  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    timerEl.textContent = formatTime(state.timeLeft);

    if (state.timeLeft <= 15) {
      timerWrap.classList.add("warning");
    }

    if (state.timeLeft <= 0) {
      clearTimers();
      moveQuestion(1);
    }
  }, 1000);
}

function startExamTimer() {
  clearTimers();
  timerWrap.classList.remove("hidden");
  timerWrap.classList.remove("warning");
  timerLabel.textContent = "剩余（整场）";
  timerEl.textContent = formatTime(state.timeLeft);

  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    timerEl.textContent = formatTime(state.timeLeft);

    if (state.timeLeft <= 300) {
      timerWrap.classList.add("warning");
    }

    if (state.timeLeft <= 0) {
      clearTimers();
      state._timeUpAutoSubmit = true;
      void submitQuiz(true);
    }
  }, 1000);
}

function clearTimers() {
  clearInterval(state.timerId);
  state.timerId = null;
}

function refreshWelcomeText() {
  const activeCategories = getActiveCategoryKeys();
  const expiredCategories = getExpiredCategoryKeys();
  const labels = [];
  if (activeCategories.length) labels.push(`分类 ${activeCategories.join("/")}`);
  if (hasBilingualAccess()) labels.push("中文辅助");
  if (hasExplanationAccess()) labels.push("解析");
  if (hasMemoryTipsAccess()) labels.push("记忆技巧");
  const accessText = labels.length ? ` · 已开通 ${labels.join(" · ")}` : " · 暂无课程权限";
  const expiredText = expiredCategories.length ? ` · 已过期 ${expiredCategories.join("/")}（请联系续费）` : "";
  welcomeText.textContent = `欢迎，${state.user?.name || "学员"}（付费会员${accessText}${expiredText}）`;
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

function hasTtsAccess() {
  return getContentPermissions().explanationEnabled === true;
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

// ── Mobile inline Chinese: question text + option translations in main area ──
function _injectInlineChinese(view) {
  const isMobile = window.innerWidth <= 768;
  const canShow = isMobile && !!state.showChinese && shellCanChinese();
  const zhOptions = (view && view.chinese && Array.isArray(view.chinese.options))
    ? view.chinese.options : [];
  const zhPrompt = String((view && view.chinese && view.chinese.prompt) || "").trim();

  // 1. Chinese question text block — injected before #options in the main section
  let zhQ = document.getElementById("_zh_q_inline");
  if (!zhQ && optionsWrap && optionsWrap.parentElement) {
    zhQ = document.createElement("div");
    zhQ.id = "_zh_q_inline";
    zhQ.className = "opt-zh-question";
    optionsWrap.parentElement.insertBefore(zhQ, optionsWrap);
  }
  if (zhQ) {
    if (canShow && zhPrompt) {
      zhQ.textContent = zhPrompt;
      zhQ.style.display = "block";
    } else {
      zhQ.style.display = "none";
    }
  }

  // 2. Chinese translation under each English option
  const items = optionsWrap ? optionsWrap.querySelectorAll(".option-item") : [];
  items.forEach((item, idx) => {
    let sub = item.querySelector(".opt-zh-inline");
    if (!sub) {
      sub = document.createElement("small");
      sub.className = "opt-zh-inline";
      item.appendChild(sub);
    }
    if (canShow) {
      const txt = String(zhOptions[idx] || "").trim();
      if (txt) {
        sub.textContent = txt;
        sub.style.display = "block";
      } else {
        sub.style.display = "none";
      }
    } else {
      sub.style.display = "none";
    }
  });
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

function getAvailableIndustries() {
  if (!state.bank?.industries) return [];
  return state.bank.industries.filter((item) => Array.isArray(item.exams) && item.exams.length > 0);
}

function getActiveCategoryKeys() {
  const mapped = state.user?.categoryEntitlements;
  if (!mapped || typeof mapped !== "object") return [];
  return Object.entries(mapped)
    .filter(([, enabled]) => enabled === true)
    .map(([key]) => key)
    .sort();
}

function getExpiredCategoryKeys() {
  const details = state.user?.categoryEntitlementDetails;
  const expired = [];
  if (details && typeof details === "object") {
    for (const [key, detail] of Object.entries(details)) {
      if (!detail || typeof detail !== "object") continue;
      if (detail.hasAccess === true && detail.isActive !== true) {
        expired.push(key);
      }
    }
  }
  const bilingual = state.user?.bilingualEntitlement;
  if (bilingual && bilingual.hasAccess === true && bilingual.isActive !== true) {
    expired.push("双语");
  }
  return expired.sort();
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

function updateActionButtons() {
  const hasExam = Boolean(getCurrentExam());
  const isMock = practiceMode.value === "mock";
  const hasIndustry = Boolean(getAvailableIndustries().length);
  const hasFamily = Boolean(state.currentIndustryId);
  const hasTrade = Boolean(state.currentExamFamilyKey);
  industrySelect.disabled = !hasIndustry;
  examFamilySelect.disabled = !hasFamily;
  tradeSelect.disabled = !hasTrade;
  examTypeSelect.disabled = !hasTrade;
  topicSelect.disabled = !hasExam;
  startBtn.disabled = !hasExam;
  // 刷错题在模拟考模式下也可用（错题流程独立于模考，见 startCategoryQuiz）
  wrongBookBtn.disabled = !hasExam;
  if (starBookBtn) starBookBtn.disabled = !hasExam;
  const _examType = getCurrentExamType();
  const _typeShort = _examType === "law_business" ? "法律" : _examType === "trade" ? "技术" : "";
  wrongBookBtn.textContent = _typeShort ? `刷错题（${_typeShort}）` : "刷错题";
  if (starBookBtn) starBookBtn.textContent = _typeShort ? `★ 收藏（${_typeShort}）` : "★ 收藏";
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

    const nextUser = me.user;
    if (!nextUser || nextUser.plan !== "paid") {
      window.location.href = "/trial.html";
      return;
    }

    const prevVersion = Number(state.user?.membershipVersion || 1);
    const nextVersion = Number(nextUser.membershipVersion || 1);
    const versionChanged = nextVersion !== prevVersion;

    state.user = nextUser;
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

    if (versionChanged) {
      await reloadBankAfterMembershipChange();
      await loadDashboardModules();
    }
    maybeOpenOnboardingWizard();
  } catch {
    clearAuthAndRedirect("/");
  } finally {
    state.syncInFlight = false;
  }
}

async function reloadBankAfterMembershipChange() {
  const preferredIndustryId = state.currentIndustryId;
  const preferredExamFamilyKey = state.currentExamFamilyKey;
  const preferredTradeCode = state.currentTradeCode;
  const preferredExamType = state.currentExamType;
  const preferredExamId = state.currentExamId;
  state.bank = await apiFetch("/api/question-bank", { token: state.authToken });
  renderIndustryOptions(
    preferredIndustryId,
    preferredExamFamilyKey,
    preferredTradeCode,
    preferredExamType,
    preferredExamId
  );

  if (!getCurrentExam()) {
    clearTimers();
    quizSection.classList.add("hidden");
    resultSection.classList.add("hidden");
  }

  await renderProgress();
  renderLicensingProgressSnapshot();
}

function clearAuthAndRedirect(path) {
  stopMembershipSync();
  clearTimers();
  clearAuthToken();
  window.location.href = path;
}

function getQuestionType(question, examId = state.currentExamId) {
  const examRef = findExamById(examId);
  const exam = examRef?.exam || getCurrentExam();
  const categoryCode = getQuestionCategoryCode(question, exam?.id || examId);
  const categoryName = getExamCategoryName(exam, categoryCode);
  if (categoryName) return categoryName;
  const rawType = String(question.questionType || "").trim();
  return rawType || categoryCode || "UNCATEGORIZED";
}

function normalizeBTopic(rawType, text) {
  const source = `${rawType} ${text}`.trim();
  for (const rule of B_TOPIC_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(source))) {
      return rule.label;
    }
  }
  return rawType || "Uncategorized / 未分类";
}

function isGeneralBExam(examId) {
  const value = String(examId || "").trim().toLowerCase();
  return value === "ca-general-b" || value === "ca_general_b";
}

function getCurrentIndustry() {
  const industries = getAvailableIndustries();
  if (!industries.length) return null;
  return industries.find((item) => item.id === state.currentIndustryId) || industries[0];
}

function getCurrentExam() {
  const industry = getCurrentIndustry();
  const exams = getFilteredExams(industry);
  if (!industry || !exams.length) return null;
  return exams.find((item) => item.id === state.currentExamId) || exams[0];
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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











/* ===== JNONO CLEAN FINAL TOGGLES PATCH START ===== */
(function () {
  function normalizeTier(value) {
    const raw = String(value || "").trim().toLowerCase();
    const map = {
      free: "trial",
      trial: "trial",
      basic: "basic",
      basic_399: "basic",
      pro: "pro",
      pro_599: "pro",
      paid: "pro",
      ai: "ai",
      ai_999: "ai",
      all: "ai"
    };
    return map[raw] || raw || "trial";
  }

  function deepFind(root, keys) {
    let result = null;
    const seen = new Set();
    function walk(obj) {
      if (!obj || typeof obj !== "object" || seen.has(obj) || result !== null) return;
      seen.add(obj);
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result = obj[key];
          return;
        }
      }
      if (Array.isArray(obj)) {
        for (const item of obj) walk(item);
      } else {
        for (const key of Object.keys(obj)) walk(obj[key]);
      }
    }
    walk(typeof state !== "undefined" ? state : {});
    return result;
  }

  function getTier() {
    return normalizeTier(deepFind(state, [
      "membershipTierNormalized",
      "membershipTier",
      "membership_tier",
      "membershipPlan",
      "membership_plan",
      "plan",
      "tier"
    ]));
  }

  function canChinese() {
    const tier = getTier();
    return tier === "pro" || tier === "ai";
  }

  function canAi() {
    return getTier() === "ai";
  }

  function userKey() {
    return String(
      deepFind(state, ["email"]) ||
      deepFind(state, ["username"]) ||
      "guest"
    ).trim().toLowerCase();
  }

  function prefKey(name) {
    return `jnono:${userKey()}:${name}`;
  }

  function readPref(name, fallback) {
    try {
      const raw = localStorage.getItem(prefKey(name));
      if (raw === null) return fallback;
      return raw === "1";
    } catch {
      return fallback;
    }
  }

  function writePref(name, value) {
    try {
      localStorage.setItem(prefKey(name), value ? "1" : "0");
    } catch {}
  }

  window.hasChineseAccessFlag = canChinese;
  window.hasExplanationAccessFlag = canAi;
  window.hasMemoryTipsAccessFlag = canAi;
  window.hasAiAnalysisAccessFlag = canAi;

  function ensureStyles() {
    if (document.getElementById("jnono-clean-toggle-style")) return;
    const style = document.createElement("style");
    style.id = "jnono-clean-toggle-style";
    style.textContent = `
      .jnono-toggle-row{
        display:flex;
        flex-wrap:wrap;
        gap:14px;
        align-items:center;
        margin-top:10px;
      }
      .jnono-toggle-card{
        display:inline-flex;
        align-items:center;
        gap:10px;
        min-height:56px;
        padding:0 16px;
        border:1px solid #d6deeb;
        border-radius:16px;
        background:#fff;
      }
      .jnono-toggle-card.hidden{display:none !important;}
      .jnono-switch{
        position:relative;
        width:56px;
        height:30px;
        border-radius:999px;
        border:1px solid #b8c4d6;
        background:#cbd5e1;
        cursor:pointer;
        transition:.18s ease;
        flex:0 0 auto;
      }
      .jnono-switch.on{
        background:#2563eb;
        border-color:#2563eb;
      }
      .jnono-switch.disabled{
        opacity:.45;
        cursor:not-allowed;
      }
      .jnono-switch::after{
        content:"";
        position:absolute;
        top:3px;
        left:3px;
        width:22px;
        height:22px;
        border-radius:50%;
        background:#fff;
        box-shadow:0 1px 3px rgba(0,0,0,.16);
        transition:transform .18s ease;
      }
      .jnono-switch.on::after{
        transform:translateX(26px);
      }
      .jnono-toggle-text{
        min-width:36px;
        font-size:13px;
        font-weight:700;
        color:#64748b;
      }
      .jnono-toggle-label{
        font-size:16px;
        font-weight:600;
        color:#253247;
      }
    `;
    document.head.appendChild(style);
  }

  function locateToolbarAnchor() {
    // try near timed mode checkbox first
    const timedInput = document.querySelector('input[type="checkbox"]');
    if (timedInput) {
      const card = timedInput.closest("label")?.parentElement || timedInput.parentElement;
      if (card && card.parentElement) return card.parentElement;
    }
    // fallback: inject near question count row
    const countSelect = document.querySelector("select");
    return countSelect?.parentElement?.parentElement || document.body;
  }

  function ensureToolbar() {
    ensureStyles();
    const anchor = locateToolbarAnchor();
    if (!anchor) return null;

    let row = document.getElementById("jnonoToggleRow");
    if (!row) {
      row = document.createElement("div");
      row.id = "jnonoToggleRow";
      row.className = "jnono-toggle-row";

      row.innerHTML = `
        <div class="jnono-toggle-card" id="jnonoChineseCard">
          <button type="button" class="jnono-switch" id="jnonoChineseSwitch"></button>
          <span class="jnono-toggle-text" id="jnonoChineseText">OFF</span>
          <span class="jnono-toggle-label">中文辅助</span>
        </div>
        <div class="jnono-toggle-card" id="jnonoAiCard">
          <button type="button" class="jnono-switch" id="jnonoAiSwitch"></button>
          <span class="jnono-toggle-text" id="jnonoAiText">OFF</span>
          <span class="jnono-toggle-label">AI辅助</span>
        </div>
      `;

      anchor.appendChild(row);
    }

    // hide old checkbox row if present
    const oldChineseInput = document.getElementById("showChineseToggle");
    if (oldChineseInput) {
      const oldLabel = oldChineseInput.closest("label");
      if (oldLabel) oldLabel.style.display = "none";
    }

    return row;
  }

  function setSwitch(id, enabled, on) {
    const btn = document.getElementById(id);
    const text = document.getElementById(id.replace("Switch", "Text"));
    if (!btn || !text) return;
    btn.disabled = !enabled;
    btn.classList.toggle("disabled", !enabled);
    btn.classList.toggle("on", !!on);
    text.textContent = on ? "ON" : "OFF";
  }

  function applyUiState() {
    ensureToolbar();

    const chineseAllowed = canChinese();
    const aiAllowed = canAi();

    if (typeof state.showChinese !== "boolean") {
      state.showChinese = chineseAllowed ? readPref("showChinese", true) : false;
    }
    if (!chineseAllowed) state.showChinese = false;

    if (typeof state.showAiAssist !== "boolean") {
      state.showAiAssist = aiAllowed ? readPref("showAiAssist", true) : false;
    }
    if (!aiAllowed) state.showAiAssist = false;

    const chineseCard = document.getElementById("jnonoChineseCard");
    const aiCard = document.getElementById("jnonoAiCard");

    if (chineseCard) chineseCard.classList.toggle("hidden", !chineseAllowed);
    if (aiCard) aiCard.classList.toggle("hidden", !aiAllowed);

    setSwitch("jnonoChineseSwitch", chineseAllowed, !!state.showChinese);
    setSwitch("jnonoAiSwitch", aiAllowed, !!state.showAiAssist);

    document.body.dataset.membershipTier = getTier();
    document.body.dataset.aiAssist = state.showAiAssist ? "1" : "0";
  }

  function rerenderIfNeeded() {
    try {
      if (typeof renderQuestion === "function" && typeof quizSection !== "undefined" && quizSection && !quizSection.classList.contains("hidden")) {
        renderQuestion();
      }
      if (typeof renderReview === "function" && typeof resultSection !== "undefined" && resultSection && !resultSection.classList.contains("hidden")) {
        renderReview(state?.lastWrongItems || []);
      }
    } catch (e) {
      console.warn("rerenderIfNeeded error:", e);
    }
  }

  function bindToolbar() {
    const chinese = document.getElementById("jnonoChineseSwitch");
    if (chinese && !chinese.dataset.bound) {
      chinese.dataset.bound = "1";
      chinese.addEventListener("click", () => {
        if (!canChinese()) return;
        state.showChinese = !state.showChinese;
        writePref("showChinese", state.showChinese);
        applyUiState();
        rerenderIfNeeded();
      });
    }

    const ai = document.getElementById("jnonoAiSwitch");
    if (ai && !ai.dataset.bound) {
      ai.dataset.bound = "1";
      ai.addEventListener("click", () => {
        if (!canAi()) return;
        state.showAiAssist = !state.showAiAssist;
        writePref("showAiAssist", state.showAiAssist);
        applyUiState();
        rerenderIfNeeded();
      });
    }
  }

  // locale compatibility: support prompt_zh / option_a_zh...
  if (typeof readLocale === "function" && !readLocale.__jnonoCleanPatch) {
    const oldReadLocale = readLocale;
    readLocale = function (question, locale) {
      const result = oldReadLocale(question, locale) || {};
      const lang = String(locale || "").trim().toLowerCase();

      if (lang === "zh") {
        const prompt = String(
          result.prompt ||
          question?.prompt_zh ||
          question?.question_text_zh ||
          question?.stem_zh ||
          ""
        ).trim();

        const options = [
          question?.option_a_zh || "",
          question?.option_b_zh || "",
          question?.option_c_zh || "",
          question?.option_d_zh || ""
        ].map(v => String(v || "").trim());

        return {
          ...result,
          prompt: prompt || result.prompt || "",
          options: (Array.isArray(result.options) && result.options.some(Boolean)) ? result.options : options,
          explanation: String(result.explanation || question?.explanation_zh || "").trim(),
          keyPoint: String(result.keyPoint || question?.key_point_zh || "").trim(),
          vocab: String(result.vocab || question?.vocab_zh || "").trim(),
          memoryTip: String(result.memoryTip || question?.memory_tip_zh || question?.memory_trick || "").trim(),
        };
      }

      if (lang === "en") {
        const prompt = String(
          result.prompt ||
          question?.prompt ||
          question?.question_text ||
          question?.stem ||
          ""
        ).trim();

        const options = [
          question?.option_a || "",
          question?.option_b || "",
          question?.option_c || "",
          question?.option_d || ""
        ].map(v => String(v || "").trim());

        return {
          ...result,
          prompt: prompt || result.prompt || "",
          options: (Array.isArray(result.options) && result.options.some(Boolean)) ? result.options : options,
          explanation: String(result.explanation || question?.explanation || "").trim(),
          keyPoint: String(result.keyPoint || question?.key_points || "").trim(),
          vocab: String(result.vocab || "").trim(),
          memoryTip: String(result.memoryTip || question?.memory_trick || "").trim(),
        };
      }

      return result;
    };
    readLocale.__jnonoCleanPatch = true;
  }

  // AI assist controls only explanation / memory helpers, not chinese prompt/options
  if (typeof renderChineseAssistPanel === "function" && !renderChineseAssistPanel.__jnonoCleanPatch) {
    const oldRenderChineseAssistPanel = renderChineseAssistPanel;
    renderChineseAssistPanel = function (view) {
      const nextView = Object.assign({}, view || {});
      nextView.showChineseAssist = !!state.showChinese;

      if (!state.showAiAssist) {
        if (nextView.chinese && typeof nextView.chinese === "object") {
          nextView.chinese = {
            ...nextView.chinese,
            explanation: "",
            keyPoint: "",
            vocab: "",
            memoryTip: ""
          };
        }
        if (nextView.english && typeof nextView.english === "object") {
          nextView.english = {
            ...nextView.english,
            explanation: "",
            keyPoint: "",
            vocab: "",
            memoryTip: ""
          };
        }
      }
      return oldRenderChineseAssistPanel(nextView);
    };
    renderChineseAssistPanel.__jnonoCleanPatch = true;
  }

  if (typeof renderQuestion === "function" && !renderQuestion.__jnonoCleanPatch) {
    const oldRenderQuestion = renderQuestion;
    renderQuestion = function (...args) {
      applyUiState();
      bindToolbar();
      return oldRenderQuestion.apply(this, args);
    };
    renderQuestion.__jnonoCleanPatch = true;
  }

  if (typeof renderReview === "function" && !renderReview.__jnonoCleanPatch) {
    const oldRenderReview = renderReview;
    renderReview = function (...args) {
      applyUiState();
      bindToolbar();
      return oldRenderReview.apply(this, args);
    };
    renderReview.__jnonoCleanPatch = true;
  }

  if (typeof syncMembership === "function" && !syncMembership.__jnonoCleanPatch) {
    const oldSyncMembership = syncMembership;
    syncMembership = async function (...args) {
      const result = await oldSyncMembership.apply(this, args);
      applyUiState();
      bindToolbar();
      return result;
    };
    syncMembership.__jnonoCleanPatch = true;
  }

  setTimeout(() => {
    applyUiState();
    bindToolbar();
  }, 0);
})();
/* ===== JNONO CLEAN FINAL TOGGLES PATCH END ===== */

/* ============================================================
   ROUND 1 JS: instant correct/wrong feedback for category mode
   Only fires when state.activeMode is "category" or "wrong-book"
   Does NOT fire in mock exam mode
   Date: 2026-04-22
   ============================================================ */
(function () {
  "use strict";

  function isFeedbackMode() {
    try {
      var m = (window.state && window.state.activeMode) || (typeof state !== "undefined" && state && state.activeMode) || "";
      return m === "category" || m === "wrong-book";
    } catch (e) { return false; }
  }

  function getCurrentQuestion() {
    try {
      var s = (typeof state !== "undefined" && state) ? state : (window.state || null);
      if (!s) return null;
      var list = s.quizQuestions || [];
      var idx = typeof s.currentIndex === "number" ? s.currentIndex : 0;
      return list[idx] || null;
    } catch (e) { return null; }
  }

  function getCorrectIndex(q) {
    if (!q) return -1;
    var candidates = [q.correctIndex, q.correct_index, q.answerIndex, q.answer_index, q.correctAnswer];
    for (var i = 0; i < candidates.length; i++) {
      var v = candidates[i];
      if (typeof v === "number" && v >= 0) return v;
      if (typeof v === "string" && /^[0-9]+$/.test(v)) return Number(v);
      if (typeof v === "string" && /^[A-Za-z]$/.test(v)) return v.toUpperCase().charCodeAt(0) - 65;
    }
    return -1;
  }

  function clearFeedback(container) {
    if (!container) return;
    var items = container.querySelectorAll(".option-item");
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove("jnono-correct", "jnono-wrong", "jnono-locked");
      var r = items[i].querySelector("input[type=radio]");
      if (r) r.disabled = false;
    }
  }

  function applyFeedback(container, selectedIdx, correctIdx) {
    if (!container) return;
    var items = container.querySelectorAll(".option-item");
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      el.classList.add("jnono-locked");
      var r = el.querySelector("input[type=radio]");
      if (i === correctIdx) el.classList.add("jnono-correct");
      else if (i === selectedIdx) el.classList.add("jnono-wrong");
      if (r && i !== selectedIdx) r.disabled = true;
    }
  }

  function onOptionChange(e) {
    if (!isFeedbackMode()) return;
    var target = e.target;
    if (!target || target.type !== "radio") return;
    var container = document.getElementById("options");
    if (!container || !container.contains(target)) return;
    var items = container.querySelectorAll(".option-item");
    var selectedIdx = -1;
    for (var i = 0; i < items.length; i++) {
      if (items[i].contains(target)) { selectedIdx = i; break; }
    }
    if (selectedIdx < 0) return;
    var q = getCurrentQuestion();
    var correctIdx = getCorrectIndex(q);
    if (correctIdx < 0) return;
    applyFeedback(container, selectedIdx, correctIdx);
  }

  function installListener() {
    var container = document.getElementById("options");
    if (!container) { setTimeout(installListener, 500); return; }
    container.addEventListener("change", onOptionChange, true);
    var observer = new MutationObserver(function () { clearFeedback(container); });
    observer.observe(container, { childList: true });
    console.log("[jnono-feedback] installed");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installListener);
  } else {
    installListener();
  }
})();


/* ============================================================
   [jnono-round3] Persistent correct/wrong feedback for category mode
   Survives renderQuestion re-renders triggered by sync heartbeats.
   Only fires in category or wrong-book mode.
   Feedback only clears when user clicks next/prev/submit button.
   Date: 2026-04-22
   ============================================================ */
(function () {
  "use strict";

  var feedbackState = { questionId: null, selectedIdx: -1, correctIdx: -1 };

  function isFeedbackMode() {
    try {
      var m = (typeof state !== "undefined" && state && state.activeMode) || (window.state && window.state.activeMode) || "";
      return m === "category" || m === "wrong-book";
    } catch (e) { return false; }
  }

  function getCurrentQuestion() {
    try {
      var s = (typeof state !== "undefined" && state) ? state : (window.state || null);
      if (!s) return null;
      var list = s.quizQuestions || [];
      var idx = typeof s.currentIndex === "number" ? s.currentIndex : 0;
      return list[idx] || null;
    } catch (e) { return null; }
  }

  function getQuestionId(q) {
    if (!q) return null;
    return q.id || q.question_id || q.questionId || null;
  }

  function getCorrectIndex(q) {
    if (!q) return -1;
    var candidates = [q.correctIndex, q.correct_index, q.answerIndex, q.answer_index, q.correctAnswer];
    for (var i = 0; i < candidates.length; i++) {
      var v = candidates[i];
      if (typeof v === "number" && v >= 0) return v;
      if (typeof v === "string" && /^[0-9]+$/.test(v)) return Number(v);
      if (typeof v === "string" && /^[A-Za-z]$/.test(v)) return v.toUpperCase().charCodeAt(0) - 65;
    }
    return -1;
  }

  function applyFeedbackToDom(container, selectedIdx, correctIdx) {
    if (!container) return;
    var items = container.querySelectorAll(".option-item");
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      el.classList.remove("jnono-correct", "jnono-wrong", "jnono-locked");
      var r = el.querySelector("input[type=radio]");
      if (r) r.disabled = false;
    }
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      el.classList.add("jnono-locked");
      var r = el.querySelector("input[type=radio]");
      if (i === correctIdx) el.classList.add("jnono-correct");
      else if (i === selectedIdx) el.classList.add("jnono-wrong");
      if (r && i !== selectedIdx) r.disabled = true;
      if (i === selectedIdx && r) r.checked = true;
    }
  }

  function clearFeedbackState() {
    feedbackState = { questionId: null, selectedIdx: -1, correctIdx: -1 };
    var container = document.getElementById("options");
    if (!container) return;
    var items = container.querySelectorAll(".option-item");
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove("jnono-correct", "jnono-wrong", "jnono-locked");
      var r = items[i].querySelector("input[type=radio]");
      if (r) r.disabled = false;
    }
  }

  function restoreFeedbackIfSameQuestion() {
    if (!isFeedbackMode()) return;
    var q = getCurrentQuestion();
    var qid = getQuestionId(q);
    if (!qid || !feedbackState.questionId) return;
    if (String(qid) !== String(feedbackState.questionId)) return;
    var container = document.getElementById("options");
    if (!container) return;
    applyFeedbackToDom(container, feedbackState.selectedIdx, feedbackState.correctIdx);
  }

  function onOptionChange(e) {
    if (!isFeedbackMode()) return;
    var target = e.target;
    if (!target || target.type !== "radio") return;
    var container = document.getElementById("options");
    if (!container || !container.contains(target)) return;
    var items = container.querySelectorAll(".option-item");
    var selectedIdx = -1;
    for (var i = 0; i < items.length; i++) {
      if (items[i].contains(target)) { selectedIdx = i; break; }
    }
    if (selectedIdx < 0) return;
    var q = getCurrentQuestion();
    var correctIdx = getCorrectIndex(q);
    var qid = getQuestionId(q);
    if (correctIdx < 0 || !qid) return;
    feedbackState = { questionId: qid, selectedIdx: selectedIdx, correctIdx: correctIdx };
    applyFeedbackToDom(container, selectedIdx, correctIdx);
  }

  function installRenderHook() {
    if (typeof renderQuestion !== "function") { setTimeout(installRenderHook, 500); return; }
    if (renderQuestion.__jnonoRound3Hooked) return;
    var original = renderQuestion;
    renderQuestion = function () {
      var result = original.apply(this, arguments);
      try { setTimeout(restoreFeedbackIfSameQuestion, 0); } catch (e) {}
      return result;
    };
    renderQuestion.__jnonoRound3Hooked = true;
  }

  function installClickListeners() {
    var container = document.getElementById("options");
    if (container) {
      container.addEventListener("change", onOptionChange, true);
    } else {
      setTimeout(installClickListeners, 500);
      return;
    }
    // Clear feedback when user clicks navigation buttons
    var clearBtns = ["quizShellNextBtn", "quizShellPrevBtn", "quizShellSubmitBtn", "quizShellSubmitBtnBottom",
                     "nextBtn", "prevBtn", "submitBtn"];
    for (var i = 0; i < clearBtns.length; i++) {
      var btn = document.getElementById(clearBtns[i]);
      if (btn) btn.addEventListener("click", clearFeedbackState, true);
    }
    console.log("[jnono-round3] persistent feedback installed");
  }

  function init() {
    installRenderHook();
    installClickListeners();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


/* ============================================================
   [jnono-round6] Mock exam result assessment card
   Only renders for mock mode; category mode unaffected.
   Hooks submitQuiz to add assessment after percent is shown.
   Date: 2026-04-22
   ============================================================ */
(function () {
  "use strict";

  function getTier(percent) {
    if (percent < 60) {
      return {
        cls: "tier-red",
        icon: "🔴",
        head: "距离稳定通过还有差距",
        sub: "当前分数偏低，不建议现在约考",
        tips: [
          "CSLB 采用难度加权评分，错题较多通过风险高",
          "建议先用「刷错题」功能攻克薄弱分类",
          "稳定达到 70% 以上再考虑下一步练习",
          "考场实际发挥通常比练习低 5-10%"
        ]
      };
    }
    if (percent < 70) {
      return {
        cls: "tier-orange",
        icon: "🟠",
        head: "接近边缘，但尚未稳定",
        sub: "看似接近过线，但现在约考风险较大",
        tips: [
          "CSLB 实际过线约 70% 正确率（± 5%）",
          "考场紧张、陌生环境通常降低 5-10% 发挥",
          "建议继续练 1-2 周，目标稳定 80%+",
          "优先使用「刷错题」把相同类型题做到几乎不错"
        ]
      };
    }
    if (percent < 80) {
      return {
        cls: "tier-yellow",
        icon: "🟡",
        head: "已达到实际过线区间",
        sub: "可以考虑约考，但还不够稳",
        tips: [
          "已达到 CSLB 实际通过的边缘（70%）",
          "考场降一档 = 可能跌回危险区",
          "建议继续刷题到 80%+ 再正式约考",
          "重点巩固最近 2 次模拟的错题分类"
        ]
      };
    }
    if (percent < 90) {
      return {
        cls: "tier-green",
        icon: "🟢",
        head: "稳过水平",
        sub: "基础扎实，一次通过机会很大",
        tips: [
          "当前水平足以应对 CSLB 常规题目",
          "可以开始约考，注意选择方便的考场时段",
          "考前一周保持每天 1 套模拟维持手感",
          "考前一晚早睡，考试当天提前到达考场熟悉环境"
        ]
      };
    }
    return {
      cls: "tier-blue",
      icon: "🔵",
      head: "优秀水平",
      sub: "掌握非常扎实，建议尽快约考",
      tips: [
        "当前水平超过稳过线，不要过度练习延迟约考",
        "考试有效期过后会重新收费，不建议长期不考",
        "注意考场时间分配：115题 / 210分钟，平均每题 1 分 50 秒",
        "遇到不确定的题先跳过，最后统一回头"
      ]
    };
  }

  function buildAssessHTML(percent) {
    var tier = getTier(percent);
    var tipsHtml = "";
    for (var i = 0; i < tier.tips.length; i++) {
      tipsHtml += "<li>" + tier.tips[i] + "</li>";
    }
    return '<div class="jnono-result-assess ' + tier.cls + '">' +
      '<div class="jnono-result-head">' +
      '<span class="jnono-result-icon">' + tier.icon + '</span>' +
      '<span>' + tier.head + '</span>' +
      '</div>' +
      '<div class="jnono-result-sub">' + tier.sub + '</div>' +
      '<div class="jnono-result-body"><strong>建议：</strong>' +
      '<ul>' + tipsHtml + '</ul>' +
      '</div>' +
      '</div>';
  }

  function renderAssessment() {
    try {
      var s = (typeof state !== "undefined" && state) ? state : (window.state || null);
      if (!s) return;
      if (s.activeMode !== "mock") return;
      var result = document.getElementById("resultSection");
      if (!result) return;
      var scoreEl = document.getElementById("scoreText");
      var percentStr = scoreEl ? (scoreEl.textContent || "").replace("%", "").trim() : "";
      var percent = Number(percentStr);
      if (!Number.isFinite(percent)) return;
      var existing = result.querySelector(".jnono-result-assess");
      if (existing) existing.remove();
      var tempDiv = document.createElement("div");
      tempDiv.innerHTML = buildAssessHTML(percent);
      var card = tempDiv.firstChild;
      // Insert after the score display if possible, otherwise prepend
      var scoreBlock = scoreEl ? scoreEl.closest(".panel-head, .result-head, section, div") : null;
      if (scoreBlock && scoreBlock.parentElement === result) {
        scoreBlock.insertAdjacentElement("afterend", card);
      } else {
        result.insertBefore(card, result.firstChild);
      }
    } catch (e) {
      console.warn("[jnono-round6] assessment render failed", e);
    }
  }

  function installHook() {
    if (typeof submitQuiz !== "function") { setTimeout(installHook, 500); return; }
    if (submitQuiz.__jnonoRound6Hooked) return;
    var original = submitQuiz;
    submitQuiz = async function () {
      var result = await original.apply(this, arguments);
      try { setTimeout(renderAssessment, 100); } catch (e) {}
      return result;
    };
    submitQuiz.__jnonoRound6Hooked = true;
    console.log("[jnono-round6] assessment hook installed");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installHook);
  } else {
    installHook();
  }
})();


/* ============================================================
   [jnono-round12] Ceremony: score count-up + confetti for 80%+
   Only fires for mock exam mode
   Date: 2026-04-22
   ============================================================ */
(function () {
  "use strict";

  function isMockMode() {
    try {
      var m = (typeof state !== "undefined" && state && state.activeMode) || "";
      return m === "mock";
    } catch (e) { return false; }
  }

  function animateScore(el, targetPercent, duration) {
    if (!el) return;
    var start = performance.now();
    var startVal = 0;
    function step(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(startVal + (targetPercent - startVal) * eased);
      el.textContent = current + "%";
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = targetPercent + "%";
        el.classList.add("jnono-settled");
        setTimeout(function () { el.classList.remove("jnono-settled"); }, 500);
      }
    }
    requestAnimationFrame(step);
  }

  function launchConfetti(durationMs) {
    var wrap = document.createElement("div");
    wrap.className = "jnono-confetti-wrap";
    document.body.appendChild(wrap);
    var colors = ["#16a34a", "#22c55e", "#eab308", "#3b82f6", "#ec4899", "#f97316", "#a855f7"];
    var pieceCount = 80;
    for (var i = 0; i < pieceCount; i++) {
      var piece = document.createElement("div");
      piece.className = "jnono-confetti-piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      var fallDuration = 2.5 + Math.random() * 2;
      var delay = Math.random() * 1.5;
      piece.style.animationDuration = fallDuration + "s";
      piece.style.animationDelay = delay + "s";
      piece.style.width = (6 + Math.random() * 8) + "px";
      piece.style.height = (10 + Math.random() * 10) + "px";
      wrap.appendChild(piece);
    }
    setTimeout(function () {
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }, durationMs);
  }

  function addTrophy(card, percent) {
    if (!card) return;
    if (card.querySelector(".jnono-trophy")) return;
    var trophy = document.createElement("div");
    trophy.className = "jnono-trophy";
    trophy.textContent = percent >= 90 ? "🏆" : "🎉";
    card.insertBefore(trophy, card.firstChild);
  }

  function runCeremony() {
    if (!isMockMode()) return;
    try {
      var scoreEl = document.getElementById("scoreText");
      if (!scoreEl) return;
      var percentStr = (scoreEl.textContent || "").replace("%", "").trim();
      var percent = Number(percentStr);
      if (!Number.isFinite(percent)) return;

      // 1. Animate score count-up
      animateScore(scoreEl, percent, 900);

      // 2. Add trophy + confetti for 80%+
      if (percent >= 80) {
        setTimeout(function () {
          var card = document.querySelector(".jnono-result-assess");
          if (card) addTrophy(card, percent);
          launchConfetti(5500);
        }, 800);
      }

      console.log("[round12] ceremony triggered, percent=" + percent);
    } catch (e) {
      console.warn("[round12] ceremony failed", e);
    }
  }

  function installHook() {
    if (typeof submitQuiz !== "function") { setTimeout(installHook, 500); return; }
    if (submitQuiz.__jnonoRound12Hooked) return;
    var original = submitQuiz;
    submitQuiz = async function () {
      var result = await original.apply(this, arguments);
      try { setTimeout(runCeremony, 250); } catch (e) {}
      return result;
    };
    submitQuiz.__jnonoRound12Hooked = true;
    console.log("[jnono-round12] ceremony hook installed");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installHook);
  } else {
    installHook();
  }
})();


/* ============================================================
   [jnono-round13] Modal result dialog (replaces inline result)
   Fires only for mock exam mode
   3 buttons: view wrong questions / retry / close
   Date: 2026-04-22
   ============================================================ */
(function () {
  "use strict";

  function isMockMode() {
    try {
      var m = (typeof state !== "undefined" && state && state.activeMode) || "";
      return m === "mock";
    } catch (e) { return false; }
  }

  var TIERS = {
    red: { cls: "tier-red", icon: "🔴", verdict: "距离稳定通过还有差距",
      tips: ["CSLB 采用难度加权评分，错题较多通过风险高","建议先用「刷错题」攻克薄弱分类","稳定达到 70% 以上再考虑下一步","考场实际发挥通常比练习低 5-10%"] },
    orange: { cls: "tier-orange", icon: "🟠", verdict: "接近边缘，但尚未稳定",
      tips: ["CSLB 实际过线约 70% 正确率（±5%）","考场紧张通常降低 5-10% 发挥","建议继续练 1-2 周，目标 80%+","优先把相同类型错题做到不错"] },
    yellow: { cls: "tier-yellow", icon: "🟡", verdict: "已达实际过线区间",
      tips: ["已达到 CSLB 实际通过的边缘（70%）","考场降一档 = 可能跌回危险区","建议刷到 80%+ 再正式约考","重点巩固最近 2 次错题分类"] },
    green: { cls: "tier-green", icon: "🎉", verdict: "稳过水平",
      tips: ["当前水平足以应对 CSLB 常规题目","可以开始约考，选方便的时段","考前一周每天 1 套模拟维持手感","考前一晚早睡，当天提前到达"] },
    blue: { cls: "tier-blue", icon: "🏆", verdict: "优秀水平",
      tips: ["水平超过稳过线，尽快约考","考试有效期过后会重新收费","注意 115 题 / 210 分钟 时间分配","不确定的题先跳过，最后回头"] }
  };

  function getTier(p) {
    if (p < 60) return TIERS.red;
    if (p < 70) return TIERS.orange;
    if (p < 80) return TIERS.yellow;
    if (p < 90) return TIERS.green;
    return TIERS.blue;
  }

  function launchConfetti(duration) {
    var wrap = document.createElement("div");
    wrap.className = "jnono-confetti-wrap";
    document.body.appendChild(wrap);
    var colors = ["#16a34a","#22c55e","#eab308","#3b82f6","#ec4899","#f97316","#a855f7"];
    for (var i = 0; i < 80; i++) {
      var piece = document.createElement("div");
      piece.className = "jnono-confetti-piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (2.5 + Math.random() * 2) + "s";
      piece.style.animationDelay = (Math.random() * 1.5) + "s";
      piece.style.width = (6 + Math.random() * 8) + "px";
      piece.style.height = (10 + Math.random() * 10) + "px";
      wrap.appendChild(piece);
    }
    setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, duration);
  }

  function animateScore(el, target, duration) {
    var start = performance.now();
    function step(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + "%";
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target + "%";
    }
    requestAnimationFrame(step);
  }

  function closeModal() {
    var bd = document.querySelector(".jnono-result-modal-backdrop");
    if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
    try { if (typeof closeQuizShell === "function") closeQuizShell(); } catch (e) {}
  }

  function showWrongReview() {
    // [jnono-round14] Show wrong-question review as a new modal
    var bd = document.querySelector(".jnono-result-modal-backdrop");
    if (bd && bd.parentNode) bd.parentNode.removeChild(bd);

    try {
      // [round14b] Force-enable chinese & ai assist temporarily so renderReview shows ALL tier-allowed content
      var _savedShowChinese = state.showChinese;
      var _savedShowAi = state.showAiAssist;
      state.showChinese = true;
      state.showAiAssist = true;
      try {
        if (typeof renderReview === "function" && state.lastWrongItems) {
          renderReview(state.lastWrongItems);
        }
      } catch (reErr) { console.warn("[round14b] re-render failed", reErr); }
      state.showChinese = _savedShowChinese;
      state.showAiAssist = _savedShowAi;

      var reviewList = document.getElementById("reviewList");
      var wrongItems = (typeof state !== "undefined" && state && state.lastWrongItems) || [];
      var wrongCount = wrongItems.length;

      var newBd = document.createElement("div");
      newBd.className = "jnono-result-modal-backdrop";

      var modal = document.createElement("div");
      modal.className = "jnono-result-modal jnono-review-modal";

      var bodyHtml = "";
      if (wrongCount === 0) {
        bodyHtml = '<div class="jnono-review-empty"><span class="emoji">🎉</span>本次全部答对，没有错题需要复习！</div>';
      } else if (reviewList && reviewList.innerHTML.trim()) {
        bodyHtml = '<div class="jnono-review-body">' + reviewList.innerHTML + '</div>';
      } else {
        bodyHtml = '<div class="jnono-review-empty">错题正在加载中...</div>';
      }

      modal.innerHTML =
        '<button class="jnono-result-close" aria-label="Close">&times;</button>' +
        '<div class="jnono-review-head">本次错题回顾</div>' +
        '<div class="jnono-review-sub">共 ' + wrongCount + ' 道错题 · 已加入你的错题本</div>' +
        bodyHtml +
        '<div class="jnono-modal-actions">' +
          '<button class="primary jnono-btn-close-review">关闭</button>' +
        '</div>';

      newBd.appendChild(modal);
      document.body.appendChild(newBd);

      var closeReviewModal = function () {
        if (newBd && newBd.parentNode) newBd.parentNode.removeChild(newBd);
        try { if (typeof closeQuizShell === "function") closeQuizShell(); } catch (e) {}
      };
      modal.querySelector(".jnono-result-close").addEventListener("click", closeReviewModal);
      modal.querySelector(".jnono-btn-close-review").addEventListener("click", closeReviewModal);
      newBd.addEventListener("click", function (e) { if (e.target === newBd) closeReviewModal(); });
      modal.addEventListener("click", function (e) { e.stopPropagation(); });

      console.log("[round14] wrong review modal shown, count=" + wrongCount);
    } catch (e) {
      console.warn("[round14] review modal failed", e);
    }
  }

  function retryExam() {
    closeModal();
    setTimeout(function () {
      var startMockBtn = document.querySelector("[data-action='start-mock'], #startMockBtn, .start-mock-btn");
      if (startMockBtn) { startMockBtn.click(); return; }
      // Fallback: scroll to mock card and let user click manually
      var mockCard = document.querySelector(".mock-exam-card, [data-module='mock'], #practiceCenterSection");
      if (mockCard) mockCard.scrollIntoView({ behavior: "smooth" });
      console.log("[round13] retry: please click 开始模拟考试 to start again");
    }, 400);
  }

  function buildModal(percent, correct, total, wrongCount) {
    var tier = getTier(percent);
    var tipsHtml = tier.tips.map(function (t) { return "<li>" + t + "</li>"; }).join("");

    var bd = document.createElement("div");
    bd.className = "jnono-result-modal-backdrop";

    var modal = document.createElement("div");
    modal.className = "jnono-result-modal " + tier.cls;

    var timeUpBanner = (typeof state !== "undefined" && state && state._timeUpAutoSubmit)
      ? '<div class="jnono-modal-timeup-banner">⏰ 考试时间到，系统已自动交卷</div>'
      : '';
    if (typeof state !== "undefined" && state) state._timeUpAutoSubmit = false;

    modal.innerHTML =
      '<button class="jnono-result-close" aria-label="Close">&times;</button>' +
      timeUpBanner +
      '<div class="jnono-modal-icon">' + tier.icon + '</div>' +
      '<div class="jnono-modal-score" data-target="' + percent + '">0%</div>' +
      '<div class="jnono-modal-verdict">' + tier.verdict + '</div>' +
      '<div class="jnono-modal-stats">' +
        '<div><strong>' + correct + '/' + total + '</strong><span>答对</span></div>' +
        '<div><strong>' + wrongCount + '</strong><span>错题</span></div>' +
      '</div>' +
      '<div class="jnono-modal-advice">' +
        '<div class="jnono-modal-advice-head">建议</div>' +
        '<ul>' + tipsHtml + '</ul>' +
      '</div>' +
      '<div class="jnono-modal-actions">' +
        '<button class="jnono-btn-review">查看错题</button>' +
        '<button class="jnono-btn-retry">再做一次</button>' +
        '<button class="primary jnono-btn-close">关闭</button>' +
      '</div>';

    bd.appendChild(modal);

    // Event bindings
    modal.querySelector(".jnono-result-close").addEventListener("click", closeModal);
    modal.querySelector(".jnono-btn-close").addEventListener("click", closeModal);
    modal.querySelector(".jnono-btn-review").addEventListener("click", showWrongReview);
    modal.querySelector(".jnono-btn-retry").addEventListener("click", retryExam);

    // Click backdrop to close
    bd.addEventListener("click", function (e) { if (e.target === bd) closeModal(); });

    // Prevent backdrop click from closing when clicking inside modal
    modal.addEventListener("click", function (e) { e.stopPropagation(); });

    return bd;
  }

  function showResultModal() {
    if (!isMockMode()) return;
    try {
      var scoreEl = document.getElementById("scoreText");
      var rightEl = document.getElementById("rightText");
      var wrongEl = document.getElementById("wrongText");
      var percent = Number((scoreEl?.textContent || "").replace("%", "").trim()) || 0;
      var rightTxt = (rightEl?.textContent || "0 / 0").trim();
      var wrongTxt = (wrongEl?.textContent || "0").trim();
      var parts = rightTxt.split("/").map(function (x) { return x.trim(); });
      var correct = Number(parts[0]) || 0;
      var total = Number(parts[1]) || 0;
      var wrongCount = Number(wrongTxt) || 0;

      var bd = buildModal(percent, correct, total, wrongCount);
      document.body.appendChild(bd);

      // Animate the score number inside the modal
      var modalScore = bd.querySelector(".jnono-modal-score");
      if (modalScore) animateScore(modalScore, percent, 900);

      // Confetti for 80%+
      if (percent >= 80) {
        setTimeout(function () { launchConfetti(5500); }, 400);
      }

      console.log("[round13] modal shown, percent=" + percent);
    } catch (e) {
      console.warn("[round13] modal failed", e);
    }
  }

  function installHook() {
    if (typeof submitQuiz !== "function") { setTimeout(installHook, 500); return; }
    if (submitQuiz.__jnonoRound13Hooked) return;
    var original = submitQuiz;
    submitQuiz = async function () {
      var result = await original.apply(this, arguments);
      try { setTimeout(showResultModal, 200); } catch (e) {}
      return result;
    };
    submitQuiz.__jnonoRound13Hooked = true;
    console.log("[jnono-round13] modal hook installed");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installHook);
  } else {
    installHook();
  }
})();

/* [jnono-phaseC] Auto-hide single-option fields (future-proof: reappears when options >= 2) */
(function(){
  "use strict";
  var FIELD_IDS = ["industrySelect","examFamilySelect","tradeSelect","examTypeSelect"];
  function updateFieldVisibility(){
    try {
      FIELD_IDS.forEach(function(id){
        var sel = document.getElementById(id);
        if (!sel) return;
        var lbl = sel.closest("label");
        if (!lbl) return;
        var count = sel.querySelectorAll("option").length;
        lbl.style.display = (count <= 1) ? "none" : "";
      });
    } catch(e) { console.warn("[jnono-phaseC]", e); }
  }
  function install(){
    var catalog = document.getElementById("catalog");
    if (!catalog) { setTimeout(install, 500); return; }
    updateFieldVisibility();
    var obs = new MutationObserver(updateFieldVisibility);
    obs.observe(catalog, { childList: true, subtree: true });
    console.log("[jnono-phaseC] single-option field auto-hide installed");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else { install(); }
})();

// ============================================================
// Image lightbox (added 2026-04-23)
// Shows image fullscreen with overlay. Close by: click overlay, click X, press ESC.
// ============================================================
function openImageLightbox(imageUrl, caption) {
  if (!imageUrl) return;
  // If already open, close first (clean slate)
  const existing = document.getElementById("jnono-image-lightbox");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "jnono-image-lightbox";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(0, 0, 0, 0.82)",
    zIndex: "100001",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    cursor: "zoom-out",
    animation: "jnonoLightboxFadeIn 0.18s ease-out",
  });

  // Close button (top-right)
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "✕";
  Object.assign(closeBtn.style, {
    position: "absolute",
    top: "16px",
    right: "20px",
    width: "44px",
    height: "44px",
    border: "none",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.15)",
    color: "#fff",
    fontSize: "22px",
    fontWeight: "300",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s",
  });
  closeBtn.addEventListener("mouseenter", () => {
    closeBtn.style.background = "rgba(255, 255, 255, 0.28)";
  });
  closeBtn.addEventListener("mouseleave", () => {
    closeBtn.style.background = "rgba(255, 255, 255, 0.15)";
  });

  // Big image
  const bigImg = document.createElement("img");
  bigImg.src = imageUrl;
  bigImg.alt = caption || "Question image";
  Object.assign(bigImg.style, {
    maxWidth: "min(96vw, 1400px)",
    maxHeight: caption ? "82vh" : "92vh",
    objectFit: "contain",
    borderRadius: "8px",
    boxShadow: "0 8px 40px rgba(0, 0, 0, 0.6)",
    cursor: "default",
  });
  // Click on the image itself should NOT close
  bigImg.addEventListener("click", (e) => e.stopPropagation());

  // Optional caption
  if (caption) {
    const capEl = document.createElement("div");
    capEl.textContent = caption;
    Object.assign(capEl.style, {
      marginTop: "14px",
      color: "#e6ecf5",
      fontSize: "14px",
      textAlign: "center",
      maxWidth: "90vw",
      cursor: "default",
    });
    capEl.addEventListener("click", (e) => e.stopPropagation());
    overlay.appendChild(bigImg);
    overlay.appendChild(capEl);
  } else {
    overlay.appendChild(bigImg);
  }
  overlay.appendChild(closeBtn);

  // === Close logic ===
  function closeLightbox() {
    overlay.remove();
    document.removeEventListener("keydown", onKeyDown);
    // Restore body scroll
    document.body.style.overflow = prevOverflow;
  }
  function onKeyDown(e) {
    if (e.key === "Escape") closeLightbox();
  }
  // Click overlay (but not image/caption) closes
  overlay.addEventListener("click", closeLightbox);
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeLightbox();
  });
  document.addEventListener("keydown", onKeyDown);

  // Lock body scroll while open
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  // Inject keyframe once
  if (!document.getElementById("jnono-lightbox-style")) {
    const styleEl = document.createElement("style");
    styleEl.id = "jnono-lightbox-style";
    styleEl.textContent =
      "@keyframes jnonoLightboxFadeIn { from { opacity: 0; } to { opacity: 1; } }";
    document.head.appendChild(styleEl);
  }

  document.body.appendChild(overlay);
}




/* ============================================================
   STEP 3: sync data-chinese-assist + data-ai-assist from button text
   Reads button textContent (reliable) instead of window.state (undefined)
   Date: 2026-04-26
   ============================================================ */
(function syncAssistAttrsFromButtons(){
  function update(){
    try {
      var zhBtn = document.getElementById("quizShellChineseToggleBtn");
      var aiBtn = document.getElementById("quizShellAiToggleBtn");
      var zhOn = !!(zhBtn && zhBtn.textContent && zhBtn.textContent.indexOf("ON") !== -1);
      var aiOn = !!(aiBtn && aiBtn.textContent && aiBtn.textContent.indexOf("ON") !== -1);
      document.body.dataset.chineseAssist = zhOn ? "1" : "0";
      document.body.dataset.aiAssist = aiOn ? "1" : "0";
    } catch(e){}
  }
  setInterval(update, 500);
  update();
  console.log("[jnono-step3] button-text watcher installed");
})();

// ===== Mobile Bottom Tab Bar =====
(function initMobileTabBar() {
  const bar = document.getElementById("mobileTabBar");
  if (!bar) return;

  function syncTabBar() {
    const views = {
      home: document.getElementById("memberViewDashboard"),
      practice: document.getElementById("memberViewPractice"),
      progress: document.getElementById("memberViewProgress"),
    };
    let active = "home";
    for (const [tab, el] of Object.entries(views)) {
      if (el && !el.classList.contains("hidden")) { active = tab; break; }
    }
    // account center lives inside the placeholder view
    const acctPanel = document.getElementById("accountCenterSection");
    if (acctPanel && !acctPanel.classList.contains("hidden")) active = "account";
    bar.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === active);
    });
  }

  // Watch view elements for class changes to keep tab in sync
  ["memberViewDashboard", "memberViewPractice", "memberViewProgress", "accountCenterSection"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) new MutationObserver(syncTabBar).observe(el, { attributes: true, attributeFilter: ["class"] });
  });

  bar.addEventListener("click", function (e) {
    const btn = e.target.closest(".tab-btn[data-tab]");
    if (!btn) return;
    const tab = btn.dataset.tab;
    if (tab === "home") {
      setMemberView("dashboard");
    } else if (tab === "practice") {
      if (typeof practiceMode !== "undefined" && practiceMode) { practiceMode.value = "category"; onModeChange(); }
      setMemberView("practice", { preserveNav: true });
      if (typeof jumpToTrainingSection === "function") jumpToTrainingSection("practice");
    } else if (tab === "account") {
      if (typeof showAccountSettingsCenter === "function") showAccountSettingsCenter();
    } else if (tab === "progress") {
      setMemberView("progress");
    }
  });

  // Topbar welcome text → account settings (desktop shortcut)
  const welcomeEl = document.getElementById("welcomeText");
  if (welcomeEl) {
    welcomeEl.addEventListener("click", () => {
      if (typeof showAccountSettingsCenter === "function") showAccountSettingsCenter();
    });
  }

  syncTabBar();
})();

// ===== Quiz Shell: swipe to navigate questions =====
(function initQuizSwipe() {
  const overlay = document.getElementById("quizShellOverlay");
  if (!overlay) return;
  let sx = 0, sy = 0, st = 0;
  overlay.addEventListener("touchstart", (e) => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    st = Date.now();
  }, { passive: true });
  overlay.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    const dt = Date.now() - st;
    if (dt < 400 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      moveQuestion(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
})();
