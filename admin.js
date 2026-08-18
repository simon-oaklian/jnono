const ADMIN_TOKEN_KEY = "jnono-admin-token-v1";
const API_BASE = /^https?:\/\//i.test(window.location.origin || "") ? window.location.origin : "";

const adminWelcome = document.getElementById("adminWelcome");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const adminLoginPanel = document.getElementById("adminLoginPanel");
const adminPanel = document.getElementById("adminPanel");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmailInput = document.getElementById("adminEmailInput");
const adminPasswordInput = document.getElementById("adminPasswordInput");
const adminLoginError = document.getElementById("adminLoginError");

const reloadUsersBtn = document.getElementById("reloadUsersBtn");
const saveUsersBtn = document.getElementById("saveUsersBtn");
const usersHeadRow = document.getElementById("usersHeadRow");
const usersTbody = document.getElementById("usersTbody");
const adminSaveMsg = document.getElementById("adminSaveMsg");
const showArchivedUsersToggle = document.getElementById("showArchivedUsersToggle");
const siteWechatInput = document.getElementById("siteWechatInput");
const saveSiteSettingsBtn = document.getElementById("saveSiteSettingsBtn");
const reloadSiteSettingsBtn = document.getElementById("reloadSiteSettingsBtn");
const siteSettingsMsg = document.getElementById("siteSettingsMsg");
const pricingPromoEnabledInput = document.getElementById("pricingPromoEnabledInput");
const pricingPromoEndAtInput = document.getElementById("pricingPromoEndAtInput");
const basicOriginalPriceInput = document.getElementById("basicOriginalPriceInput");
const basicPromoPriceInput = document.getElementById("basicPromoPriceInput");
const basicDurationTextInput = document.getElementById("basicDurationTextInput");
const professionalOriginalPriceInput = document.getElementById("professionalOriginalPriceInput");
const professionalPromoPriceInput = document.getElementById("professionalPromoPriceInput");
const professionalDurationTextInput = document.getElementById("professionalDurationTextInput");
const professionalRecommendedInput = document.getElementById("professionalRecommendedInput");
const aiOriginalPriceInput = document.getElementById("aiOriginalPriceInput");
const aiPromoPriceInput = document.getElementById("aiPromoPriceInput");
const aiDurationTextInput = document.getElementById("aiDurationTextInput");
const sitePricingRuntimeHint = document.getElementById("sitePricingRuntimeHint");
const userAssignSelect = document.getElementById("userAssignSelect");
const progressUserSearchInput = document.getElementById("progressUserSearchInput");
const progressUserSearchResults = document.getElementById("progressUserSearchResults");
const progressSelectedUserLabel = document.getElementById("progressSelectedUserLabel");
const progressAssignedExamOptions = document.getElementById("progressAssignedExamOptions");
const progressAssignedExamSummary = document.getElementById("progressAssignedExamSummary");
const progressSummaryName = document.getElementById("progressSummaryName");
const progressSummaryEmail = document.getElementById("progressSummaryEmail");
const progressSummaryExams = document.getElementById("progressSummaryExams");
const progressSummaryPercent = document.getElementById("progressSummaryPercent");
const progressSummaryApplication = document.getElementById("progressSummaryApplication");
const progressSummaryScheduled = document.getElementById("progressSummaryScheduled");
const progressSummaryTier = document.getElementById("progressSummaryTier");
const progressSummaryUpdated = document.getElementById("progressSummaryUpdated");
const userAssignNameInput = document.getElementById("userAssignNameInput");
const userAssignNicknameInput = document.getElementById("userAssignNicknameInput");
const userAssignEmailInput = document.getElementById("userAssignEmailInput");
const userAssignPhoneInput = document.getElementById("userAssignPhoneInput");
const userAssignTierInput = document.getElementById("userAssignTierInput");
const userAssignMembershipTierInput = document.getElementById("userAssignMembershipTierInput");
const userAssignAccountStatusInput = document.getElementById("userAssignAccountStatusInput");
const userAssignMembershipExpiresInput = document.getElementById("userAssignMembershipExpiresInput");
const memberSummaryName = document.getElementById("memberSummaryName");
const memberSummaryNickname = document.getElementById("memberSummaryNickname");
const memberSummaryEmail = document.getElementById("memberSummaryEmail");
const memberSummaryPhone = document.getElementById("memberSummaryPhone");
const memberSummaryTier = document.getElementById("memberSummaryTier");
const memberSummaryStatus = document.getElementById("memberSummaryStatus");
const memberSummaryExams = document.getElementById("memberSummaryExams");
const memberSummaryExpires = document.getElementById("memberSummaryExpires");
const memberSummaryNotes = document.getElementById("memberSummaryNotes");
const memberPermissionEffectiveHint = document.getElementById("memberPermissionEffectiveHint");
const assignedExamCodesInput = document.getElementById("assignedExamCodesInput");
const assignedModuleTagsInput = document.getElementById("assignedModuleTagsInput");
const userBilingualEnabledInput = document.getElementById("userBilingualEnabledInput");
const userExplanationEnabledInput = document.getElementById("userExplanationEnabledInput");
const userMemoryTipsEnabledInput = document.getElementById("userMemoryTipsEnabledInput");
const progressEnrolledInput = document.getElementById("progressEnrolledInput");
const progressApplicationNumberInput = document.getElementById("progressApplicationNumberInput");
const progressPercentInput = document.getElementById("progressPercentInput");
const progressExamDateInput = document.getElementById("progressExamDateInput");
const progressStudyStartedInput = document.getElementById("progressStudyStartedInput");
const progressExamScheduledInput = document.getElementById("progressExamScheduledInput");
const progressExamPassedInput = document.getElementById("progressExamPassedInput");
const progressNotesInput = document.getElementById("progressNotesInput");
const reloadUserAssignmentBtn = document.getElementById("reloadUserAssignmentBtn");
const saveUserAssignmentBtn = document.getElementById("saveUserAssignmentBtn");
const userAssignmentMsg = document.getElementById("userAssignmentMsg");
const dashboardModuleCodeInput = document.getElementById("dashboardModuleCodeInput");
const dashboardModuleTitleInput = document.getElementById("dashboardModuleTitleInput");
const dashboardModuleTypeInput = document.getElementById("dashboardModuleTypeInput");
const dashboardRouteTypeInput = document.getElementById("dashboardRouteTypeInput");
const dashboardRouteTargetInput = document.getElementById("dashboardRouteTargetInput");
const dashboardLinkedExamCodeInput = document.getElementById("dashboardLinkedExamCodeInput");
const dashboardVisibleExamCodesInput = document.getElementById("dashboardVisibleExamCodesInput");
const dashboardVisibleTiersInput = document.getElementById("dashboardVisibleTiersInput");
const dashboardSortOrderInput = document.getElementById("dashboardSortOrderInput");
const dashboardBadgeTextInput = document.getElementById("dashboardBadgeTextInput");
const dashboardModuleEnabledInput = document.getElementById("dashboardModuleEnabledInput");
const dashboardModulePlaceholderInput = document.getElementById("dashboardModulePlaceholderInput");
const createDashboardModuleBtn = document.getElementById("createDashboardModuleBtn");
const reloadDashboardModulesBtn = document.getElementById("reloadDashboardModulesBtn");
const dashboardModulesTbody = document.getElementById("dashboardModulesTbody");
const dashboardModulesMsg = document.getElementById("dashboardModulesMsg");
const courseContentCodeInput = document.getElementById("courseContentCodeInput");
const courseContentTitleInput = document.getElementById("courseContentTitleInput");
const courseContentTypeInput = document.getElementById("courseContentTypeInput");
const courseLinkedExamCodeInput = document.getElementById("courseLinkedExamCodeInput");
const courseAccessTierInput = document.getElementById("courseAccessTierInput");
const courseSortOrderInput = document.getElementById("courseSortOrderInput");
const courseEnabledInput = document.getElementById("courseEnabledInput");
const coursePlaceholderInput = document.getElementById("coursePlaceholderInput");
const courseDescriptionInput = document.getElementById("courseDescriptionInput");
const createCourseContentBtn = document.getElementById("createCourseContentBtn");
const reloadCourseContentsBtn = document.getElementById("reloadCourseContentsBtn");
const courseContentsTbody = document.getElementById("courseContentsTbody");
const courseContentsMsg = document.getElementById("courseContentsMsg");

const categoryKeyInput = document.getElementById("categoryKeyInput");
const categoryNameInput = document.getElementById("categoryNameInput");
const categorySortInput = document.getElementById("categorySortInput");
const categoryEnabledInput = document.getElementById("categoryEnabledInput");
const createCategoryBtn = document.getElementById("createCategoryBtn");
const reloadCategoriesBtn = document.getElementById("reloadCategoriesBtn");
const categoriesTbody = document.getElementById("categoriesTbody");
const categoryMsg = document.getElementById("categoryMsg");
const examCategoryManageExamSelect = document.getElementById("examCategoryManageExamSelect");
const examCategoryCodeInput = document.getElementById("examCategoryCodeInput");
const examCategoryNameInput = document.getElementById("examCategoryNameInput");
const examCategoryNameZhInput = document.getElementById("examCategoryNameZhInput");
const examCategorySortInput = document.getElementById("examCategorySortInput");
const examCategoryEnabledInput = document.getElementById("examCategoryEnabledInput");
const createExamCategoryBtn = document.getElementById("createExamCategoryBtn");
const reloadExamCategoriesBtn = document.getElementById("reloadExamCategoriesBtn");
const examCategoriesTbody = document.getElementById("examCategoriesTbody");
const examCategoryMsg = document.getElementById("examCategoryMsg");

const examIndustryKeyInput = document.getElementById("examIndustryKeyInput");
const examIndustryNameInput = document.getElementById("examIndustryNameInput");
const examFamilyKeyInput = document.getElementById("examFamilyKeyInput");
const examFamilyNameInput = document.getElementById("examFamilyNameInput");
const examTradeCodeInput = document.getElementById("examTradeCodeInput");
const examTypeInput = document.getElementById("examTypeInput");
const examNameInput = document.getElementById("examNameInput");
const examCategorySelectInput = document.getElementById("examCategorySelectInput");
const examQuestionCountInput = document.getElementById("examQuestionCountInput");
const examTimeMinutesInput = document.getElementById("examTimeMinutesInput");
const examSortOrderInput = document.getElementById("examSortOrderInput");
const examEnabledInput = document.getElementById("examEnabledInput");
const examCreateHint = document.getElementById("examCreateHint");
const createExamCatalogBtn = document.getElementById("createExamCatalogBtn");
const reloadExamCatalogBtn = document.getElementById("reloadExamCatalogBtn");
const examCatalogTbody = document.getElementById("examCatalogTbody");
const examCatalogMsg = document.getElementById("examCatalogMsg");
const structureProgramKeyInput = document.getElementById("structureProgramKeyInput");
const structureProgramNameInput = document.getElementById("structureProgramNameInput");
const structureProgramSortOrderInput = document.getElementById("structureProgramSortOrderInput");
const structureProgramEnabledInput = document.getElementById("structureProgramEnabledInput");
const createStructureProgramBtn = document.getElementById("createStructureProgramBtn");
const structureSubItemProgramSelect = document.getElementById("structureSubItemProgramSelect");
const structureSubItemKeyInput = document.getElementById("structureSubItemKeyInput");
const structureSubItemNameInput = document.getElementById("structureSubItemNameInput");
const structureSubItemSortOrderInput = document.getElementById("structureSubItemSortOrderInput");
const structureSubItemEnabledInput = document.getElementById("structureSubItemEnabledInput");
const createStructureSubItemBtn = document.getElementById("createStructureSubItemBtn");
const reloadExamStructureBtn = document.getElementById("reloadExamStructureBtn");
const examStructureTbody = document.getElementById("examStructureTbody");
const examStructureMsg = document.getElementById("examStructureMsg");

const csvFileInput = document.getElementById("csvFileInput");
const importProjectSelect = document.getElementById("importProjectSelect");
const importSubItemSelect = document.getElementById("importSubItemSelect");
const importExamTypeSelect = document.getElementById("importExamTypeSelect");
const importCategorySelect = document.getElementById("importCategorySelect");
const importModeSelect = document.getElementById("importModeSelect");
const importExamSelect = document.getElementById("importExamSelect");
const importCategoryCodeSelect = document.getElementById("importCategoryCodeSelect");
const importDuplicateModeSelect = document.getElementById("importDuplicateModeSelect");
const importAutoCreateCategoryInput = document.getElementById("importAutoCreateCategoryInput");
const importCsvBtn = document.getElementById("importCsvBtn");
const refreshBankStatsBtn = document.getElementById("refreshBankStatsBtn");
const exportBankCsvBtn = document.getElementById("exportBankCsvBtn");
const exportBankBtn = document.getElementById("exportBankBtn");
const resetBankBtn = document.getElementById("resetBankBtn");
const importMsg = document.getElementById("importMsg");
const bankStats = document.getElementById("bankStats");
const reviewExamSelect = document.getElementById("reviewExamSelect");
const reviewQuestionSelect = document.getElementById("reviewQuestionSelect");
const reviewPromptEn = document.getElementById("reviewPromptEn");
const reviewPromptZh = document.getElementById("reviewPromptZh");
const reviewOptionsEn = document.getElementById("reviewOptionsEn");
const reviewOptionsZh = document.getElementById("reviewOptionsZh");
const reviewExplanationEn = document.getElementById("reviewExplanationEn");
const reviewMemoryTrick = document.getElementById("reviewMemoryTrick");
const reviewExplanationZh = document.getElementById("reviewExplanationZh");
const reviewKeyPointEn = document.getElementById("reviewKeyPointEn");
const reviewKeyPointZh = document.getElementById("reviewKeyPointZh");
const reviewReasoningEn = document.getElementById("reviewReasoningEn");
const reviewReasoningZh = document.getElementById("reviewReasoningZh");
const reviewQuestionTypeZh = document.getElementById("reviewQuestionTypeZh");
const reviewTranslationStatus = document.getElementById("reviewTranslationStatus");
const reviewQuestionStatus = document.getElementById("reviewQuestionStatus");
const reviewTargetExamSelect = document.getElementById("reviewTargetExamSelect");
const saveReviewBtn = document.getElementById("saveReviewBtn");
const reviewSaveMsg = document.getElementById("reviewSaveMsg");
const qmCategoryFilter = document.getElementById("qmCategoryFilter");
const qmExamFilter = document.getElementById("qmExamFilter");
const qmStatusFilter = document.getElementById("qmStatusFilter");
const qmIncludeDeletedToggle = document.getElementById("qmIncludeDeletedToggle");
const qmKeywordInput = document.getElementById("qmKeywordInput");
const qmSearchBtn = document.getElementById("qmSearchBtn");
const qmResetBtn = document.getElementById("qmResetBtn");
const qmRefreshBtn = document.getElementById("qmRefreshBtn");
const qmTbody = document.getElementById("qmTbody");
const qmPrevBtn = document.getElementById("qmPrevBtn");
const qmNextBtn = document.getElementById("qmNextBtn");
const qmPageInfo = document.getElementById("qmPageInfo");
const qmMsg = document.getElementById("qmMsg");
const qmSelectPageBtn = document.getElementById("qmSelectPageBtn");
const qmClearSelectionBtn = document.getElementById("qmClearSelectionBtn");
const qmBulkInactiveBtn = document.getElementById("qmBulkInactiveBtn");
const qmBulkActiveBtn = document.getElementById("qmBulkActiveBtn");
const qmBulkDeleteBtn = document.getElementById("qmBulkDeleteBtn");
const qmSelectedCount = document.getElementById("qmSelectedCount");

const state = {
  token: "",
  reviewExamId: "",
  reviewQuestionId: "",
  reviewQuestions: [],
  categories: [],
  examCategories: [],
  examCatalog: [],
  examStructureNodes: [],
  adminUsers: [],
  dashboardModules: [],
  courseContents: [],
  selectedAssignUserId: "",
  importProjectKey: "",
  importSubItemCode: "",
  importExamType: "",
  importExamCode: "",
  questionManagerPage: 1,
  questionManagerPageSize: 20,
  questionManagerTotal: 0,
  questionManagerTotalPages: 1,
  questionManagerItems: [],
  questionManagerSelectedKeys: new Set(),
  examNameDirty: false,
  lastAutoExamName: "",
  examCategoryDirty: false,
  lastAutoCategoryKey: ""
};

init();

async function init() {
  state.token = getAdminToken();
  bindEvents();
  enforceReviewEnglishReadOnly();

  if (state.token) {
    const me = await fetchMe();
    if (me?.role === "admin") {
      await showAdminPanel(me.admin);
      return;
    }
    clearAdminToken();
  }

  showLoginPanel();
}

function bindEvents() {
  adminLoginForm?.addEventListener("submit", (event) => {
    void onAdminLogin(event);
  });
  adminLogoutBtn?.addEventListener("click", () => {
    void onAdminLogout();
  });

  reloadUsersBtn?.addEventListener("click", () => {
    void reloadCategoriesAndUsers();
  });
  saveSiteSettingsBtn?.addEventListener("click", () => {
    void onSaveSiteSettings();
  });
  reloadSiteSettingsBtn?.addEventListener("click", () => {
    void renderSiteSettings();
  });
  userAssignSelect?.addEventListener("change", () => {
    state.selectedAssignUserId = userAssignSelect.value || "";
    renderSelectedUserAssignment();
  });
  progressUserSearchInput?.addEventListener("input", () => {
    renderProgressUserSearchResults();
  });
  progressUserSearchResults?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const item = target.closest("button[data-user-id]");
    if (!(item instanceof HTMLButtonElement)) return;
    const userId = String(item.dataset.userId || "").trim();
    if (!userId) return;
    state.selectedAssignUserId = userId;
    renderSelectedUserAssignment();
  });
  reloadUserAssignmentBtn?.addEventListener("click", () => {
    void renderUserAssignmentPanel();
  });
  saveUserAssignmentBtn?.addEventListener("click", () => {
    void onSaveUserAssignment();
  });
  createDashboardModuleBtn?.addEventListener("click", () => {
    void onCreateDashboardModule();
  });
  reloadDashboardModulesBtn?.addEventListener("click", () => {
    void renderDashboardModules();
  });
  dashboardModulesTbody?.addEventListener("click", (event) => {
    void onDashboardModulesTableClick(event);
  });
  createCourseContentBtn?.addEventListener("click", () => {
    void onCreateCourseContent();
  });
  reloadCourseContentsBtn?.addEventListener("click", () => {
    void renderCourseContents();
  });
  courseContentsTbody?.addEventListener("click", (event) => {
    void onCourseContentsTableClick(event);
  });
  saveUsersBtn?.addEventListener("click", () => {
    void saveUsersFromTable();
  });
  showArchivedUsersToggle?.addEventListener("change", () => {
    void renderUsers();
  });
  usersTbody?.addEventListener("click", (event) => {
    void onUsersTableClick(event);
  });
  reloadCategoriesBtn?.addEventListener("click", () => {
    void reloadCategoriesAndUsers();
  });
  createCategoryBtn?.addEventListener("click", () => {
    void onCreateCategory();
  });
  categoriesTbody?.addEventListener("click", (event) => {
    void onCategoryTableClick(event);
  });
  createExamCategoryBtn?.addEventListener("click", () => {
    void onCreateExamCategory();
  });
  reloadExamCategoriesBtn?.addEventListener("click", () => {
    void renderExamCategories();
  });
  examCategoryManageExamSelect?.addEventListener("change", () => {
    renderExamCategoriesTable();
  });
  examCategoriesTbody?.addEventListener("click", (event) => {
    void onExamCategoriesTableClick(event);
  });
  createExamCatalogBtn?.addEventListener("click", () => {
    void onCreateExamCatalog();
  });
  reloadExamCatalogBtn?.addEventListener("click", () => {
    void renderExamCatalog();
  });
  createStructureProgramBtn?.addEventListener("click", () => {
    void onCreateStructureProgram();
  });
  createStructureSubItemBtn?.addEventListener("click", () => {
    void onCreateStructureSubItem();
  });
  reloadExamStructureBtn?.addEventListener("click", () => {
    void renderExamStructureManager();
  });
  examStructureTbody?.addEventListener("click", (event) => {
    void onExamStructureTableClick(event);
  });
  examIndustryKeyInput?.addEventListener("input", () => {
    state.examNameDirty = false;
    state.examCategoryDirty = false;
    syncExamCreateFormInteraction();
  });
  examIndustryNameInput?.addEventListener("input", () => {
    state.examNameDirty = false;
    state.examCategoryDirty = false;
    syncExamCreateFormInteraction();
  });
  examFamilyKeyInput?.addEventListener("input", () => {
    state.examNameDirty = false;
    state.examCategoryDirty = false;
    syncExamCreateFormInteraction();
  });
  examFamilyNameInput?.addEventListener("input", () => {
    state.examNameDirty = false;
    state.examCategoryDirty = false;
    syncExamCreateFormInteraction();
  });
  examTradeCodeInput?.addEventListener("input", () => {
    state.examNameDirty = false;
    state.examCategoryDirty = false;
    syncExamCreateFormInteraction();
  });
  examTypeInput?.addEventListener("change", () => {
    state.examNameDirty = false;
    state.examCategoryDirty = false;
    syncExamCreateFormInteraction();
  });
  examNameInput?.addEventListener("input", () => {
    const current = (examNameInput.value || "").trim();
    state.examNameDirty = current !== "" && current !== state.lastAutoExamName;
  });
  examCategorySelectInput?.addEventListener("change", () => {
    const current = (examCategorySelectInput.value || "").trim();
    state.examCategoryDirty = current !== "" && current !== state.lastAutoCategoryKey;
  });
  examCatalogTbody?.addEventListener("click", (event) => {
    void onExamCatalogTableClick(event);
  });
  examCatalogTbody?.addEventListener("change", (event) => {
    onExamCatalogTableChange(event);
  });
  importProjectSelect?.addEventListener("change", () => {
    state.importProjectKey = importProjectSelect.value || "";
    renderImportSubItemOptions();
    renderImportExamTypeOptions();
  });
  importSubItemSelect?.addEventListener("change", () => {
    state.importSubItemCode = importSubItemSelect.value || "";
    renderImportExamTypeOptions();
  });
  importExamTypeSelect?.addEventListener("change", () => {
    state.importExamType = importExamTypeSelect.value || "";
    syncImportCategoryFromSelection();
  });
  importExamSelect?.addEventListener("change", () => {
    state.importExamCode = importExamSelect.value || "";
    renderImportExamCategoryOptions();
  });

  importCsvBtn?.addEventListener("click", () => {
    void onImportCsv();
  });
  refreshBankStatsBtn?.addEventListener("click", () => {
    void renderBankStats();
  });
  exportBankCsvBtn?.addEventListener("click", () => {
    void onExportBankCsv();
  });
  exportBankBtn?.addEventListener("click", () => {
    void onExportBank();
  });
  resetBankBtn?.addEventListener("click", () => {
    void onResetBank();
  });

  reviewExamSelect?.addEventListener("change", () => {
    void onReviewExamChange();
  });
  reviewQuestionSelect?.addEventListener("change", () => {
    onReviewQuestionChange();
  });
  saveReviewBtn?.addEventListener("click", () => {
    void onSaveReview();
  });
  qmSearchBtn?.addEventListener("click", () => {
    void loadQuestionManager({ resetPage: true });
  });
  qmResetBtn?.addEventListener("click", () => {
    resetQuestionManagerFilters();
    void loadQuestionManager({ resetPage: true });
  });
  qmRefreshBtn?.addEventListener("click", () => {
    void loadQuestionManager({ resetPage: false });
  });
  qmIncludeDeletedToggle?.addEventListener("change", () => {
    void loadQuestionManager({ resetPage: true });
  });
  qmKeywordInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void loadQuestionManager({ resetPage: true });
    }
  });
  qmPrevBtn?.addEventListener("click", () => {
    if (state.questionManagerPage <= 1) return;
    state.questionManagerPage -= 1;
    void loadQuestionManager({ resetPage: false });
  });
  qmNextBtn?.addEventListener("click", () => {
    if (state.questionManagerPage >= state.questionManagerTotalPages) return;
    state.questionManagerPage += 1;
    void loadQuestionManager({ resetPage: false });
  });
  qmTbody?.addEventListener("click", (event) => {
    void onQuestionManagerTableClick(event);
  });
  qmTbody?.addEventListener("change", (event) => {
    onQuestionManagerTableChange(event);
  });
  qmSelectPageBtn?.addEventListener("click", () => {
    selectAllQuestionManagerCurrentPage();
  });
  qmClearSelectionBtn?.addEventListener("click", () => {
    clearAllQuestionManagerSelection();
  });
  qmBulkInactiveBtn?.addEventListener("click", () => {
    void onQuestionManagerBulkAction("inactive");
  });
  qmBulkActiveBtn?.addEventListener("click", () => {
    void onQuestionManagerBulkAction("active");
  });
  qmBulkDeleteBtn?.addEventListener("click", () => {
    void onQuestionManagerBulkAction("deleted");
  });
}

function enforceReviewEnglishReadOnly() {
  if (reviewPromptEn) reviewPromptEn.readOnly = true;
  if (reviewOptionsEn) reviewOptionsEn.readOnly = true;
  if (reviewExplanationEn) reviewExplanationEn.readOnly = true;
  if (reviewKeyPointEn) reviewKeyPointEn.readOnly = true;
  if (reviewReasoningEn) reviewReasoningEn.readOnly = true;
}

async function onAdminLogin(event) {
  if (!adminEmailInput || !adminPasswordInput || !adminLoginError || !adminLoginForm) return;
  event.preventDefault();
  const email = adminEmailInput.value.trim().toLowerCase();
  const password = adminPasswordInput.value;

  try {
    const data = await apiFetch("/api/admin/login", {
      method: "POST",
      body: { email, password }
    });

    state.token = data.token;
    setAdminToken(data.token);
    adminLoginError.classList.add("hidden");
    adminLoginForm.reset();
    await showAdminPanel(data.admin);
  } catch (err) {
    adminLoginError.textContent = err.message || "管理员账号或密码错误。";
    adminLoginError.classList.remove("hidden");
  }
}

async function onAdminLogout() {
  try {
    await apiFetch("/api/auth/logout", { method: "POST", token: state.token, body: {} });
  } catch {}

  state.token = "";
  clearAdminToken();
  showLoginPanel();
}

function showLoginPanel() {
  adminLoginPanel?.classList.remove("hidden");
  adminPanel?.classList.add("hidden");
  adminWelcome?.classList.add("hidden");
  adminLogoutBtn?.classList.add("hidden");
}

async function showAdminPanel(admin) {
  adminLoginPanel?.classList.add("hidden");
  adminPanel?.classList.remove("hidden");
  adminWelcome?.classList.remove("hidden");
  adminLogoutBtn?.classList.remove("hidden");
  if (adminWelcome) adminWelcome.textContent = admin.name;

  await renderSiteSettings();
  await renderCategories();
  await renderExamCatalog();
  await renderExamCategories();
  await renderExamStructureManager();
  renderQuestionManagerFilterOptions();
  await loadQuestionManager({ resetPage: true });
  await renderUsers();
  await renderBankStats();
  await renderReviewPanel();
  await renderUserAssignmentPanel();
  await renderDashboardModules();
  await renderCourseContents();
}

async function reloadCategoriesAndUsers() {
  await renderCategories();
  await renderExamCatalog();
  await renderExamCategories();
  await renderExamStructureManager();
  renderQuestionManagerFilterOptions();
  await loadQuestionManager({ resetPage: true });
  await renderUsers();
}

async function renderSiteSettings() {
  if (!siteWechatInput) return;
  siteSettingsMsg?.classList.add("hidden");
  try {
    const payload = await apiFetch("/api/admin/site-settings", { token: state.token });
    siteWechatInput.value = String(payload?.wechatId || "").trim();
    applySitePricingToForm(payload?.pricingConfig || {});
    renderSitePricingRuntimeHint(payload?.pricingRuntime || {}, payload?.serverNow || "");
  } catch (err) {
    showSiteSettingsMsg(`加载失败：${err.message}`, true);
  }
}

async function onSaveSiteSettings() {
  if (!siteWechatInput) return;
  const wechatId = String(siteWechatInput.value || "").trim();
  if (!wechatId) {
    showSiteSettingsMsg("请先输入客服微信号。", true);
    return;
  }
  const pricingConfig = collectSitePricingFromForm();
  if (!pricingConfig) {
    showSiteSettingsMsg("价格配置表单未就绪，请刷新后重试。", true);
    return;
  }
  try {
    const payload = await apiFetch("/api/admin/site-settings", {
      method: "PUT",
      token: state.token,
      body: { wechatId, pricingConfig }
    });
    siteWechatInput.value = String(payload?.wechatId || wechatId).trim();
    applySitePricingToForm(payload?.pricingConfig || pricingConfig);
    renderSitePricingRuntimeHint(payload?.pricingRuntime || {}, payload?.serverNow || "");
    showSiteSettingsMsg("站点设置已保存（微信号/价格/优惠倒计时）。", false);
  } catch (err) {
    showSiteSettingsMsg(`保存失败：${err.message}`, true);
  }
}

function parseCommaSeparatedList(raw, { upper = false } = {}) {
  const values = String(raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const item of values) {
    let next = item
      .replaceAll("-", "_")
      .replaceAll(" ", "_")
      .replace(/[^a-zA-Z0-9_]/g, "");
    if (!next) continue;
    next = upper ? next.toUpperCase() : next.toLowerCase();
    if (seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}

function showUserAssignmentMsg(message, isError) {
  if (!userAssignmentMsg) return;
  userAssignmentMsg.textContent = message;
  userAssignmentMsg.classList.remove("hidden");
  userAssignmentMsg.style.color = isError ? "#be2f2f" : "#2757d6";
}

function showDashboardModulesMsg(message, isError) {
  if (!dashboardModulesMsg) return;
  dashboardModulesMsg.textContent = message;
  dashboardModulesMsg.classList.remove("hidden");
  dashboardModulesMsg.style.color = isError ? "#be2f2f" : "#2757d6";
}

function showCourseContentsMsg(message, isError) {
  if (!courseContentsMsg) return;
  courseContentsMsg.textContent = message;
  courseContentsMsg.classList.remove("hidden");
  courseContentsMsg.style.color = isError ? "#be2f2f" : "#2757d6";
}

function normalizeMembershipTier(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "basic_399" || normalized === "pro_599" || normalized === "ai_999" || normalized === "free") {
    return normalized;
  }
  if (normalized === "paid") return "basic_399";
  return "free";
}

function membershipTierLabel(tier) {
  const normalized = normalizeMembershipTier(tier);
  if (normalized === "ai_999") return "AI";
  if (normalized === "pro_599") return "Pro";
  if (normalized === "basic_399") return "Basic";
  return "Trial";
}

function accountStatusLabel(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "suspended") return "Archived";
  if (normalized === "deleted") return "Deleted";
  return "Active";
}

function getAdminUserById(userId) {
  return state.adminUsers.find((item) => Number(item?.id) === Number(userId)) || null;
}

function normalizePermissionSelectValue(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw || raw === "default" || raw === "inherit" || raw === "auto") return "";
  if (["1", "true", "yes", "y", "on", "enabled"].includes(raw)) return "1";
  if (["0", "false", "no", "n", "off", "disabled"].includes(raw)) return "0";
  return "";
}

function permissionSelectPayloadValue(value) {
  if (value === "1") return true;
  if (value === "0") return false;
  return null;
}

function setMemberSummaryText(element, value, fallback = "--") {
  if (!element) return;
  const text = String(value || "").trim();
  element.textContent = text || fallback;
}

function updateMembersListSelectedState() {
  if (!usersTbody) return;
  const selectedId = String(state.selectedAssignUserId || "");
  usersTbody.querySelectorAll("tr[data-user-id]").forEach((row) => {
    const isSelected = selectedId && row.dataset.userId === selectedId;
    row.classList.toggle("selected-user-row", Boolean(isSelected));
  });
}

function parseAssignedExamCodesValue(raw) {
  return parseCommaSeparatedList(raw, { upper: true });
}

function setAssignedExamCodesValue(codes) {
  if (!assignedExamCodesInput) return;
  const normalized = Array.isArray(codes) ? codes.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean) : [];
  assignedExamCodesInput.value = normalized.join(", ");
}

function getProgressAssignableExams() {
  const rows = getExamCatalogRows({ usableOnly: true });
  const mapped = new Map();
  for (const exam of rows) {
    const code = String(exam?.examCode || "").trim().toUpperCase();
    if (!code) continue;
    if (!mapped.has(code)) {
      mapped.set(code, {
        examCode: code,
        examName: String(exam?.examName || code),
        examType: resolveExamType(exam)
      });
    }
  }
  return Array.from(mapped.values()).sort((a, b) => a.examCode.localeCompare(b.examCode, "en"));
}

function renderProgressExamBindingOptions() {
  if (!progressAssignedExamOptions) return;
  const selectedUserId = Number(state.selectedAssignUserId || userAssignSelect?.value || 0);
  if (!selectedUserId) {
    progressAssignedExamOptions.innerHTML = "<div class='admin-help-text'>请先选择用户，再设置考试绑定。</div>";
    if (progressAssignedExamSummary) progressAssignedExamSummary.textContent = "当前未分配考试";
    return;
  }
  const options = getProgressAssignableExams();
  const selected = new Set(parseAssignedExamCodesValue(assignedExamCodesInput?.value || ""));
  progressAssignedExamOptions.innerHTML = "";

  if (!options.length) {
    progressAssignedExamOptions.innerHTML = "<div class='admin-help-text'>暂无可用考试项，请先在 Structure 中启用考试配置。</div>";
    if (progressAssignedExamSummary) progressAssignedExamSummary.textContent = "当前未分配考试";
    return;
  }

  for (const option of options) {
    const item = document.createElement("label");
    item.className = "progress-exam-option";
    item.innerHTML = `
      <input type="checkbox" value="${escapeHtml(option.examCode)}" ${selected.has(option.examCode) ? "checked" : ""} />
      <span>${escapeHtml(option.examName)} <small style="color:#6c7b91;">(${escapeHtml(option.examCode)})</small></span>
    `;
    progressAssignedExamOptions.appendChild(item);
  }

  progressAssignedExamOptions.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", () => {
      const next = Array.from(progressAssignedExamOptions.querySelectorAll("input[type='checkbox']:checked"))
        .map((el) => String(el.value || "").trim().toUpperCase())
        .filter(Boolean);
      setAssignedExamCodesValue(next);
      if (progressAssignedExamSummary) {
        progressAssignedExamSummary.textContent = next.length ? `当前已绑定：${next.join(", ")}` : "当前未分配考试";
      }
    });
  });

  const selectedText = Array.from(selected);
  if (progressAssignedExamSummary) {
    progressAssignedExamSummary.textContent = selectedText.length
      ? `当前已绑定：${selectedText.join(", ")}`
      : "当前未分配考试";
  }
}

function renderProgressUserSearchResults() {
  if (!progressUserSearchResults) return;
  const keyword = String(progressUserSearchInput?.value || "").trim().toLowerCase();
  if (!keyword) {
    progressUserSearchResults.innerHTML = "";
    return;
  }
  const rows = Array.isArray(state.adminUsers) ? state.adminUsers : [];
  const matched = rows.filter((user) => {
    const candidates = [
      String(user?.name || "").toLowerCase(),
      String(user?.nickname || "").toLowerCase(),
      String(user?.email || "").toLowerCase()
    ];
    return candidates.some((value) => value.includes(keyword));
  });
  progressUserSearchResults.innerHTML = "";
  if (!matched.length) {
    progressUserSearchResults.innerHTML = "<div class='admin-help-text'>没有匹配用户。</div>";
    return;
  }
  for (const user of matched.slice(0, 100)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "progress-user-item";
    button.dataset.userId = String(user.id);
    const tier = membershipTierLabel(user?.membershipTier || user?.membership_tier || user?.plan || "free");
    const status = accountStatusLabel(user?.accountStatus || user?.account_status || "active");
    const selected = String(state.selectedAssignUserId || "") === String(user.id);
    if (selected) button.classList.add("active");
    button.innerHTML = `
      <strong>${escapeHtml(user?.name || "学员")}</strong>
      <span>${escapeHtml(user?.email || "")}</span>
      <small>${escapeHtml(tier)} / ${escapeHtml(status)}</small>
    `;
    progressUserSearchResults.appendChild(button);
  }
}

function buildContentPermissionEffectiveHint(user) {
  const tierText = membershipTierLabel(user?.membershipTier || user?.membership_tier || user?.plan || "free");
  const overrides =
    user?.contentPermissionOverrides && typeof user.contentPermissionOverrides === "object"
      ? user.contentPermissionOverrides
      : {};
  const renderOne = (label, key) => {
    const raw = normalizePermissionSelectValue(overrides[key]);
    if (raw === "1") return `${label}: 人工强制启用`;
    if (raw === "0") return `${label}: 人工强制禁用`;
    return `${label}: 按套餐默认（${tierText}）`;
  };
  return [renderOne("中文辅助", "bilingualEnabled"), renderOne("解析", "explanationEnabled"), renderOne("记忆技巧", "memoryTipsEnabled")].join(" / ");
}

function renderUserAssignmentFields(user) {
  if (userAssignNameInput) userAssignNameInput.value = String(user?.name || "");
  if (userAssignNicknameInput) userAssignNicknameInput.value = String(user?.nickname || "");
  if (userAssignEmailInput) userAssignEmailInput.value = String(user?.email || "");
  if (userAssignPhoneInput) userAssignPhoneInput.value = String(user?.phone || "");
  const normalizedTier = normalizeMembershipTier(user?.membershipTier || user?.membership_tier || user?.plan || "free");
  const normalizedStatus = String(user?.accountStatus || user?.account_status || "active").trim().toLowerCase() || "active";
  if (userAssignTierInput) userAssignTierInput.value = membershipTierLabel(normalizedTier);
  if (userAssignMembershipTierInput) userAssignMembershipTierInput.value = normalizedTier;
  if (userAssignAccountStatusInput) userAssignAccountStatusInput.value = normalizedStatus;
  if (userAssignMembershipExpiresInput) {
    const rawExpiry = user?.aiEntitlement?.expiresAt || user?.bilingualEntitlement?.expiresAt || "";
    userAssignMembershipExpiresInput.value = toDateInputValue(rawExpiry);
  }
  const progress = user?.licensingProgress && typeof user.licensingProgress === "object" ? user.licensingProgress : {};
  const contentOverrides =
    user?.contentPermissionOverrides && typeof user.contentPermissionOverrides === "object"
      ? user.contentPermissionOverrides
      : {};
  const examsText = Array.isArray(user?.assignedExamCodes) && user.assignedExamCodes.length ? user.assignedExamCodes.join(", ") : "未分配";
  const assignedExamCodes = parseAssignedExamCodesValue(Array.isArray(user?.assignedExamCodes) ? user.assignedExamCodes.join(",") : "");
  const studyPercent = Math.max(
    0,
    Math.min(100, Number.parseInt(String(progress?.studyProgressPercent ?? 0), 10) || 0)
  );
  const applicationSubmitted = progress?.applicationSubmitted === true || Boolean(String(progress?.applicationNumber || "").trim());
  const examScheduled = progress?.examScheduled === true;
  const updatedRaw = String(
      user?.updatedAt ||
      user?.profileUpdatedAt ||
      user?.membershipUpdatedAt ||
      progress?.updatedAt ||
      ""
    ).trim();
  let updatedText = "--";
  if (updatedRaw) {
    try {
      const d = new Date(updatedRaw);
      updatedText = isNaN(d.getTime())
        ? updatedRaw
        : d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }) +
          " " +
          d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      updatedText = updatedRaw;
    }
  }
  setMemberSummaryText(memberSummaryName, user?.name || "学员", "学员");
  setMemberSummaryText(memberSummaryNickname, user?.nickname || "", "未设置");
  setMemberSummaryText(memberSummaryEmail, user?.email || "", "未设置");
  setMemberSummaryText(memberSummaryPhone, user?.phone || "", "未绑定");
  setMemberSummaryText(memberSummaryTier, membershipTierLabel(normalizedTier), "Trial");
  setMemberSummaryText(memberSummaryStatus, accountStatusLabel(normalizedStatus), "Active");
  setMemberSummaryText(memberSummaryExams, examsText, "未分配");
  setMemberSummaryText(
    memberSummaryExpires,
    user?.aiEntitlement?.expiresAt || user?.bilingualEntitlement?.expiresAt || "",
    "未设置"
  );
  setMemberSummaryText(memberSummaryNotes, progress?.notes || "", "无");
  if (memberPermissionEffectiveHint) {
    memberPermissionEffectiveHint.textContent = buildContentPermissionEffectiveHint(user);
  }
  if (progressSelectedUserLabel) {
    progressSelectedUserLabel.textContent = `当前选中：${user?.name || "学员"} / ${user?.email || "--"}`;
  }
  setMemberSummaryText(progressSummaryName, user?.name || "学员", "学员");
  setMemberSummaryText(progressSummaryEmail, user?.email || "", "--");
  setMemberSummaryText(progressSummaryExams, examsText, "未分配");
  setMemberSummaryText(progressSummaryPercent, `${studyPercent}%`, "0%");
  setMemberSummaryText(progressSummaryApplication, applicationSubmitted ? "已提交" : "未提交", "未提交");
  setMemberSummaryText(
    progressSummaryScheduled,
    examScheduled ? `已预约${progress?.examDate ? `（${progress.examDate}）` : ""}` : "未预约",
    "未预约"
  );
  setMemberSummaryText(progressSummaryTier, membershipTierLabel(normalizedTier), "--");
  setMemberSummaryText(progressSummaryUpdated, updatedText, "--");
  if (assignedExamCodesInput) {
    setAssignedExamCodesValue(assignedExamCodes);
  }
  if (assignedModuleTagsInput) {
    assignedModuleTagsInput.value = Array.isArray(user?.assignedModuleTags) ? user.assignedModuleTags.join(", ") : "";
  }
  if (userBilingualEnabledInput) {
    userBilingualEnabledInput.value = normalizePermissionSelectValue(contentOverrides.bilingualEnabled);
  }
  if (userExplanationEnabledInput) {
    userExplanationEnabledInput.value = normalizePermissionSelectValue(contentOverrides.explanationEnabled);
  }
  if (userMemoryTipsEnabledInput) {
    userMemoryTipsEnabledInput.value = normalizePermissionSelectValue(contentOverrides.memoryTipsEnabled);
  }
  if (progressEnrolledInput) progressEnrolledInput.checked = progress.enrolled !== false;
  if (progressApplicationNumberInput) progressApplicationNumberInput.value = String(progress.applicationNumber || "");
  if (progressPercentInput) progressPercentInput.value = String(Number(progress.studyProgressPercent || 0));
  if (progressExamDateInput) progressExamDateInput.value = String(progress.examDate || "");
  if (progressStudyStartedInput) progressStudyStartedInput.checked = progress.studyStarted === true;
  if (progressExamScheduledInput) progressExamScheduledInput.checked = progress.examScheduled === true;
  if (progressExamPassedInput) progressExamPassedInput.checked = progress.examPassed === true;
  if (progressNotesInput) progressNotesInput.value = String(progress.notes || "");
  renderProgressExamBindingOptions();
  renderProgressUserSearchResults();
}

function renderSelectedUserAssignment() {
  if (!userAssignSelect || !saveUserAssignmentBtn) return;
  const userId = Number(state.selectedAssignUserId || userAssignSelect.value || 0);
  const user = getAdminUserById(userId);
  const enabled = Boolean(user);
  saveUserAssignmentBtn.disabled = !enabled;
  if (!enabled) {
    if (userAssignNameInput) userAssignNameInput.value = "";
    if (userAssignNicknameInput) userAssignNicknameInput.value = "";
    if (userAssignEmailInput) userAssignEmailInput.value = "";
    if (userAssignPhoneInput) userAssignPhoneInput.value = "";
    if (userAssignTierInput) userAssignTierInput.value = "";
    if (userAssignMembershipTierInput) userAssignMembershipTierInput.value = "free";
    if (userAssignAccountStatusInput) userAssignAccountStatusInput.value = "active";
    if (userAssignMembershipExpiresInput) userAssignMembershipExpiresInput.value = "";
    if (assignedExamCodesInput) assignedExamCodesInput.value = "";
    if (assignedModuleTagsInput) assignedModuleTagsInput.value = "";
    if (userBilingualEnabledInput) userBilingualEnabledInput.value = "";
    if (userExplanationEnabledInput) userExplanationEnabledInput.value = "";
    if (userMemoryTipsEnabledInput) userMemoryTipsEnabledInput.value = "";
    if (progressEnrolledInput) progressEnrolledInput.checked = true;
    if (progressApplicationNumberInput) progressApplicationNumberInput.value = "";
    if (progressPercentInput) progressPercentInput.value = "0";
    if (progressExamDateInput) progressExamDateInput.value = "";
    if (progressStudyStartedInput) progressStudyStartedInput.checked = false;
    if (progressExamScheduledInput) progressExamScheduledInput.checked = false;
    if (progressExamPassedInput) progressExamPassedInput.checked = false;
    if (progressNotesInput) progressNotesInput.value = "";
    setMemberSummaryText(memberSummaryName, "", "未选择用户");
    setMemberSummaryText(memberSummaryNickname, "", "--");
    setMemberSummaryText(memberSummaryEmail, "", "--");
    setMemberSummaryText(memberSummaryPhone, "", "--");
    setMemberSummaryText(memberSummaryTier, "", "--");
    setMemberSummaryText(memberSummaryStatus, "", "--");
    setMemberSummaryText(memberSummaryExams, "", "--");
    setMemberSummaryText(memberSummaryExpires, "", "--");
    setMemberSummaryText(memberSummaryNotes, "", "--");
    if (memberPermissionEffectiveHint) memberPermissionEffectiveHint.textContent = "";
    if (progressSelectedUserLabel) progressSelectedUserLabel.textContent = "当前未选择用户";
    setMemberSummaryText(progressSummaryName, "", "--");
    setMemberSummaryText(progressSummaryEmail, "", "--");
    setMemberSummaryText(progressSummaryExams, "", "--");
    setMemberSummaryText(progressSummaryPercent, "0%", "0%");
    setMemberSummaryText(progressSummaryApplication, "未提交", "未提交");
    setMemberSummaryText(progressSummaryScheduled, "未预约", "未预约");
    setMemberSummaryText(progressSummaryTier, "", "--");
    setMemberSummaryText(progressSummaryUpdated, "", "--");
    if (progressAssignedExamOptions) {
      progressAssignedExamOptions.innerHTML = "<div class='admin-help-text'>请先选择用户，再设置考试绑定。</div>";
    }
    if (progressAssignedExamSummary) progressAssignedExamSummary.textContent = "当前未分配考试";
    renderProgressUserSearchResults();
    updateMembersListSelectedState();
    return;
  }
  state.selectedAssignUserId = String(user.id);
  userAssignSelect.value = String(user.id);
  renderUserAssignmentFields(user);
  updateMembersListSelectedState();
}

async function renderUserAssignmentPanel() {
  if (!userAssignSelect) return;
  showUserAssignmentMsg("", false);
  userAssignmentMsg?.classList.add("hidden");
  try {
    const rows = await apiFetch("/api/admin/users?include_archived=1", { token: state.token });
    state.adminUsers = Array.isArray(rows) ? rows : [];
    const prev = String(state.selectedAssignUserId || userAssignSelect.value || "").trim();
    userAssignSelect.innerHTML = "";
    if (!state.adminUsers.length) {
      setSelectPlaceholder(userAssignSelect, "暂无用户");
      renderSelectedUserAssignment();
      renderProgressUserSearchResults();
      return;
    }
    state.adminUsers
      .slice()
      .sort((a, b) => String(a?.email || "").localeCompare(String(b?.email || ""), "en"))
      .forEach((user) => {
        const option = document.createElement("option");
        option.value = String(user.id);
        const statusText = accountStatusLabel(user?.accountStatus || "active");
        const tierText = membershipTierLabel(user?.membershipTier || user?.membership_tier || user?.plan || "free");
        option.textContent = `${user.name || "学员"} / ${user.email} / ${tierText} / ${statusText}`;
        userAssignSelect.appendChild(option);
      });
    if (prev && Array.from(userAssignSelect.options).some((opt) => opt.value === prev)) {
      userAssignSelect.value = prev;
    }
    state.selectedAssignUserId = userAssignSelect.value || "";
    renderProgressUserSearchResults();
    renderSelectedUserAssignment();
  } catch (err) {
    showUserAssignmentMsg(`加载失败：${err.message}`, true);
  }
}

async function onSaveUserAssignment() {
  if (!userAssignSelect || !saveUserAssignmentBtn) return;
  const userId = Number(state.selectedAssignUserId || userAssignSelect.value || 0);
  if (!userId) {
    showUserAssignmentMsg("请先选择用户。", true);
    return;
  }

  const currentUser = getAdminUserById(userId);
  const currentProgress =
    currentUser?.licensingProgress && typeof currentUser.licensingProgress === "object"
      ? currentUser.licensingProgress
      : {};
  const payload = {};
  const hasMemberTierInput = Boolean(userAssignMembershipTierInput);
  const hasAccountStatusInput = Boolean(userAssignAccountStatusInput);
  const hasAssignmentInputs = Boolean(assignedExamCodesInput || assignedModuleTagsInput);
  const hasContentPermissionInputs = Boolean(
    userBilingualEnabledInput || userExplanationEnabledInput || userMemoryTipsEnabledInput
  );
  const hasProgressInputs = Boolean(
    progressEnrolledInput ||
      progressApplicationNumberInput ||
      progressPercentInput ||
      progressExamDateInput ||
      progressStudyStartedInput ||
      progressExamScheduledInput ||
      progressExamPassedInput ||
      progressNotesInput
  );

  if (hasMemberTierInput) {
    payload.membershipTier = normalizeMembershipTier(userAssignMembershipTierInput?.value || "free");
  }

  if (userAssignMembershipExpiresInput) {
    const expiryDate = normalizeDateInput(userAssignMembershipExpiresInput.value || "");
    if (expiryDate) {
      payload.entitlements = payload.entitlements || {};
      payload.entitlements.aiExpiresAt = expiryDate;
      payload.entitlements.bilingualExpiresAt = expiryDate;
    }
  }

  if (hasAccountStatusInput) {
    const statusValue = String(userAssignAccountStatusInput?.value || "active").trim().toLowerCase();
    if (statusValue === "deleted") {
      const confirmed = confirm("确认将该账号标记为删除并执行删除吗？此操作不可恢复。");
      if (!confirmed) return;
      saveUserAssignmentBtn.disabled = true;
      saveUserAssignmentBtn.textContent = "删除中...";
      try {
        await apiFetch(`/api/admin/users/${userId}`, {
          method: "DELETE",
          token: state.token
        });
        state.selectedAssignUserId = "";
        await renderUsers();
        await renderUserAssignmentPanel();
        showUserAssignmentMsg("账号已删除。", false);
      } catch (err) {
        showUserAssignmentMsg(`删除失败：${err.message}`, true);
      } finally {
        const saveBtnDefaultText = String(
          saveUserAssignmentBtn.dataset.defaultText || saveUserAssignmentBtn.textContent || "保存"
        );
        saveUserAssignmentBtn.disabled = false;
        saveUserAssignmentBtn.textContent = saveBtnDefaultText;
      }
      return;
    }
    payload.accountStatus = statusValue === "suspended" ? "suspended" : "active";
  }

  if (hasAssignmentInputs) {
    payload.assignedExamCodes = assignedExamCodesInput
      ? parseCommaSeparatedList(assignedExamCodesInput.value, { upper: true })
      : Array.isArray(currentUser?.assignedExamCodes)
        ? currentUser.assignedExamCodes
        : [];
    payload.assignedModuleTags = assignedModuleTagsInput
      ? parseCommaSeparatedList(assignedModuleTagsInput.value, { upper: false })
      : Array.isArray(currentUser?.assignedModuleTags)
        ? currentUser.assignedModuleTags
        : [];
  }

  if (hasContentPermissionInputs) {
    const contentPermissions = {};
    if (userBilingualEnabledInput) {
      contentPermissions.bilingualEnabled = permissionSelectPayloadValue(
        normalizePermissionSelectValue(userBilingualEnabledInput.value ?? "")
      );
    }
    if (userExplanationEnabledInput) {
      contentPermissions.explanationEnabled = permissionSelectPayloadValue(
        normalizePermissionSelectValue(userExplanationEnabledInput.value ?? "")
      );
    }
    if (userMemoryTipsEnabledInput) {
      contentPermissions.memoryTipsEnabled = permissionSelectPayloadValue(
        normalizePermissionSelectValue(userMemoryTipsEnabledInput.value ?? "")
      );
    }
    payload.contentPermissions = contentPermissions;
  }

  if (hasProgressInputs) {
    const studyProgressPercent = progressPercentInput
      ? Math.max(0, Math.min(100, Number.parseInt(String(progressPercentInput.value || "0"), 10) || 0))
      : Math.max(0, Math.min(100, Number.parseInt(String(currentProgress.studyProgressPercent || 0), 10) || 0));
    payload.licensingProgress = {
      enrolled: progressEnrolledInput ? progressEnrolledInput.checked === true : currentProgress.enrolled !== false,
      applicationNumber: progressApplicationNumberInput
        ? String(progressApplicationNumberInput.value || "").trim()
        : String(currentProgress.applicationNumber || ""),
      studyProgressPercent,
      examDate: progressExamDateInput
        ? String(progressExamDateInput.value || "").trim()
        : String(currentProgress.examDate || ""),
      studyStarted: progressStudyStartedInput
        ? progressStudyStartedInput.checked === true
        : currentProgress.studyStarted === true,
      examScheduled: progressExamScheduledInput
        ? progressExamScheduledInput.checked === true
        : currentProgress.examScheduled === true,
      examPassed: progressExamPassedInput
        ? progressExamPassedInput.checked === true
        : currentProgress.examPassed === true,
      notes: progressNotesInput ? String(progressNotesInput.value || "").trim() : String(currentProgress.notes || "")
    };
  }

  if (!Object.keys(payload).length) {
    showUserAssignmentMsg("当前页面没有可保存字段。", true);
    return;
  }

  const saveBtnDefaultText = String(saveUserAssignmentBtn.dataset.defaultText || saveUserAssignmentBtn.textContent || "保存");
  saveUserAssignmentBtn.disabled = true;
  saveUserAssignmentBtn.textContent = "保存中...";
  try {
    const result = await apiFetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      token: state.token,
      body: payload
    });
    if (result?.user) {
      const idx = state.adminUsers.findIndex((item) => Number(item?.id) === userId);
      if (idx >= 0) {
        state.adminUsers[idx] = result.user;
      } else {
        state.adminUsers.push(result.user);
      }
      renderSelectedUserAssignment();
      if (usersTbody) {
        await renderUsers();
      }
      await renderUserAssignmentPanel();
      showUserAssignmentMsg("会员信息已保存。", false);
    } else {
      showUserAssignmentMsg("保存完成，但返回数据为空，请刷新确认。", false);
    }
  } catch (err) {
    showUserAssignmentMsg(`保存失败：${err.message}`, true);
  } finally {
    saveUserAssignmentBtn.disabled = false;
    saveUserAssignmentBtn.textContent = saveBtnDefaultText;
  }
}

function renderDashboardModulesTable() {
  if (!dashboardModulesTbody) return;
  dashboardModulesTbody.innerHTML = "";
  if (!state.dashboardModules.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td colspan='9'>暂无模块，请先新增。</td>";
    dashboardModulesTbody.appendChild(tr);
    return;
  }
  for (const item of state.dashboardModules) {
    const tr = document.createElement("tr");
    tr.dataset.moduleCode = String(item.moduleCode || "");
    tr.innerHTML = `
      <td><code>${escapeHtml(item.moduleCode || "")}</code></td>
      <td><input type="text" data-field="title" value="${escapeHtml(item.title || "")}" /></td>
      <td>
        <select data-field="moduleType">
          ${[
            "exam_card",
            "practice_center",
            "mock_exam_entry",
            "progress_tracker",
            "course_video",
            "course_audio",
            "live_stream",
            "resources",
            "account_settings",
            "custom_link"
          ]
            .map(
              (opt) =>
                `<option value="${opt}" ${item.moduleType === opt ? "selected" : ""}>${opt}</option>`
            )
            .join("")}
        </select>
      </td>
      <td>
        <div style="display:grid;gap:6px;min-width:220px;">
          <select data-field="routeType">
            ${["internal_page", "exam_home", "category_practice", "mock_exam", "placeholder", "external_link"]
              .map(
                (opt) =>
                  `<option value="${opt}" ${item.routeType === opt ? "selected" : ""}>${opt}</option>`
              )
              .join("")}
          </select>
          <input type="text" data-field="routeTarget" value="${escapeHtml(item.routeTarget || "")}" placeholder="route_target" />
          <input type="text" data-field="linkedExamCode" value="${escapeHtml(item.linkedExamCode || "")}" placeholder="linked_exam_code（可选）" />
          <input type="text" data-field="linkedCategoryCode" value="${escapeHtml(item.linkedCategoryCode || "")}" placeholder="linked_category_code（可选）" />
        </div>
      </td>
      <td><input type="text" data-field="visibleForExamCodes" value="${escapeHtml((item.visibleForExamCodes || []).join(", "))}" /></td>
      <td><input type="text" data-field="visibleForMembershipTiers" value="${escapeHtml((item.visibleForMembershipTiers || []).join(", "))}" /></td>
      <td><input type="number" data-field="sortOrder" value="${Number(item.sortOrder || 100)}" /></td>
      <td>
        <label class="toggle" style="margin:0;">
          <input type="checkbox" data-field="isActive" ${item.isActive ? "checked" : ""} />
          <span>${item.isActive ? "启用" : "停用"}</span>
        </label>
        <label class="toggle" style="margin-top:6px;">
          <input type="checkbox" data-field="isPlaceholder" ${item.isPlaceholder ? "checked" : ""} />
          <span>占位</span>
        </label>
      </td>
      <td>
        <button class="btn" data-action="save-dashboard-module">保存</button>
        <button class="btn ghost" data-action="delete-dashboard-module" style="margin-top:6px;color:#be2f2f;">删除</button>
      </td>
    `;
    dashboardModulesTbody.appendChild(tr);
  }
}

async function renderDashboardModules() {
  if (!dashboardModulesTbody) return;
  dashboardModulesMsg?.classList.add("hidden");
  try {
    const payload = await apiFetch("/api/admin/dashboard-modules", { token: state.token });
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
    state.dashboardModules = rows;
    state.dashboardModules.sort((a, b) => Number(a.sortOrder || 100) - Number(b.sortOrder || 100));
    renderDashboardModulesTable();
  } catch (err) {
    showDashboardModulesMsg(`加载失败：${err.message}`, true);
  }
}

function collectDashboardModuleFormPayload() {
  return {
    moduleCode: String(dashboardModuleCodeInput?.value || "").trim(),
    title: String(dashboardModuleTitleInput?.value || "").trim(),
    moduleType: String(dashboardModuleTypeInput?.value || "").trim(),
    routeType: String(dashboardRouteTypeInput?.value || "").trim(),
    routeTarget: String(dashboardRouteTargetInput?.value || "").trim(),
    linkedExamCode: String(dashboardLinkedExamCodeInput?.value || "").trim(),
    visibleForExamCodes: parseCommaSeparatedList(dashboardVisibleExamCodesInput?.value, { upper: true }),
    visibleForMembershipTiers: parseCommaSeparatedList(dashboardVisibleTiersInput?.value, { upper: false }),
    sortOrder: Number.parseInt(String(dashboardSortOrderInput?.value || "100"), 10) || 100,
    badgeText: String(dashboardBadgeTextInput?.value || "").trim(),
    isActive: dashboardModuleEnabledInput?.checked === true,
    isPlaceholder: dashboardModulePlaceholderInput?.checked === true
  };
}

async function onCreateDashboardModule() {
  if (!createDashboardModuleBtn) return;
  const payload = collectDashboardModuleFormPayload();
  if (!payload.moduleCode || !payload.title) {
    showDashboardModulesMsg("module_code 和 标题为必填。", true);
    return;
  }
  createDashboardModuleBtn.disabled = true;
  createDashboardModuleBtn.textContent = "创建中...";
  try {
    await apiFetch("/api/admin/dashboard-modules", {
      method: "POST",
      token: state.token,
      body: payload
    });
    showDashboardModulesMsg(`模块 ${payload.moduleCode} 已创建。`, false);
    await renderDashboardModules();
  } catch (err) {
    showDashboardModulesMsg(`创建失败：${err.message}`, true);
  } finally {
    createDashboardModuleBtn.disabled = false;
    createDashboardModuleBtn.textContent = "新增模块";
  }
}

function collectDashboardModulePayloadFromRow(row) {
  const read = (field) => row.querySelector(`[data-field='${field}']`);
  return {
    title: String(read("title")?.value || "").trim(),
    moduleType: String(read("moduleType")?.value || "").trim(),
    routeType: String(read("routeType")?.value || "").trim(),
    routeTarget: String(read("routeTarget")?.value || "").trim(),
    linkedExamCode: String(read("linkedExamCode")?.value || "").trim(),
    linkedCategoryCode: String(read("linkedCategoryCode")?.value || "").trim(),
    visibleForExamCodes: parseCommaSeparatedList(read("visibleForExamCodes")?.value, { upper: true }),
    visibleForMembershipTiers: parseCommaSeparatedList(read("visibleForMembershipTiers")?.value, { upper: false }),
    sortOrder: Number.parseInt(String(read("sortOrder")?.value || "100"), 10) || 100,
    isActive: read("isActive")?.checked === true,
    isPlaceholder: read("isPlaceholder")?.checked === true
  };
}

async function onDashboardModulesTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !dashboardModulesTbody) return;
  const action = target.dataset.action;
  if (!action) return;
  const row = target.closest("tr[data-module-code]");
  if (!row) return;
  const moduleCode = String(row.dataset.moduleCode || "").trim();
  if (!moduleCode) return;

  if (action === "save-dashboard-module") {
    const payload = collectDashboardModulePayloadFromRow(row);
    try {
      await apiFetch(`/api/admin/dashboard-modules/${encodeURIComponent(moduleCode)}`, {
        method: "PUT",
        token: state.token,
        body: payload
      });
      showDashboardModulesMsg(`模块 ${moduleCode} 已保存。`, false);
      await renderDashboardModules();
    } catch (err) {
      showDashboardModulesMsg(`保存失败：${err.message}`, true);
    }
    return;
  }

  if (action === "delete-dashboard-module") {
    const ok = confirm(`确认删除模块 ${moduleCode}？`);
    if (!ok) return;
    try {
      await apiFetch(`/api/admin/dashboard-modules/${encodeURIComponent(moduleCode)}`, {
        method: "DELETE",
        token: state.token
      });
      showDashboardModulesMsg(`模块 ${moduleCode} 已删除。`, false);
      await renderDashboardModules();
    } catch (err) {
      showDashboardModulesMsg(`删除失败：${err.message}`, true);
    }
  }
}

function renderCourseContentsTable() {
  if (!courseContentsTbody) return;
  courseContentsTbody.innerHTML = "";
  if (!state.courseContents.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td colspan='8'>暂无课程占位内容。</td>";
    courseContentsTbody.appendChild(tr);
    return;
  }
  for (const item of state.courseContents) {
    const tr = document.createElement("tr");
    tr.dataset.contentCode = String(item.contentCode || "");
    tr.innerHTML = `
      <td><code>${escapeHtml(item.contentCode || "")}</code></td>
      <td><input type="text" data-field="title" value="${escapeHtml(item.title || "")}" /></td>
      <td>
        <select data-field="contentType">
          ${["video", "audio", "live"]
            .map((opt) => `<option value="${opt}" ${item.contentType === opt ? "selected" : ""}>${opt}</option>`)
            .join("")}
        </select>
      </td>
      <td><input type="text" data-field="linkedExamCode" value="${escapeHtml(item.linkedExamCode || "")}" /></td>
      <td>
        <select data-field="accessTier">
          ${["", "free", "basic_399", "pro_599", "ai_999"]
            .map((opt) => {
              const label = opt || "不限";
              return `<option value="${opt}" ${String(item.accessTier || "") === opt ? "selected" : ""}>${label}</option>`;
            })
            .join("")}
        </select>
      </td>
      <td><input type="number" data-field="sortOrder" value="${Number(item.sortOrder || 100)}" /></td>
      <td>
        <label class="toggle" style="margin:0;">
          <input type="checkbox" data-field="isActive" ${item.isActive ? "checked" : ""} />
          <span>${item.isActive ? "启用" : "停用"}</span>
        </label>
        <label class="toggle" style="margin-top:6px;">
          <input type="checkbox" data-field="isPlaceholder" ${item.isPlaceholder ? "checked" : ""} />
          <span>占位</span>
        </label>
      </td>
      <td>
        <button class="btn" data-action="save-course-content">保存</button>
        <button class="btn ghost" data-action="delete-course-content" style="margin-top:6px;color:#be2f2f;">删除</button>
      </td>
    `;
    courseContentsTbody.appendChild(tr);
  }
}

async function renderCourseContents() {
  if (!courseContentsTbody) return;
  courseContentsMsg?.classList.add("hidden");
  try {
    const payload = await apiFetch("/api/admin/course-contents", { token: state.token });
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
    state.courseContents = rows;
    state.courseContents.sort((a, b) => Number(a.sortOrder || 100) - Number(b.sortOrder || 100));
    renderCourseContentsTable();
  } catch (err) {
    showCourseContentsMsg(`加载失败：${err.message}`, true);
  }
}

function collectCourseContentFormPayload() {
  return {
    contentCode: String(courseContentCodeInput?.value || "").trim(),
    title: String(courseContentTitleInput?.value || "").trim(),
    contentType: String(courseContentTypeInput?.value || "").trim(),
    linkedExamCode: String(courseLinkedExamCodeInput?.value || "").trim(),
    accessTier: String(courseAccessTierInput?.value || "").trim(),
    sortOrder: Number.parseInt(String(courseSortOrderInput?.value || "100"), 10) || 100,
    isActive: courseEnabledInput?.checked === true,
    isPlaceholder: coursePlaceholderInput?.checked === true,
    description: String(courseDescriptionInput?.value || "").trim()
  };
}

async function onCreateCourseContent() {
  if (!createCourseContentBtn) return;
  const payload = collectCourseContentFormPayload();
  if (!payload.contentCode || !payload.title) {
    showCourseContentsMsg("content_code 和 标题为必填。", true);
    return;
  }
  createCourseContentBtn.disabled = true;
  createCourseContentBtn.textContent = "创建中...";
  try {
    await apiFetch("/api/admin/course-contents", {
      method: "POST",
      token: state.token,
      body: payload
    });
    showCourseContentsMsg(`课程占位 ${payload.contentCode} 已创建。`, false);
    await renderCourseContents();
  } catch (err) {
    showCourseContentsMsg(`创建失败：${err.message}`, true);
  } finally {
    createCourseContentBtn.disabled = false;
    createCourseContentBtn.textContent = "新增课程占位";
  }
}

function collectCourseContentPayloadFromRow(row) {
  const read = (field) => row.querySelector(`[data-field='${field}']`);
  return {
    title: String(read("title")?.value || "").trim(),
    contentType: String(read("contentType")?.value || "").trim(),
    linkedExamCode: String(read("linkedExamCode")?.value || "").trim(),
    accessTier: String(read("accessTier")?.value || "").trim(),
    sortOrder: Number.parseInt(String(read("sortOrder")?.value || "100"), 10) || 100,
    isActive: read("isActive")?.checked === true,
    isPlaceholder: read("isPlaceholder")?.checked === true
  };
}

async function onCourseContentsTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !courseContentsTbody) return;
  const action = target.dataset.action;
  if (!action) return;
  const row = target.closest("tr[data-content-code]");
  if (!row) return;
  const contentCode = String(row.dataset.contentCode || "").trim();
  if (!contentCode) return;

  if (action === "save-course-content") {
    const payload = collectCourseContentPayloadFromRow(row);
    try {
      await apiFetch(`/api/admin/course-contents/${encodeURIComponent(contentCode)}`, {
        method: "PUT",
        token: state.token,
        body: payload
      });
      showCourseContentsMsg(`课程占位 ${contentCode} 已保存。`, false);
      await renderCourseContents();
    } catch (err) {
      showCourseContentsMsg(`保存失败：${err.message}`, true);
    }
    return;
  }

  if (action === "delete-course-content") {
    const ok = confirm(`确认删除课程占位 ${contentCode}？`);
    if (!ok) return;
    try {
      await apiFetch(`/api/admin/course-contents/${encodeURIComponent(contentCode)}`, {
        method: "DELETE",
        token: state.token
      });
      showCourseContentsMsg(`课程占位 ${contentCode} 已删除。`, false);
      await renderCourseContents();
    } catch (err) {
      showCourseContentsMsg(`删除失败：${err.message}`, true);
    }
  }
}

function applySitePricingToForm(config) {
  if (!basicOriginalPriceInput) return;
  const normalized = normalizeSitePricingFormConfig(config);
  pricingPromoEnabledInput.checked = Boolean(normalized.promoEnabled);
  pricingPromoEndAtInput.value = isoToDatetimeLocal(normalized.promoEndAt);
  basicOriginalPriceInput.value = normalized.plans.basic.originalPrice;
  basicPromoPriceInput.value = normalized.plans.basic.promoPrice;
  basicDurationTextInput.value = normalized.plans.basic.durationText;
  professionalOriginalPriceInput.value = normalized.plans.professional.originalPrice;
  professionalPromoPriceInput.value = normalized.plans.professional.promoPrice;
  professionalDurationTextInput.value = normalized.plans.professional.durationText;
  professionalRecommendedInput.checked = Boolean(normalized.plans.professional.recommended);
  aiOriginalPriceInput.value = normalized.plans.ai.originalPrice;
  aiPromoPriceInput.value = normalized.plans.ai.promoPrice;
  aiDurationTextInput.value = normalized.plans.ai.durationText;
}

function collectSitePricingFromForm() {
  if (!basicOriginalPriceInput) return null;
  return normalizeSitePricingFormConfig({
    promoEnabled: Boolean(pricingPromoEnabledInput?.checked),
    promoEndAt: datetimeLocalToIso(pricingPromoEndAtInput?.value || ""),
    plans: {
      basic: {
        originalPrice: basicOriginalPriceInput.value,
        promoPrice: basicPromoPriceInput.value,
        durationText: basicDurationTextInput.value
      },
      professional: {
        originalPrice: professionalOriginalPriceInput.value,
        promoPrice: professionalPromoPriceInput.value,
        durationText: professionalDurationTextInput.value,
        recommended: Boolean(professionalRecommendedInput?.checked)
      },
      ai: {
        originalPrice: aiOriginalPriceInput.value,
        promoPrice: aiPromoPriceInput.value,
        durationText: aiDurationTextInput.value
      }
    }
  });
}

function normalizeSitePricingFormConfig(config) {
  const raw = config && typeof config === "object" ? config : {};
  const plans = raw.plans && typeof raw.plans === "object" ? raw.plans : {};
  const basic = plans.basic && typeof plans.basic === "object" ? plans.basic : {};
  const professional = plans.professional && typeof plans.professional === "object" ? plans.professional : {};
  const ai = plans.ai && typeof plans.ai === "object" ? plans.ai : {};
  return {
    promoEnabled: Boolean(raw.promoEnabled),
    promoEndAt: String(raw.promoEndAt || "").trim(),
    plans: {
      basic: {
        originalPrice: normalizePositiveInt(basic.originalPrice, 699),
        promoPrice: normalizePositiveInt(basic.promoPrice, 399),
        durationText: normalizeDurationText(basic.durationText, "3个月训练")
      },
      professional: {
        originalPrice: normalizePositiveInt(professional.originalPrice, 999),
        promoPrice: normalizePositiveInt(professional.promoPrice, 599),
        durationText: normalizeDurationText(professional.durationText, "3个月训练"),
        recommended: Boolean(professional.recommended)
      },
      ai: {
        originalPrice: normalizePositiveInt(ai.originalPrice, 1599),
        promoPrice: normalizePositiveInt(ai.promoPrice, 999),
        durationText: normalizeDurationText(ai.durationText, "3个月训练")
      }
    }
  };
}

function normalizePositiveInt(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(1, Math.round(num));
}

function normalizeDurationText(value, fallback) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text.slice(0, 80);
}

function datetimeLocalToIso(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const dt = new Date(text);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString();
}

function isoToDatetimeLocal(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const dt = new Date(text);
  if (Number.isNaN(dt.getTime())) return "";
  const pad2 = (num) => String(num).padStart(2, "0");
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}T${pad2(dt.getHours())}:${pad2(
    dt.getMinutes()
  )}`;
}

function renderSitePricingRuntimeHint(runtime, serverNow) {
  if (!sitePricingRuntimeHint) return;
  const enabled = Boolean(runtime && runtime.promoEnabled);
  const active = Boolean(runtime && runtime.promoActive);
  const endAt = String(runtime?.promoEndAt || "").trim();
  const serverText = String(serverNow || "").trim();
  const serverLabel = serverText ? `服务器时间：${formatIsoForDisplay(serverText)}` : "";
  if (!enabled) {
    sitePricingRuntimeHint.textContent = ["当前状态：未启用限时优惠。", serverLabel].filter(Boolean).join(" ");
    return;
  }
  if (!endAt) {
    sitePricingRuntimeHint.textContent = ["当前状态：已启用限时优惠（未设置结束时间）。", serverLabel].filter(Boolean).join(" ");
    return;
  }
  const endLabel = formatIsoForDisplay(endAt);
  const stateLabel = active ? "当前状态：优惠进行中。" : "当前状态：优惠已结束，前台会自动显示原价。";
  sitePricingRuntimeHint.textContent = [stateLabel, `结束时间：${endLabel}`, serverLabel].filter(Boolean).join(" ");
}

function formatIsoForDisplay(value) {
  const dt = new Date(String(value || ""));
  if (Number.isNaN(dt.getTime())) return String(value || "");
  return dt.toLocaleString("zh-CN", { hour12: false });
}

async function renderCategories() {
  const categories = await apiFetch("/api/admin/categories", { token: state.token });
  state.categories = Array.isArray(categories) ? categories : [];
  renderCategoriesTable();
  renderUsersHeader();
  renderExamCategorySelectInputOptions();
  renderImportCategoryOptions();
  renderQuestionManagerFilterOptions();
}

async function renderExamCategories() {
  const rows = await apiFetch("/api/admin/exam-categories", { token: state.token });
  state.examCategories = Array.isArray(rows) ? rows : [];
  renderExamCategoryManageExamOptions();
  renderExamCategoriesTable();
  renderImportExamOptions();
  renderImportExamCategoryOptions();
  renderQuestionManagerFilterOptions();
}

function renderCategoriesTable() {
  if (!categoriesTbody) return;
  categoriesTbody.innerHTML = "";
  categoryMsg?.classList.add("hidden");

  if (!state.categories.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td colspan='5'>暂无分类，请先新增分类。</td>";
    categoriesTbody.appendChild(tr);
    return;
  }

  state.categories.forEach((category) => {
    const tr = document.createElement("tr");
    tr.dataset.categoryKey = category.key;
    tr.innerHTML = `
      <td><code>${escapeHtml(category.key)}</code></td>
      <td><input type="text" data-field="name" value="${escapeHtml(category.name || "")}" /></td>
      <td><input type="number" data-field="sortOrder" value="${Number(category.sortOrder || 100)}" /></td>
      <td><input type="checkbox" data-field="isEnabled" ${category.isEnabled ? "checked" : ""} /></td>
      <td>
        <button class="btn" data-action="save-category">保存</button>
        <button class="btn ghost" data-action="delete-category" style="margin-left:6px;color:#be2f2f;">删除</button>
      </td>
    `;
    categoriesTbody.appendChild(tr);
  });
}

function renderExamCategorySelectInputOptions() {
  if (!examCategorySelectInput) return;
  const previous = examCategorySelectInput.value || "";
  examCategorySelectInput.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "请选择绑定分类";
  placeholder.selected = true;
  examCategorySelectInput.appendChild(placeholder);
  const enabledCategories = getEnabledCategories();
  for (const category of enabledCategories) {
    const option = document.createElement("option");
    option.value = category.key;
    option.textContent = `${category.name} (${category.key})`;
    examCategorySelectInput.appendChild(option);
  }
  examCategorySelectInput.disabled = enabledCategories.length === 0;
  if (previous && enabledCategories.some((item) => item.key === previous)) {
    examCategorySelectInput.value = previous;
  }
  syncExamCreateFormInteraction();
}

function renderImportCategoryOptions() {
  if (importCategoryCodeSelect) {
    renderImportExamCategoryOptions();
    return;
  }
  if (!importCategorySelect) return;
  const prev = importCategorySelect.value || "";
  importCategorySelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "请选择导入分类（来自题型分类管理）";
  placeholder.selected = true;
  importCategorySelect.appendChild(placeholder);
  const enabledCategories = state.categories.filter((item) => item.isEnabled);
  if (!enabledCategories.length) {
    importCategorySelect.disabled = true;
    return;
  }
  enabledCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.key;
    option.textContent = `${category.name} (${category.key})`;
    importCategorySelect.appendChild(option);
  });
  importCategorySelect.disabled = false;
  if (prev && enabledCategories.some((item) => item.key === prev)) {
    importCategorySelect.value = prev;
  }
  syncImportCategoryFromSelection();
}

function renderExamCategoryManageExamOptions() {
  if (!examCategoryManageExamSelect) return;
  const prev = examCategoryManageExamSelect.value || "";
  examCategoryManageExamSelect.innerHTML = "";
  const exams = [...getExamCatalogRows({ usableOnly: false })].sort((a, b) =>
    String(a?.examCode || "").localeCompare(String(b?.examCode || ""), "en")
  );
  if (!exams.length) {
    setSelectPlaceholder(examCategoryManageExamSelect, "暂无考试");
    return;
  }
  for (const exam of exams) {
    const code = String(exam.examCode || "").trim();
    if (!code) continue;
    const option = document.createElement("option");
    option.value = code;
    option.textContent = `${exam.examName || code} (${code})`;
    examCategoryManageExamSelect.appendChild(option);
  }
  examCategoryManageExamSelect.disabled = false;
  if (prev && Array.from(examCategoryManageExamSelect.options).some((opt) => opt.value === prev)) {
    examCategoryManageExamSelect.value = prev;
  }
}

function renderExamCategoriesTable() {
  if (!examCategoriesTbody) return;
  examCategoriesTbody.innerHTML = "";
  examCategoryMsg?.classList.add("hidden");
  const selectedExam = String(examCategoryManageExamSelect?.value || "").trim();
  const rows = state.examCategories.filter((item) => !selectedExam || String(item.examCode || "") === selectedExam);
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td colspan='7'>当前考试暂无分类。</td>";
    examCategoriesTbody.appendChild(tr);
    return;
  }
  rows
    .slice()
    .sort((a, b) => {
      const aa = `${a.examCode}-${Number(a.sortOrder || 100)}-${a.code}`;
      const bb = `${b.examCode}-${Number(b.sortOrder || 100)}-${b.code}`;
      return aa.localeCompare(bb, "en");
    })
    .forEach((item) => {
      const tr = document.createElement("tr");
      tr.dataset.code = String(item.code || "");
      tr.innerHTML = `
        <td><code>${escapeHtml(item.examCode || "--")}</code></td>
        <td><code>${escapeHtml(item.code || "--")}</code></td>
        <td><input type="text" data-field="name" value="${escapeHtml(item.name || "")}" /></td>
        <td><input type="text" data-field="nameZh" value="${escapeHtml(item.nameZh || "")}" /></td>
        <td><input type="number" data-field="sortOrder" value="${Number(item.sortOrder || 100)}" /></td>
        <td><input type="checkbox" data-field="isActive" ${item.isActive ? "checked" : ""} /></td>
        <td>
          <button class="btn" data-action="save-exam-category">保存</button>
          <button class="btn ghost" data-action="delete-exam-category" style="margin-left:6px;color:#be2f2f;">删除</button>
        </td>
      `;
      examCategoriesTbody.appendChild(tr);
    });
}

function renderImportExamOptions() {
  if (!importExamSelect) return;
  const prev = state.importExamCode || importExamSelect.value || "";
  importExamSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "请选择默认考试";
  importExamSelect.appendChild(placeholder);
  const exams = getExamCatalogRows({ usableOnly: true }).sort((a, b) =>
    String(a?.examCode || "").localeCompare(String(b?.examCode || ""), "en")
  );
  for (const exam of exams) {
    const code = String(exam.examCode || "").trim();
    if (!code) continue;
    const option = document.createElement("option");
    option.value = code;
    option.textContent = `${exam.examName || code} (${code})`;
    importExamSelect.appendChild(option);
  }
  importExamSelect.disabled = exams.length === 0;
  if (prev && Array.from(importExamSelect.options).some((opt) => opt.value === prev)) {
    importExamSelect.value = prev;
  }
  state.importExamCode = importExamSelect.value || "";
}

function renderImportExamCategoryOptions() {
  if (!importCategoryCodeSelect) return;
  const prev = importCategoryCodeSelect.value || "";
  const examCode = String(importExamSelect?.value || state.importExamCode || "").trim();
  importCategoryCodeSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = examCode ? "请选择默认分类（可选）" : "请先选择默认考试";
  importCategoryCodeSelect.appendChild(placeholder);
  if (!examCode) {
    importCategoryCodeSelect.disabled = true;
    return;
  }
  const categories = state.examCategories
    .filter((item) => String(item.examCode || "") === examCode && item.isActive === true)
    .sort((a, b) => Number(a.sortOrder || 100) - Number(b.sortOrder || 100) || String(a.code || "").localeCompare(String(b.code || ""), "en"));
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = String(category.code || "");
    option.textContent = `${category.name || category.code} (${category.code})`;
    importCategoryCodeSelect.appendChild(option);
  }
  importCategoryCodeSelect.disabled = categories.length === 0;
  if (prev && Array.from(importCategoryCodeSelect.options).some((opt) => opt.value === prev)) {
    importCategoryCodeSelect.value = prev;
  }
}

function renderQuestionManagerFilterOptions() {
  const categoryPrev = qmCategoryFilter?.value || "";
  const examPrev = qmExamFilter?.value || "";
  const statusPrev = qmStatusFilter?.value || "all";
  if (qmCategoryFilter) {
    qmCategoryFilter.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "全部分类";
    qmCategoryFilter.appendChild(allOption);
    const sortedCategories = [...state.examCategories].filter((item) => item?.isActive === true).sort((a, b) => {
      const sa = Number(a?.sortOrder ?? 1000);
      const sb = Number(b?.sortOrder ?? 1000);
      if (sa !== sb) return sa - sb;
      return String(a?.name || a?.code || "").localeCompare(String(b?.name || b?.code || ""), "zh-Hans");
    });
    for (const category of sortedCategories) {
      if (!category?.code) continue;
      const option = document.createElement("option");
      option.value = category.code;
      option.textContent = `${category.name || category.code} (${category.code})`;
      qmCategoryFilter.appendChild(option);
    }
    if (categoryPrev && Array.from(qmCategoryFilter.options).some((opt) => opt.value === categoryPrev)) {
      qmCategoryFilter.value = categoryPrev;
    }
  }

  if (qmExamFilter) {
    qmExamFilter.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "全部考试";
    qmExamFilter.appendChild(allOption);
    const seen = new Set();
    const exams = [...getExamCatalogRows({ usableOnly: true })].sort((a, b) =>
      String(a?.examCode || "").localeCompare(String(b?.examCode || ""), "en")
    );
    for (const exam of exams) {
      const examCode = String(exam?.examCode || "").trim();
      if (!examCode || seen.has(examCode)) continue;
      seen.add(examCode);
      const option = document.createElement("option");
      option.value = examCode;
      option.textContent = `${exam.examName || examCode} (${examCode})`;
      qmExamFilter.appendChild(option);
    }
    if (examPrev && Array.from(qmExamFilter.options).some((opt) => opt.value === examPrev)) {
      qmExamFilter.value = examPrev;
    }
  }

  if (qmStatusFilter) {
    if (Array.from(qmStatusFilter.options).some((opt) => opt.value === statusPrev)) {
      qmStatusFilter.value = statusPrev;
    } else {
      qmStatusFilter.value = "all";
    }
  }
}

function resetQuestionManagerFilters() {
  if (qmCategoryFilter) qmCategoryFilter.value = "";
  if (qmExamFilter) qmExamFilter.value = "";
  if (qmStatusFilter) qmStatusFilter.value = "all";
  if (qmIncludeDeletedToggle) qmIncludeDeletedToggle.checked = false;
  if (qmKeywordInput) qmKeywordInput.value = "";
  state.questionManagerPage = 1;
  state.questionManagerSelectedKeys = new Set();
  refreshQuestionManagerBulkToolbar();
}

function buildQuestionManagerQuery() {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, state.questionManagerPage || 1)));
  params.set("page_size", String(Math.max(1, state.questionManagerPageSize || 20)));
  const categoryCode = (qmCategoryFilter?.value || "").trim();
  const examCode = (qmExamFilter?.value || "").trim();
  const questionStatus = (qmStatusFilter?.value || "all").trim();
  const includeDeleted = qmIncludeDeletedToggle?.checked === true;
  const keyword = (qmKeywordInput?.value || "").trim();
  if (categoryCode) params.set("category_code", categoryCode);
  if (examCode) params.set("exam_code", examCode);
  if (questionStatus === "active" || questionStatus === "inactive") {
    params.set("question_status", questionStatus);
  } else if (includeDeleted) {
    params.set("question_status", "all");
    params.set("include_deleted", "1");
  }
  if (keyword) params.set("keyword", keyword);
  return params.toString();
}

async function loadQuestionManager({ resetPage = false } = {}) {
  if (!qmTbody) return;
  if (resetPage) {
    state.questionManagerPage = 1;
  }
  const query = buildQuestionManagerQuery();
  try {
    showQuestionManagerMsg("题目列表加载中...", false);
    const payload = await apiFetch(`/api/admin/questions?${query}`, { token: state.token });
    state.questionManagerItems = Array.isArray(payload?.items) ? payload.items : [];
    state.questionManagerTotal = Number(payload?.total || 0);
    state.questionManagerPage = Math.max(1, Number(payload?.page || state.questionManagerPage || 1));
    state.questionManagerPageSize = Math.max(1, Number(payload?.pageSize || state.questionManagerPageSize || 20));
    state.questionManagerTotalPages = Math.max(1, Number(payload?.totalPages || 1));
    state.questionManagerSelectedKeys = new Set();
    renderQuestionManagerTable();
    if (qmPageInfo) {
      qmPageInfo.textContent = `第 ${state.questionManagerPage}/${state.questionManagerTotalPages} 页 · 共 ${state.questionManagerTotal} 题`;
    }
    if (qmPrevBtn) qmPrevBtn.disabled = state.questionManagerPage <= 1;
    if (qmNextBtn) qmNextBtn.disabled = state.questionManagerPage >= state.questionManagerTotalPages;
    showQuestionManagerMsg(`已加载 ${state.questionManagerItems.length} 条题目记录。`, false);
  } catch (err) {
    state.questionManagerItems = [];
    state.questionManagerTotal = 0;
    state.questionManagerTotalPages = 1;
    state.questionManagerSelectedKeys = new Set();
    renderQuestionManagerTable();
    if (qmPageInfo) qmPageInfo.textContent = "--";
    if (qmPrevBtn) qmPrevBtn.disabled = true;
    if (qmNextBtn) qmNextBtn.disabled = true;
    showQuestionManagerMsg(`加载失败：${err.message}`, true);
  }
}

function renderQuestionManagerTable() {
  if (!qmTbody) return;
  qmTbody.innerHTML = "";
  const rows = state.questionManagerItems || [];
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td colspan='8'>暂无匹配题目。</td>";
    qmTbody.appendChild(tr);
    refreshQuestionManagerBulkToolbar();
    return;
  }

  for (const item of rows) {
    const questionStatus = String(item?.questionStatus || "active").trim();
    const questionId = String(item?.questionId || "").trim();
    const examId = String(item?.examId || "").trim();
    const examCode = String(item?.examCode || "").trim();
    const categoryCode = String(item?.categoryCode || item?.categoryKey || "").trim();
    const promptPreview = String(item?.promptPreview || "").trim() || "--";
    const updatedAt = String(item?.updatedAt || "").trim() || "--";
    const key = questionSelectionKey({ questionId, examId });
    const checked = state.questionManagerSelectedKeys.has(key);
    const tr = document.createElement("tr");
    tr.dataset.questionId = questionId;
    tr.dataset.examId = examId;
    tr.dataset.examCode = examCode;
    tr.dataset.questionStatus = questionStatus;
    tr.innerHTML = `
      <td><input type="checkbox" data-action="qm-row-select" ${checked ? "checked" : ""} /></td>
      <td><code>${escapeHtml(questionId)}</code></td>
      <td title="${escapeHtml(promptPreview)}">${escapeHtml(promptPreview)}</td>
      <td><code>${escapeHtml(examCode || "--")}</code></td>
      <td><code>${escapeHtml(categoryCode || "--")}</code></td>
      <td>${escapeHtml(questionStatus)}</td>
      <td>${escapeHtml(updatedAt)}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn" data-action="qm-set-status" data-next-status="inactive" ${
            questionStatus === "inactive" ? "disabled" : ""
          }>暂停题目</button>
          <button type="button" class="btn" data-action="qm-set-status" data-next-status="active" ${
            questionStatus === "active" ? "disabled" : ""
          }>恢复题目</button>
          <button type="button" class="btn ghost" data-action="qm-set-status" data-next-status="deleted" ${
            questionStatus === "deleted" ? "disabled" : ""
          }>删除题目</button>
          <button type="button" class="btn" data-action="qm-image" data-image-url="${escapeHtml(String(item?.imageUrl || item?.image_url || ""))}" style="background:${(item?.imageUrl || item?.image_url) ? "#3b82f6" : ""};color:${(item?.imageUrl || item?.image_url) ? "#fff" : ""};">${(item?.imageUrl || item?.image_url) ? "管理图片" : "添加图片"}</button>
        </div>
      </td>
    `;
    qmTbody.appendChild(tr);
  }
  refreshQuestionManagerBulkToolbar();
}

async function onQuestionManagerTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  // Handle image button first (new)
  const imageBtn = target.closest("button[data-action='qm-image']");
  if (imageBtn) {
    const row = imageBtn.closest("tr[data-question-id]");
    if (!row) return;
    const questionId = (row.dataset.questionId || "").trim();
    if (!questionId) return;
    const currentImageUrl = (imageBtn.dataset.imageUrl || "").trim();
    openQuestionImageDialog(questionId, currentImageUrl);
    return;
  }

  const button = target.closest("button[data-action='qm-set-status']");
  if (!button) return;
  const row = button.closest("tr[data-question-id]");
  if (!row) return;
  const questionId = (row.dataset.questionId || "").trim();
  const examId = (row.dataset.examId || "").trim();
  const examCode = (row.dataset.examCode || "").trim();
  const currentStatus = (row.dataset.questionStatus || "active").trim();
  const nextStatus = (button.dataset.nextStatus || "").trim();
  if (!questionId || !nextStatus || currentStatus === nextStatus) return;

  let message = "";
  if (nextStatus === "deleted") {
    message = `确认将题目 ${questionId} 设为 deleted（软删除）吗？`;
  } else if (nextStatus === "inactive") {
    message = `确认暂停题目 ${questionId} 吗？`;
  } else {
    message = `确认恢复题目 ${questionId} 为 active 吗？`;
  }
  if (!window.confirm(message)) return;
  await updateQuestionStatus({ questionId, examId, examCode, nextStatus });
}

function onQuestionManagerTableChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.dataset.action !== "qm-row-select") return;
  const row = target.closest("tr[data-question-id]");
  if (!row) return;
  const questionId = (row.dataset.questionId || "").trim();
  const examId = (row.dataset.examId || "").trim();
  const key = questionSelectionKey({ questionId, examId });
  if (!key) return;
  if (target.checked) {
    state.questionManagerSelectedKeys.add(key);
  } else {
    state.questionManagerSelectedKeys.delete(key);
  }
  refreshQuestionManagerBulkToolbar();
}

function questionSelectionKey({ questionId, examId }) {
  const qid = String(questionId || "").trim();
  const eid = String(examId || "").trim();
  if (!qid || !eid) return "";
  return `${qid}::${eid}`;
}

function getSelectedQuestionTargets() {
  const selected = [];
  for (const item of state.questionManagerItems || []) {
    const questionId = String(item?.questionId || "").trim();
    const examId = String(item?.examId || "").trim();
    const examCode = String(item?.examCode || "").trim();
    const key = questionSelectionKey({ questionId, examId });
    if (!key || !state.questionManagerSelectedKeys.has(key)) continue;
    selected.push({
      question_id: questionId,
      exam_id: examId,
      exam_code: examCode
    });
  }
  return selected;
}

function refreshQuestionManagerBulkToolbar() {
  const selectedCount = state.questionManagerSelectedKeys.size;
  if (qmSelectedCount) {
    qmSelectedCount.textContent = `已选 ${selectedCount} 题`;
  }
  const disabled = selectedCount < 1;
  if (qmBulkInactiveBtn) qmBulkInactiveBtn.disabled = disabled;
  if (qmBulkActiveBtn) qmBulkActiveBtn.disabled = disabled;
  if (qmBulkDeleteBtn) qmBulkDeleteBtn.disabled = disabled;
}

function selectAllQuestionManagerCurrentPage() {
  for (const item of state.questionManagerItems || []) {
    const key = questionSelectionKey({ questionId: item?.questionId, examId: item?.examId });
    if (key) state.questionManagerSelectedKeys.add(key);
  }
  renderQuestionManagerTable();
}

function clearAllQuestionManagerSelection() {
  state.questionManagerSelectedKeys = new Set();
  renderQuestionManagerTable();
}

async function onQuestionManagerBulkAction(nextStatus) {
  const status = String(nextStatus || "").trim();
  if (!["active", "inactive", "deleted"].includes(status)) {
    showQuestionManagerMsg("批量状态非法。", true);
    return;
  }
  const questionIds = getSelectedQuestionTargets();
  if (!questionIds.length) {
    showQuestionManagerMsg("请先选择要操作的题目。", true);
    refreshQuestionManagerBulkToolbar();
    return;
  }

  const actionLabel = status === "inactive" ? "批量暂停" : status === "active" ? "批量恢复" : "批量删除";
  const confirmed = window.confirm(`确认${actionLabel}已选 ${questionIds.length} 题吗？`);
  if (!confirmed) return;

  try {
    const payload = await apiFetch("/api/admin/questions/bulk-status", {
      method: "PATCH",
      token: state.token,
      body: {
        question_ids: questionIds,
        status
      }
    });
    showQuestionManagerMsg(
      `${actionLabel}完成：请求 ${Number(payload?.requested || questionIds.length)}，匹配 ${Number(payload?.matched || 0)}，更新 ${Number(
        payload?.changed || 0
      )}。`,
      false
    );
    state.questionManagerSelectedKeys = new Set();
    await loadQuestionManager({ resetPage: false });
    await renderBankStats();
  } catch (err) {
    showQuestionManagerMsg(`${actionLabel}失败：${err.message}`, true);
  }
}

async function updateQuestionStatus({ questionId, examId, examCode, nextStatus }) {
  try {
    const payload = await apiFetch(`/api/admin/questions/${encodeURIComponent(questionId)}`, {
      method: "PATCH",
      token: state.token,
      body: {
        status: nextStatus,
        exam_id: examId,
        exam_code: examCode
      }
    });
    const changed = payload?.changed === true;
    const statusText = payload?.question?.questionStatus || nextStatus;
    showQuestionManagerMsg(
      changed ? `题目 ${questionId} 已更新为 ${statusText}。` : `题目 ${questionId} 状态未变化（仍为 ${statusText}）。`,
      false
    );
    state.questionManagerSelectedKeys = new Set();
    await loadQuestionManager({ resetPage: false });
    await renderBankStats();
  } catch (err) {
    showQuestionManagerMsg(`更新失败：${err.message}`, true);
  }
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .replace(/[^a-z0-9_]/g, "");
}

function examTypeLabelZh(examType) {
  return examType === "law_business" ? "法律考试" : "技术考试";
}

function guessSubItemLabel(code) {
  const raw = String(code || "").trim();
  if (!raw) return "无";
  const normalized = normalizeKey(raw);
  if (normalized === "b_general") return "B General";
  const match = normalized.match(/^c(\d+)_?(.*)$/);
  if (match) {
    return `C-${match[1]}`;
  }
  return raw
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function getProjectByKey(projectKey, options = {}) {
  return getProjectOptions(options).find((item) => item.key === projectKey) || null;
}

function makeProjectKey(industryKey, licenseGroup) {
  const industry = normalizeKey(industryKey);
  const family = normalizeKey(licenseGroup);
  if (!industry || !family) return "";
  return `${industry}__${family}`;
}

function buildProjectDisplayName(industryKey, industryName, licenseGroup, licenseGroupName) {
  const left = String(industryName || industryKey || "").trim();
  const right = String(licenseGroupName || licenseGroup || "").trim();
  if (!left && !right) return "未命名项目";
  return right ? `${left} / ${right}` : left;
}

function inferProjectKeyFromExam(exam) {
  return makeProjectKey(exam?.industryKey, exam?.licenseGroup || exam?.examFamilyKey);
}

function getExamCatalogRows(options = {}) {
  const usableOnly = options.usableOnly === true;
  const rows = Array.isArray(state.examCatalog) ? state.examCatalog : [];
  if (!usableOnly) return rows;
  return rows.filter((item) => item && item.isEnabled === true && isExamCategoryBindingValid(item));
}

function getProjectOptions(options = {}) {
  const projects = new Map();
  for (const exam of getExamCatalogRows(options)) {
    const industryKey = normalizeKey(exam?.industryKey);
    const licenseGroup = normalizeKey(exam?.licenseGroup || exam?.examFamilyKey);
    const key = makeProjectKey(industryKey, licenseGroup);
    if (!key) continue;
    if (!projects.has(key)) {
      projects.set(key, {
        key,
        name: buildProjectDisplayName(
          industryKey,
          exam?.industryName,
          licenseGroup,
          exam?.licenseGroupName || exam?.examFamilyName
        ),
        industryKey,
        industryName: exam?.industryName || industryKey,
        licenseGroup,
        licenseGroupName: exam?.licenseGroupName || exam?.examFamilyName || licenseGroup,
        _tradeCodes: new Set()
      });
    }
    const project = projects.get(key);
    const examType = resolveExamType(exam);
    const tradeCode = normalizeKey(resolveTradeCode(exam));
    if (examType === "trade" && tradeCode && !isSharedTradeCode(tradeCode)) {
      project._tradeCodes.add(tradeCode);
    }
  }

  return Array.from(projects.values())
    .map((project) => ({
      key: project.key,
      name: project.name,
      industryKey: project.industryKey,
      industryName: project.industryName,
      licenseGroup: project.licenseGroup,
      licenseGroupName: project.licenseGroupName,
      needsSubItem:
        (project.industryKey === "contractor" && project.licenseGroup === "c_specialty") ||
        (!(project.industryKey === "contractor" && project.licenseGroup === "b_general") &&
          project._tradeCodes.size > 0)
    }))
    .sort((a, b) => {
      if (a.industryKey !== b.industryKey) return a.industryKey.localeCompare(b.industryKey, "en");
      if (a.licenseGroup !== b.licenseGroup) return a.licenseGroup.localeCompare(b.licenseGroup, "en");
      return a.name.localeCompare(b.name, "zh-Hans");
    });
}

function getSubItemsForProject(projectKey, options = {}) {
  const mapped = new Map();
  for (const exam of getExamCatalogRows(options)) {
    if (inferProjectKeyFromExam(exam) !== projectKey) continue;
    if (resolveExamType(exam) !== "trade") continue;
    const code = normalizeKey(resolveTradeCode(exam));
    if (!code || isSharedTradeCode(code)) continue;
    if (!mapped.has(code)) mapped.set(code, guessSubItemLabel(code));
  }
  return Array.from(mapped.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code, "en"));
}

function buildBusinessContext(projectKey, subItemCode, examType) {
  const project = getProjectByKey(projectKey);
  if (!project) return null;
  const normalizedExamType = examType === "law_business" ? "law_business" : "trade";
  const normalizedSubItem = normalizeKey(subItemCode);

  let specializationCode = "";
  if (normalizedExamType === "trade") {
    specializationCode = normalizedSubItem || (project.licenseGroup === "b_general" ? "b_general" : "");
  }

  const matchedExam =
    (state.examCatalog || []).find((item) => {
      if (inferProjectKeyFromExam(item) !== projectKey) return false;
      if (resolveExamType(item) !== normalizedExamType) return false;
      const tradeCode = normalizeKey(resolveTradeCode(item));
      if (normalizedExamType === "law_business") {
        if (!specializationCode) return isSharedTradeCode(tradeCode);
        return isSharedTradeCode(tradeCode) || tradeCode === specializationCode;
      }
      return tradeCode === specializationCode;
    }) || null;

  return {
    project,
    industryKey: project.industryKey,
    industryName: project.industryName,
    licenseGroup: project.licenseGroup,
    licenseGroupName: project.licenseGroupName,
    specializationCode,
    examType: normalizedExamType,
    examCode: normalizeKey(matchedExam?.examCode || "")
  };
}

function buildSmartDisplayName(projectKey, subItemCode, examType) {
  const normalizedType = examType === "law_business" ? "law_business" : "trade";
  if (normalizedType === "law_business") {
    return "Law & Business";
  }
  const project = getProjectByKey(projectKey);
  const label = guessSubItemLabel(subItemCode);
  if (label && label !== "无") return `${label} Trade`;
  if (!project) return "Trade";
  return `${project.name} 技术考试`;
}

function getCreateStructureInput() {
  const examTypeRaw = String(examTypeInput?.value || "").trim();
  return {
    industryKey: normalizeKey(examIndustryKeyInput?.value || ""),
    industryName: String(examIndustryNameInput?.value || "").trim(),
    examFamilyKey: normalizeKey(examFamilyKeyInput?.value || ""),
    examFamilyName: String(examFamilyNameInput?.value || "").trim(),
    tradeCode: normalizeKey(examTradeCodeInput?.value || ""),
    examType: examTypeRaw === "law_business" ? "law_business" : examTypeRaw === "trade" ? "trade" : ""
  };
}

function isExamCreatePathReady() {
  const input = getCreateStructureInput();
  if (!input.industryKey || !input.industryName || !input.examFamilyKey || !input.examFamilyName) return false;
  if (!["law_business", "trade"].includes(input.examType)) return false;
  if (input.examType === "trade" && !input.tradeCode) return false;
  return true;
}

function getSmartDefaultCategoryKey(input) {
  const enabledCategories = getEnabledCategories();
  if (!enabledCategories.length) return "";
  const familyKey = normalizeKey(input?.examFamilyKey || "");
  if (familyKey === "b_general" && enabledCategories.some((item) => item.key === "b_license")) return "b_license";
  if (familyKey === "c_specialty" && enabledCategories.some((item) => item.key === "c_license")) return "c_license";
  return enabledCategories[0]?.key || "";
}

function syncExamCategoryFromSmartDefault() {
  if (!examCategorySelectInput) return;
  const nextAuto = getSmartDefaultCategoryKey(getCreateStructureInput());
  const current = (examCategorySelectInput.value || "").trim();
  if (!nextAuto) {
    state.lastAutoCategoryKey = "";
    return;
  }
  if (!state.examCategoryDirty || !current || current === state.lastAutoCategoryKey) {
    examCategorySelectInput.value = nextAuto;
    state.examCategoryDirty = false;
    state.lastAutoCategoryKey = nextAuto;
    return;
  }
  state.lastAutoCategoryKey = nextAuto;
}

function buildCreateDefaultExamName(input) {
  if ((input?.examType || "") === "law_business") return "Law & Business";
  const label = guessSubItemLabel(input?.tradeCode || "");
  if (label && label !== "无") return `${label} Trade`;
  const familyName = String(input?.examFamilyName || "").trim();
  return familyName ? `${familyName} 技术考试` : "Trade";
}

function syncExamNameFromSmartDefault() {
  if (!examNameInput) return;
  const nextAuto = buildCreateDefaultExamName(getCreateStructureInput());
  const current = (examNameInput.value || "").trim();
  if (!state.examNameDirty || !current || current === state.lastAutoExamName || !isExamCreatePathReady()) {
    examNameInput.value = nextAuto;
    state.examNameDirty = false;
    state.lastAutoExamName = nextAuto;
    return;
  }
  state.lastAutoExamName = nextAuto;
}

function syncExamCreateFormInteraction() {
  const ready = isExamCreatePathReady();
  if (createExamCatalogBtn) {
    createExamCatalogBtn.disabled = false;
  }
  if (examCreateHint) {
    examCreateHint.textContent = ready
      ? "创建将直接写入考试结构主数据，保存后各模块立即刷新。"
      : "请填写：项目代码/名称、执照组代码/名称、考试类型（技术考试需子项代码）。";
  }
  syncExamNameFromSmartDefault();
  syncExamCategoryFromSmartDefault();
}

function renderImportProjectOptions() {
  if (!importProjectSelect) return;
  const previous = state.importProjectKey || importProjectSelect.value || "";
  const projects = getProjectOptions({ usableOnly: true });
  importProjectSelect.innerHTML = "";
  for (const project of projects) {
    const option = document.createElement("option");
    option.value = project.key;
    option.textContent = project.name;
    importProjectSelect.appendChild(option);
  }
  importProjectSelect.disabled = !projects.length;
  if (!projects.length) return;
  if (Array.from(importProjectSelect.options).some((opt) => opt.value === previous)) {
    importProjectSelect.value = previous;
  }
  state.importProjectKey = importProjectSelect.value || projects[0].key;
}

function renderImportSubItemOptions() {
  if (!importSubItemSelect || !importProjectSelect) return;
  const projectKey = importProjectSelect.value || "";
  const project = getProjectByKey(projectKey, { usableOnly: true });
  const needsSubItem = project?.needsSubItem === true;
  const label = importSubItemSelect.closest("label");
  if (label) {
    label.style.display = needsSubItem ? "" : "none";
  }
  const previous = state.importSubItemCode || importSubItemSelect.value || "";
  importSubItemSelect.innerHTML = "";
  if (!needsSubItem) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "无子项";
    importSubItemSelect.appendChild(option);
    importSubItemSelect.disabled = true;
    state.importSubItemCode = "";
    return;
  }
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "请选择子项";
  importSubItemSelect.appendChild(placeholder);
  const subItems = getSubItemsForProject(projectKey, { usableOnly: true });
  for (const item of subItems) {
    const option = document.createElement("option");
    option.value = item.code;
    option.textContent = item.name;
    importSubItemSelect.appendChild(option);
  }
  importSubItemSelect.disabled = false;
  if (Array.from(importSubItemSelect.options).some((opt) => opt.value === previous)) {
    importSubItemSelect.value = previous;
  } else if (subItems.length) {
    importSubItemSelect.value = subItems[0].code;
  } else {
    importSubItemSelect.value = "";
  }
  state.importSubItemCode = importSubItemSelect.value || "";
}

async function renderExamCatalog() {
  const rows = await apiFetch("/api/admin/exam-catalog", { token: state.token });
  state.examCatalog = Array.isArray(rows) ? rows : [];
  syncExamCreateFormInteraction();
  renderExamCatalogTable();
  renderImportHierarchyOptions();
  renderImportExamOptions();
  renderImportExamCategoryOptions();
  renderReviewTargetExamOptions();
  renderQuestionManagerFilterOptions();
  renderProgressExamBindingOptions();
  const invalidRows = state.examCatalog.filter((item) => !isExamCategoryBindingValid(item));
  if (invalidRows.length > 0) {
    showExamCatalogMsg(
      `发现 ${invalidRows.length} 个考试项目绑定了无效分类，请先在“绑定分类”中改绑为题型分类管理中的有效分类后再用于导入。`,
      true
    );
  }
}

async function renderExamStructureManager() {
  if (!examStructureTbody) return;
  try {
    const payload = await apiFetch("/api/admin/exam-structure", { token: state.token });
    state.examStructureNodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
    renderExamStructureTable();
  } catch (err) {
    state.examStructureNodes = [];
    renderExamStructureTable();
    showExamStructureMsg(`结构加载失败：${err.message}`, true);
  }
}

function listProgramStructureNodes() {
  const result = [];
  const stack = Array.isArray(state.examStructureNodes) ? [...state.examStructureNodes] : [];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (String(node.nodeType || "") === "program" && Number(node.id || 0) > 0) {
      result.push({
        id: Number(node.id),
        nodeKey: String(node.nodeKey || "").trim(),
        name: String(node.name || "").trim()
      });
    }
    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) {
      stack.push(child);
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

function renderStructureSubItemProgramOptions() {
  if (!structureSubItemProgramSelect) return;
  const previous = String(structureSubItemProgramSelect.value || "").trim();
  const programs = listProgramStructureNodes();
  structureSubItemProgramSelect.innerHTML = "";
  if (!programs.length) {
    structureSubItemProgramSelect.disabled = true;
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "暂无可选项目";
    structureSubItemProgramSelect.appendChild(option);
    return;
  }
  structureSubItemProgramSelect.disabled = false;
  for (const item of programs) {
    const option = document.createElement("option");
    option.value = String(item.id);
    option.textContent = `${item.name || item.nodeKey} (${item.nodeKey})`;
    structureSubItemProgramSelect.appendChild(option);
  }
  if (Array.from(structureSubItemProgramSelect.options).some((opt) => opt.value === previous)) {
    structureSubItemProgramSelect.value = previous;
  } else {
    structureSubItemProgramSelect.value = String(programs[0].id);
  }
}

async function onCreateStructureProgram() {
  const nodeKey = normalizeKey(structureProgramKeyInput?.value || "");
  const name = String(structureProgramNameInput?.value || "").trim();
  const sortOrder = Number.parseInt(String(structureProgramSortOrderInput?.value || "100"), 10);
  const enabled = structureProgramEnabledInput?.checked !== false;

  if (!nodeKey) {
    showExamStructureMsg("新增失败：请填写项目代码（program_key）。", true);
    return;
  }
  if (nodeKey.length < 2) {
    showExamStructureMsg("新增失败：项目代码至少2个字符。", true);
    return;
  }
  if (!name || name.length < 2) {
    showExamStructureMsg("新增失败：项目名称至少2个字符。", true);
    return;
  }

  try {
    const payload = await apiFetch("/api/admin/exam-structure", {
      method: "POST",
      token: state.token,
      body: {
        nodeType: "program",
        nodeKey,
        name,
        sortOrder: Number.isFinite(sortOrder) && sortOrder > 0 ? sortOrder : 100,
        enabled
      }
    });
    await renderExamStructureManager();
    await renderExamCatalog();
    if (structureProgramKeyInput) structureProgramKeyInput.value = "";
    if (structureProgramNameInput) structureProgramNameInput.value = "";
    if (structureProgramSortOrderInput) structureProgramSortOrderInput.value = "100";
    if (structureProgramEnabledInput) structureProgramEnabledInput.checked = true;
    showExamStructureMsg(`项目已创建：${payload?.node?.name || name} (${payload?.node?.nodeKey || nodeKey})`, false);
  } catch (err) {
    if (err?.status === 409 && err?.data?.code === "ALREADY_EXISTS") {
      const existing = err?.data?.existingNode;
      showExamStructureMsg(
        `新增失败：项目已存在（${existing?.name || name} / ${existing?.nodeKey || nodeKey}）。`,
        true
      );
      await renderExamStructureManager();
      return;
    }
    showExamStructureMsg(`新增失败：${err.message}`, true);
  }
}

async function onCreateStructureSubItem() {
  const parentId = Number.parseInt(String(structureSubItemProgramSelect?.value || ""), 10);
  const nodeKey = normalizeKey(structureSubItemKeyInput?.value || "");
  const name = String(structureSubItemNameInput?.value || "").trim();
  const sortOrder = Number.parseInt(String(structureSubItemSortOrderInput?.value || "100"), 10);
  const enabled = structureSubItemEnabledInput?.checked !== false;

  if (!Number.isFinite(parentId) || parentId <= 0) {
    showExamStructureMsg("新增失败：请先选择所属项目。", true);
    return;
  }
  if (!nodeKey) {
    showExamStructureMsg("新增失败：请填写子项代码（sub_item_key）。", true);
    return;
  }
  if (nodeKey.length < 2) {
    showExamStructureMsg("新增失败：子项代码至少2个字符。", true);
    return;
  }
  if (!name || name.length < 2) {
    showExamStructureMsg("新增失败：子项名称至少2个字符。", true);
    return;
  }

  try {
    const payload = await apiFetch("/api/admin/exam-structure", {
      method: "POST",
      token: state.token,
      body: {
        nodeType: "sub_item",
        parentId,
        nodeKey,
        name,
        sortOrder: Number.isFinite(sortOrder) && sortOrder > 0 ? sortOrder : 100,
        enabled
      }
    });
    await renderExamStructureManager();
    await renderExamCatalog();
    if (structureSubItemKeyInput) structureSubItemKeyInput.value = "";
    if (structureSubItemNameInput) structureSubItemNameInput.value = "";
    if (structureSubItemSortOrderInput) structureSubItemSortOrderInput.value = "100";
    if (structureSubItemEnabledInput) structureSubItemEnabledInput.checked = true;
    showExamStructureMsg(`子项已创建：${payload?.node?.name || name} (${payload?.node?.nodeKey || nodeKey})`, false);
  } catch (err) {
    if (err?.status === 409 && err?.data?.code === "ALREADY_EXISTS") {
      const existing = err?.data?.existingNode;
      showExamStructureMsg(
        `新增失败：子项已存在（${existing?.name || name} / ${existing?.nodeKey || nodeKey}）。`,
        true
      );
      await renderExamStructureManager();
      return;
    }
    showExamStructureMsg(`新增失败：${err.message}`, true);
  }
}

function renderExamStructureTable() {
  if (!examStructureTbody) return;
  examStructureTbody.innerHTML = "";
  examStructureMsg?.classList.add("hidden");
  renderStructureSubItemProgramOptions();
  const flatRows = flattenExamStructureNodes(state.examStructureNodes);
  if (!flatRows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td colspan='6'>暂无结构节点，请先在考试项目管理中新增考试。</td>";
    examStructureTbody.appendChild(tr);
    return;
  }

  for (const item of flatRows) {
    const tr = document.createElement("tr");
    tr.dataset.structureId = String(item.id);
    tr.dataset.nodeType = String(item.nodeType || "");
    tr.dataset.nodeEnabled = item.isEnabled ? "1" : "0";
    tr.dataset.nodeName = String(item.name || "");
    tr.dataset.moduleCode = String(item.moduleCode || "");
    const levelPrefix = item.depth > 0 ? `${"　".repeat(item.depth)}└ ` : "";
    const nodeTypeLabel = structureNodeTypeLabel(item.nodeType);
    const keyLabel = item.nodeType === "exam_module" ? item.moduleCode || item.nodeKey : item.nodeKey;
    const statusText = item.isEnabled ? "已启用" : "已停用";
    const toggleLabel = item.isEnabled ? "停用" : "启用";
    const childHint =
      Number(item.childCount || 0) > 0 ? `<div style="font-size:12px;color:#6b7a8c;">子节点：${Number(item.childCount || 0)}</div>` : "";
    const refHint =
      item.nodeType === "exam_module" && Number(item.questionRefs || 0) > 0
        ? `<div style="font-size:12px;color:#6b7a8c;">引用题目：${Number(item.questionRefs || 0)}</div>`
        : "";
    tr.innerHTML = `
      <td><span>${escapeHtml(levelPrefix)}${escapeHtml(item.name || item.nodeKey || "--")}</span></td>
      <td>${escapeHtml(nodeTypeLabel)}</td>
      <td>
        <code>${escapeHtml(keyLabel || "--")}</code>
        ${
          item.nodeType === "exam_module"
            ? `<div style="font-size:12px;color:#6b7a8c;margin-top:4px;">分类：${escapeHtml(item.categoryKey || "--")}</div>`
            : ""
        }
      </td>
      <td>
        <input type="text" data-field="name" value="${escapeHtml(item.name || "")}" />
      </td>
      <td>
        <div style="font-weight:600;color:${item.isEnabled ? "#2757d6" : "#7a8699"};">${statusText}</div>
        ${childHint}
        ${refHint}
      </td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn" data-action="edit-exam-structure">编辑</button>
          <button type="button" class="btn" data-action="toggle-exam-structure">${toggleLabel}</button>
          <button type="button" class="btn ghost" data-action="delete-exam-structure">删除</button>
        </div>
      </td>
    `;
    examStructureTbody.appendChild(tr);
  }
}

function flattenExamStructureNodes(nodes, depth = 0, acc = []) {
  if (!Array.isArray(nodes)) return acc;
  for (const node of nodes) {
    if (!node || !node.id) continue;
    acc.push({
      id: Number(node.id),
      parentId: node.parentId == null ? null : Number(node.parentId),
      nodeType: String(node.nodeType || ""),
      nodeKey: String(node.nodeKey || ""),
      name: String(node.name || ""),
      isEnabled: node.isEnabled === true,
      sortOrder: Number(node.sortOrder || 100),
      moduleCode: String(node.moduleCode || ""),
      categoryKey: String(node.categoryKey || ""),
      childCount: Number(node.childCount || 0),
      questionRefs: Number(node.questionRefs || 0),
      canDelete: node.canDelete === true,
      depth
    });
    if (Array.isArray(node.children) && node.children.length) {
      flattenExamStructureNodes(node.children, depth + 1, acc);
    }
  }
  return acc;
}

function structureNodeTypeLabel(nodeType) {
  if (nodeType === "program") return "program（项目）";
  if (nodeType === "sub_item") return "sub_item（子项）";
  if (nodeType === "exam_module") return "exam_module（考试模块）";
  return nodeType || "--";
}

async function onExamStructureTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest("tr[data-structure-id]");
  if (!row) return;
  const id = Number.parseInt(String(row.dataset.structureId || ""), 10);
  if (!Number.isFinite(id) || id <= 0) return;
  const action = String(button.dataset.action || "").trim();
  if (action === "edit-exam-structure") {
    await updateExamStructureNodeName(id, row);
    return;
  }
  if (action === "toggle-exam-structure") {
    await toggleExamStructureNode(id, row);
    return;
  }
  if (action === "delete-exam-structure") {
    await deleteExamStructureNode(id, row);
  }
}

async function updateExamStructureNodeName(nodeId, row) {
  const nameInput = row.querySelector("input[data-field='name']");
  const name = String(nameInput?.value || "").trim();
  const previousName = String(row.dataset.nodeName || "").trim();
  if (name.length < 2) {
    showExamStructureMsg("保存失败：名称至少2个字符。", true);
    return;
  }
  if (previousName && previousName === name) {
    showExamStructureMsg(`未检测到名称变更：${name}`, false);
    highlightExamStructureRow(nodeId);
    return;
  }
  try {
    const payload = await apiFetch(`/api/admin/exam-structure/${encodeURIComponent(String(nodeId))}`, {
      method: "PUT",
      token: state.token,
      body: { name }
    });
    const updatedName = String(payload?.node?.name || name).trim();
    await renderExamStructureManager();
    await renderExamCatalog();
    highlightExamStructureRow(nodeId);
    if (previousName && previousName !== updatedName) {
      showExamStructureMsg(`结构节点已更新：${previousName} → ${updatedName}`, false);
    } else {
      showExamStructureMsg(`结构节点已更新：${updatedName}`, false);
    }
  } catch (err) {
    showExamStructureMsg(`更新失败：${err.message}`, true);
  }
}

function highlightExamStructureRow(nodeId) {
  if (!examStructureTbody) return;
  const selector = `tr[data-structure-id=\"${String(nodeId)}\"]`;
  const targetRow = examStructureTbody.querySelector(selector);
  if (!(targetRow instanceof HTMLElement)) return;
  const original = targetRow.style.backgroundColor;
  targetRow.style.backgroundColor = "#e7f0ff";
  setTimeout(() => {
    targetRow.style.backgroundColor = original || "";
  }, 1500);
}

async function toggleExamStructureNode(nodeId, row) {
  const currentEnabled = String(row.dataset.nodeEnabled || "") === "1";
  const nextEnabled = !currentEnabled;
  try {
    await apiFetch(`/api/admin/exam-structure/${encodeURIComponent(String(nodeId))}`, {
      method: "PUT",
      token: state.token,
      body: { enabled: nextEnabled }
    });
    await renderExamStructureManager();
    await renderExamCatalog();
    showExamStructureMsg(`结构节点 ${nodeId} 已${nextEnabled ? "启用" : "停用"}。`, false);
  } catch (err) {
    showExamStructureMsg(`状态更新失败：${err.message}`, true);
  }
}

async function deleteExamStructureNode(nodeId, row) {
  const nodeType = String(row.dataset.nodeType || "").trim();
  const nodeName = String(row.querySelector("input[data-field='name']")?.value || "").trim() || `#${nodeId}`;
  const confirmed = window.confirm(`确认删除结构节点 ${nodeName} 吗？`);
  if (!confirmed) return;
  try {
    await apiFetch(`/api/admin/exam-structure/${encodeURIComponent(String(nodeId))}`, {
      method: "DELETE",
      token: state.token
    });
    await renderExamStructureManager();
    await renderExamCatalog();
    showExamStructureMsg(`结构节点 ${nodeName} 已删除。`, false);
  } catch (err) {
    if (err?.status === 404) {
      await renderExamStructureManager();
      await renderExamCatalog();
      showExamStructureMsg("结构节点不存在（可能已被其他操作删除），已自动刷新列表。", true);
      return;
    }
    if (err?.status === 409 && err?.data?.code === "HAS_CHILDREN") {
      showExamStructureMsg("删除失败：该节点有子节点，请先删除子节点。", true);
      return;
    }
    if (err?.status === 409 && err?.data?.code === "QUESTION_REFERENCED") {
      showExamStructureMsg("删除失败：该考试模块已被题目引用，请先停用或清理关联题目。", true);
      return;
    }
    const typeTip = nodeType ? `（${structureNodeTypeLabel(nodeType)}）` : "";
    showExamStructureMsg(`删除失败${typeTip}：${err.message}`, true);
  }
}

function renderExamCatalogTable() {
  if (!examCatalogTbody) return;
  examCatalogTbody.innerHTML = "";
  if (!state.examCatalog.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td colspan='9'>暂无考试配置，请先新增考试。</td>";
    examCatalogTbody.appendChild(tr);
    return;
  }

  const categoryOptionsHtml = buildCategoryOptionsHtml();
  const projectOptionsHtml = buildProjectOptionsHtml();
  for (const exam of state.examCatalog) {
    const tr = document.createElement("tr");
    tr.dataset.examCode = exam.examCode;
    const projectKey = inferProjectKeyFromExam(exam) || getProjectOptions()[0]?.key || "";
    const tradeCode = resolveTradeCode(exam);
    const examType = resolveExamType(exam);
    const bindingInfo = getExamCategoryBindingInfo(exam);
    const subItemHtml = buildSubItemOptionsHtml(projectKey, tradeCode);
    const categoryWarningHtml = bindingInfo.isValid
      ? ""
      : `<div class="admin-inline-warning" style="margin-top:6px;color:#be2f2f;font-size:12px;font-weight:600;">分类绑定异常：${escapeHtml(
          bindingInfo.reason || "无效分类绑定"
        )}。请重新选择有效分类并保存。</div>`;
    tr.innerHTML = `
      <td>
        <select data-field="projectKey">${projectOptionsHtml}</select>
      </td>
      <td>
        <span data-subitem-wrap>
          <select data-field="subItemCode">${subItemHtml}</select>
        </span>
      </td>
      <td>
        <select data-field="examType">
          <option value="law_business" ${examType === "law_business" ? "selected" : ""}>法律考试</option>
          <option value="trade" ${examType !== "law_business" ? "selected" : ""}>技术考试</option>
        </select>
      </td>
      <td>
        <input type="text" data-field="examName" value="${escapeHtml(exam.examName || "")}" />
      </td>
      <td>
        <select data-field="categoryKey">${categoryOptionsHtml}</select>
        ${categoryWarningHtml}
      </td>
      <td><input type="number" min="1" data-field="questionCount" value="${Number(exam.questionCount || 100)}" /></td>
      <td><input type="number" min="1" data-field="examTimeMinutes" value="${Number(exam.examTimeMinutes || 180)}" /></td>
      <td>
        <label style="display:flex;align-items:center;gap:6px;">
          <input type="checkbox" data-field="isEnabled" ${exam.isEnabled ? "checked" : ""} />
          <span>启用</span>
        </label>
        <input type="hidden" data-field="sortOrder" value="${Number(exam.sortOrder || 100)}" />
      </td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn" data-action="save-exam-catalog">保存</button>
          <button type="button" class="btn" data-action="disable-exam-catalog" ${exam.isEnabled ? "" : "disabled"}>停用</button>
          <button type="button" class="btn ghost" data-action="delete-exam-catalog">删除</button>
        </div>
      </td>
    `;
    if (!bindingInfo.isValid) {
      tr.style.background = "#fff6f6";
      tr.style.outline = "1px solid #f1c8c8";
    }
    const projectSelect = tr.querySelector("select[data-field='projectKey']");
    if (projectSelect) {
      projectSelect.value = projectKey;
    }
    const project = getProjectByKey(projectKey);
    const subItemSelect = tr.querySelector("select[data-field='subItemCode']");
    if (subItemSelect && project?.needsSubItem !== true) {
      subItemSelect.disabled = true;
    }
    const categorySelect = tr.querySelector("select[data-field='categoryKey']");
    if (categorySelect) {
      categorySelect.value = exam.categoryKey || "";
    }
    examCatalogTbody.appendChild(tr);
  }
}

function buildProjectOptionsHtml(selected = "") {
  const options = getProjectOptions();
  return options
    .map((project) => {
      const selectedAttr = project.key === selected ? "selected" : "";
      return `<option value="${escapeHtml(project.key)}" ${selectedAttr}>${escapeHtml(project.name)}</option>`;
    })
    .join("");
}

function buildSubItemOptionsHtml(projectKey, selectedCode = "") {
  const project = getProjectByKey(projectKey);
  if (project?.needsSubItem !== true) {
    return `<option value="">无子项</option>`;
  }
  const subItems = getSubItemsForProject(projectKey);
  const options = [`<option value="">请选择子项</option>`];
  for (const item of subItems) {
    const selected = normalizeKey(selectedCode) === normalizeKey(item.code) ? "selected" : "";
    options.push(`<option value="${escapeHtml(item.code)}" ${selected}>${escapeHtml(item.name)}</option>`);
  }
  return options.join("");
}

function buildCategoryOptionsHtml() {
  const enabled = getEnabledCategories();
  if (!enabled.length) {
    return `<option value="">暂无分类</option>`;
  }
  return [
    `<option value="">请选择分类</option>`,
    ...enabled.map((category) => `<option value="${escapeHtml(category.key)}">${escapeHtml(category.name || category.key)}</option>`)
  ].join("");
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
  const value = String(exam?.examType || "").trim();
  return value === "law_business" ? "law_business" : "trade";
}

function getCategoryByKey(categoryKey) {
  const key = String(categoryKey || "").trim();
  if (!key) return null;
  return state.categories.find((item) => item && item.key === key) || null;
}

function getExamCategoryBindingInfo(exam) {
  const key = String(exam?.categoryKey || "").trim();
  const category = getCategoryByKey(key);
  const existsFromApi = typeof exam?.categoryExists === "boolean" ? exam.categoryExists : null;
  const enabledFromApi = typeof exam?.categoryEnabled === "boolean" ? exam.categoryEnabled : null;
  const exists = existsFromApi === null ? Boolean(category) : Boolean(existsFromApi);
  const enabled = enabledFromApi === null ? Boolean(category?.isEnabled) : Boolean(enabledFromApi);
  const isValid = Boolean(key) && exists && enabled;

  let reason = "";
  if (!key) {
    reason = "未绑定分类";
  } else if (!exists) {
    reason = `分类 ${key} 不存在`;
  } else if (!enabled) {
    reason = `分类 ${key} 已停用`;
  }

  return {
    key,
    exists,
    enabled,
    isValid,
    reason
  };
}

function isExamCategoryBindingValid(exam) {
  return getExamCategoryBindingInfo(exam).isValid;
}

async function onCreateExamCatalog() {
  const createInput = getCreateStructureInput();
  const examType = createInput.examType;
  const examName = (examNameInput?.value || "").trim() || buildCreateDefaultExamName(createInput);
  const categoryKey = (examCategorySelectInput?.value || "").trim();
  const questionCount = Number.parseInt(examQuestionCountInput?.value || "100", 10);
  const examTimeMinutes = Number.parseInt(examTimeMinutesInput?.value || "180", 10);
  const sortOrder = Number.parseInt(examSortOrderInput?.value || "100", 10);
  const isEnabled = examEnabledInput?.checked === true;

  if (!isExamCreatePathReady()) {
    showExamCatalogMsg("创建失败：请先完整填写创建字段（项目代码/名称、执照组代码/名称、考试类型，技术考试需子项代码）。", true);
    return;
  }
  if (!examName || !categoryKey) {
    showExamCatalogMsg("创建失败：请填写显示名称并选择绑定分类。", true);
    return;
  }

  try {
    const created = await apiFetch("/api/admin/exam-catalog", {
      method: "POST",
      token: state.token,
      body: {
        industryKey: createInput.industryKey,
        industryName: createInput.industryName,
        examFamilyKey: createInput.examFamilyKey,
        examFamilyName: createInput.examFamilyName,
        specializationCode: examType === "trade" ? createInput.tradeCode : "",
        examType,
        examName,
        categoryKey,
        questionCount: Number.isFinite(questionCount) ? questionCount : 100,
        examTimeMinutes: Number.isFinite(examTimeMinutes) ? examTimeMinutes : 180,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
        isEnabled
      }
    });

    if (examIndustryKeyInput) examIndustryKeyInput.value = "";
    if (examIndustryNameInput) examIndustryNameInput.value = "";
    if (examFamilyKeyInput) examFamilyKeyInput.value = "";
    if (examFamilyNameInput) examFamilyNameInput.value = "";
    if (examTradeCodeInput) examTradeCodeInput.value = "";
    if (examTypeInput) examTypeInput.value = "";
    if (examNameInput) examNameInput.value = "";
    state.examNameDirty = false;
    state.lastAutoExamName = "";
    if (examCategorySelectInput) examCategorySelectInput.value = "";
    state.examCategoryDirty = false;
    state.lastAutoCategoryKey = "";
    if (examQuestionCountInput) examQuestionCountInput.value = "100";
    if (examTimeMinutesInput) examTimeMinutesInput.value = "180";
    if (examSortOrderInput) examSortOrderInput.value = "100";
    if (examEnabledInput) examEnabledInput.checked = true;
    syncExamCreateFormInteraction();

    await renderExamCatalog();
    await renderExamStructureManager();
    showExamCatalogMsg(`考试配置新增成功：${created?.exam?.examCode || "已创建"}`, false);
  } catch (err) {
    if (err?.data?.code === "ALREADY_EXISTS") {
      const msg = String(err?.data?.message || "该法律考试结构已存在，请直接使用现有项");
      const existingCode = String(err?.data?.existing_exam_code || "").trim();
      await renderExamCatalog();
      await renderExamStructureManager();
      showExamCatalogMsg(existingCode ? `${msg}（${existingCode}）` : msg, true);
      if (existingCode) {
        focusExamCatalogRow(existingCode);
      }
      return;
    }
    showExamCatalogMsg(`新增失败：${err.message}`, true);
  }
}

async function onExamCatalogTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest("tr[data-exam-code]");
  if (!row) return;
  const examCode = row.dataset.examCode || "";
  if (!examCode) return;
  if (button.dataset.action === "save-exam-catalog") {
    await updateExamCatalogFromRow(examCode, row);
    return;
  }
  if (button.dataset.action === "disable-exam-catalog") {
    await disableExamCatalogFromRow(examCode, row);
    return;
  }
  if (button.dataset.action === "delete-exam-catalog") {
    await deleteExamCatalogFromRow(examCode);
  }
}

function onExamCatalogTableChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const row = target.closest("tr[data-exam-code]");
  if (!row) return;

  if (target.matches("select[data-field='projectKey']")) {
    const projectKey = (target.value || "").trim();
    const subSelect = row.querySelector("select[data-field='subItemCode']");
    const project = getProjectByKey(projectKey);
    if (subSelect) {
      subSelect.innerHTML = buildSubItemOptionsHtml(projectKey, "");
      subSelect.disabled = project?.needsSubItem !== true;
    }
  }

  if (
    target.matches("select[data-field='projectKey']") ||
    target.matches("select[data-field='subItemCode']") ||
    target.matches("select[data-field='examType']")
  ) {
    const projectKey = (row.querySelector("select[data-field='projectKey']")?.value || "").trim();
    const subItemCode = (row.querySelector("select[data-field='subItemCode']")?.value || "").trim();
    const examType = (row.querySelector("select[data-field='examType']")?.value || "trade").trim();
    const examNameInputInRow = row.querySelector("input[data-field='examName']");
    if (examNameInputInRow && !(examNameInputInRow.value || "").trim()) {
      examNameInputInRow.value = buildSmartDisplayName(projectKey, subItemCode, examType);
    }
  }
}

async function updateExamCatalogFromRow(examCode, row) {
  const body = collectExamCatalogPayloadFromRow(row);
  if (!body) {
    showExamCatalogMsg(`考试 ${examCode} 字段不完整。`, true);
    return;
  }
  await saveExamCatalogRow(examCode, body);
}

function collectExamCatalogPayloadFromRow(row) {
  const projectKey = (row.querySelector("select[data-field='projectKey']")?.value || "").trim();
  const subItemCode = (row.querySelector("select[data-field='subItemCode']")?.value || "").trim();
  const examType = (row.querySelector("select[data-field='examType']")?.value || "").trim();
  const context = buildBusinessContext(projectKey, subItemCode, examType);
  const project = getProjectByKey(projectKey);
  const body = {
    industryKey: context?.industryKey || "",
    industryName: context?.industryName || "",
    examFamilyKey: context?.licenseGroup || "",
    examFamilyName: context?.licenseGroupName || "",
    tradeCode: context?.specializationCode || "",
    examType,
    examName: (row.querySelector("input[data-field='examName']")?.value || "").trim(),
    categoryKey: (row.querySelector("select[data-field='categoryKey']")?.value || "").trim(),
    questionCount: Number.parseInt(row.querySelector("input[data-field='questionCount']")?.value || "100", 10),
    examTimeMinutes: Number.parseInt(row.querySelector("input[data-field='examTimeMinutes']")?.value || "180", 10),
    sortOrder: Number.parseInt(row.querySelector("input[data-field='sortOrder']")?.value || "100", 10),
    isEnabled: row.querySelector("input[data-field='isEnabled']")?.checked === true
  };
  if (
    !body.industryKey ||
    !body.industryName ||
    !body.examFamilyKey ||
    !body.examFamilyName ||
    !body.examType ||
    !body.examName ||
    !body.categoryKey ||
    (project?.needsSubItem === true && body.examType === "trade" && !body.tradeCode)
  ) {
    return null;
  }
  if (body.examType === "law_business") {
    body.tradeCode = "";
  }
  return body;
}

async function saveExamCatalogRow(examCode, body) {
  try {
    await apiFetch(`/api/admin/exam-catalog/${encodeURIComponent(examCode)}`, {
      method: "PUT",
      token: state.token,
      body
    });
    await renderExamCatalog();
    await renderExamStructureManager();
    showExamCatalogMsg(`考试 ${examCode} 已更新。`, false);
  } catch (err) {
    showExamCatalogMsg(`更新失败：${err.message}`, true);
  }
}

async function disableExamCatalogFromRow(examCode, row) {
  const body = collectExamCatalogPayloadFromRow(row);
  if (!body) {
    showExamCatalogMsg(`考试 ${examCode} 字段不完整，无法停用。`, true);
    return;
  }
  if (body.isEnabled !== true) {
    showExamCatalogMsg(`考试 ${examCode} 已处于停用状态。`, false);
    return;
  }
  const confirmed = confirm(`确认停用考试项 ${examCode} 吗？`);
  if (!confirmed) return;
  body.isEnabled = false;
  await saveExamCatalogRow(examCode, body);
}

async function deleteExamCatalogFromRow(examCode) {
  const confirmed = confirm(`确认删除考试项 ${examCode} 吗？若已被题目引用将被拦截。`);
  if (!confirmed) return;
  try {
    const result = await apiFetch(`/api/admin/exam-catalog/${encodeURIComponent(examCode)}`, {
      method: "DELETE",
      token: state.token
    });
    console.log("[admin][exam-delete] response", { examCode, result });
    const deletedCode = String(result?.deletedExamCode || "").trim();
    const confirmedDeleted = result?.ok === true && deletedCode === String(examCode || "").trim();
    if (!confirmedDeleted) {
      console.error("[admin][exam-delete] backend did not confirm deletion", { examCode, result });
      showExamCatalogMsg("删除失败：服务端未确认删除，请刷新后重试。", true);
      return;
    }
    await renderExamCatalog();
    await renderExamStructureManager();
    showExamCatalogMsg(`考试 ${examCode} 已删除。`, false);
  } catch (err) {
    console.error("[admin][exam-delete] failed", {
      examCode,
      status: err?.status,
      message: err?.message,
      data: err?.data
    });
    if (err?.status === 409) {
      showExamCatalogMsg("该考试项目已被题目引用，无法删除。请先停用或清理关联题目。", true);
      return;
    }
    showExamCatalogMsg(`删除失败：${err.message}`, true);
  }
}

function renderImportHierarchyOptions() {
  if (!importProjectSelect || !importSubItemSelect || !importExamTypeSelect) return;
  renderImportProjectOptions();
  if (!state.importProjectKey) {
    setSelectPlaceholder(importSubItemSelect, "无可用子项");
    setSelectPlaceholder(importExamTypeSelect, "无可用考试类型");
    state.importSubItemCode = "";
    state.importExamType = "";
    return;
  }
  renderImportSubItemOptions();
  renderImportExamTypeOptions();
}

function getImportExamsForCurrentSelection() {
  const projectKey = state.importProjectKey;
  if (!projectKey) return [];
  const enabledExams = getExamCatalogRows({ usableOnly: true }).filter(
    (item) => item && inferProjectKeyFromExam(item) === projectKey
  );
  const project = getProjectByKey(projectKey, { usableOnly: true });
  const fallbackTradeCode = project?.industryKey === "contractor" && project?.licenseGroup === "b_general" ? "b_general" : "";
  const specializationCode = normalizeKey(state.importSubItemCode || fallbackTradeCode);
  if (!enabledExams.length) return [];

  if (!specializationCode) {
    return enabledExams.filter((item) => {
      const examType = resolveExamType(item);
      const tradeCode = resolveTradeCode(item);
      if (examType === "law_business") return true;
      return isSharedTradeCode(tradeCode);
    });
  }

  return enabledExams.filter((item) => {
    const examType = resolveExamType(item);
    const tradeCode = resolveTradeCode(item);
    if (examType === "law_business" && isSharedTradeCode(tradeCode)) {
      return true;
    }
    return tradeCode === specializationCode;
  });
}

function renderImportExamTypeOptions() {
  if (!importExamTypeSelect) return;
  const enabledExams = getImportExamsForCurrentSelection();
  if (!enabledExams.length) {
    setSelectPlaceholder(importExamTypeSelect, "暂无可用考试类型（请先修复考试项分类绑定）");
    state.importExamType = "";
    return;
  }
  const previousExamType = state.importExamType || importExamTypeSelect.value || "";
  const examTypes = Array.from(new Set(enabledExams.map((item) => resolveExamType(item)))).sort((a, b) => {
    const rank = (value) => (value === "law_business" ? 0 : 1);
    return rank(a) - rank(b) || a.localeCompare(b, "en");
  });
  importExamTypeSelect.innerHTML = "";
  for (const examType of examTypes) {
    const option = document.createElement("option");
    option.value = examType;
    option.textContent = examTypeLabelZh(examType);
    importExamTypeSelect.appendChild(option);
  }
  importExamTypeSelect.disabled = false;
  if (previousExamType && examTypes.includes(previousExamType)) {
    importExamTypeSelect.value = previousExamType;
  }
  state.importExamType = importExamTypeSelect.value || examTypes[0];
  syncImportCategoryFromSelection();
}

function syncImportCategoryFromSelection() {
  if (!importCategorySelect) return;
  const projectExams = getExamCatalogRows({ usableOnly: true }).filter(
    (item) => item && inferProjectKeyFromExam(item) === state.importProjectKey
  );
  if (!projectExams.length) return;
  const project = getProjectByKey(state.importProjectKey, { usableOnly: true });
  const fallbackTradeCode = project?.industryKey === "contractor" && project?.licenseGroup === "b_general" ? "b_general" : "";
  const specializationCode = normalizeKey(state.importSubItemCode || fallbackTradeCode);
  let exam = null;
  if (state.importExamType === "law_business") {
    exam =
      projectExams.find(
        (item) => resolveExamType(item) === "law_business" && isSharedTradeCode(resolveTradeCode(item))
      ) ||
      projectExams.find(
        (item) =>
          resolveExamType(item) === "law_business" && normalizeKey(resolveTradeCode(item)) === specializationCode
      ) ||
      null;
  } else {
    exam =
      projectExams.find(
        (item) =>
          resolveExamType(item) === "trade" && normalizeKey(resolveTradeCode(item)) === specializationCode
      ) || null;
  }
  if (!exam) return;
  const categoryKey = String(exam.categoryKey || "").trim();
  if (!categoryKey) return;
  if (Array.from(importCategorySelect.options).some((opt) => opt.value === categoryKey)) {
    importCategorySelect.value = categoryKey;
  }
}

function renderReviewTargetExamOptions() {
  if (!reviewTargetExamSelect) return;
  const previous = reviewTargetExamSelect.value || "";
  reviewTargetExamSelect.innerHTML = "";
  const exams = state.examCatalog.slice().sort((a, b) => {
    const aa = `${a.industryKey}-${a.examFamilyKey}-${a.sortOrder}-${a.examCode}`;
    const bb = `${b.industryKey}-${b.examFamilyKey}-${b.sortOrder}-${b.examCode}`;
    return aa.localeCompare(bb, "en");
  });
  if (!exams.length) {
    setSelectPlaceholder(reviewTargetExamSelect, "暂无可分配考试");
    return;
  }
  for (const exam of exams) {
    const option = document.createElement("option");
    option.value = exam.examCode;
    option.textContent = `${exam.examName} (${exam.examCode})`;
    reviewTargetExamSelect.appendChild(option);
  }
  reviewTargetExamSelect.disabled = false;
  if (previous && exams.some((item) => item.examCode === previous)) {
    reviewTargetExamSelect.value = previous;
  }
}

async function onCreateCategory() {
  const key = (categoryKeyInput?.value || "").trim();
  const name = (categoryNameInput?.value || "").trim();
  const sortOrder = Number.parseInt(categorySortInput?.value || "100", 10);
  const isEnabled = categoryEnabledInput?.checked === true;

  if (!key) {
    showCategoryMsg("请输入分类 key。", true);
    return;
  }
  if (name.length < 2) {
    showCategoryMsg("分类名称至少2个字符。", true);
    return;
  }

  try {
    await apiFetch("/api/admin/categories", {
      method: "POST",
      token: state.token,
      body: {
        key,
        name,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
        isEnabled
      }
    });

    if (categoryKeyInput) categoryKeyInput.value = "";
    if (categoryNameInput) categoryNameInput.value = "";
    if (categorySortInput) categorySortInput.value = "100";
    if (categoryEnabledInput) categoryEnabledInput.checked = true;

    await reloadCategoriesAndUsers();
    showCategoryMsg("分类新增成功。", false);
  } catch (err) {
    showCategoryMsg(`新增失败：${err.message}`, true);
  }
}

async function onCategoryTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest("tr[data-category-key]");
  if (!row) return;
  const key = row.dataset.categoryKey || "";
  if (!key) return;
  const action = button.dataset.action || "";
  if (action === "save-category") {
    await updateCategoryFromRow(key, row);
    return;
  }
  if (action === "delete-category") {
    await deleteCategoryFromRow(key);
  }
}

async function updateCategoryFromRow(key, row) {
  const nameInput = row.querySelector("input[data-field='name']");
  const sortInput = row.querySelector("input[data-field='sortOrder']");
  const enabledInput = row.querySelector("input[data-field='isEnabled']");
  const name = (nameInput?.value || "").trim();
  const sortOrder = Number.parseInt(sortInput?.value || "100", 10);
  const isEnabled = enabledInput?.checked === true;

  if (name.length < 2) {
    showCategoryMsg(`分类 ${key} 名称至少2个字符。`, true);
    return;
  }

  try {
    await apiFetch(`/api/admin/categories/${encodeURIComponent(key)}`, {
      method: "PUT",
      token: state.token,
      body: {
        name,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
        isEnabled
      }
    });
    await reloadCategoriesAndUsers();
    showCategoryMsg(`分类 ${key} 已更新。`, false);
  } catch (err) {
    showCategoryMsg(`更新失败：${err.message}`, true);
  }
}

async function deleteCategoryFromRow(key) {
  const ok = window.confirm(
    `确认删除分类 ${key} 吗？仅当该分类未被题库或用户权限使用时才允许删除。`
  );
  if (!ok) return;

  try {
    await apiFetch(`/api/admin/categories/${encodeURIComponent(key)}`, {
      method: "DELETE",
      token: state.token
    });
    await reloadCategoriesAndUsers();
    showCategoryMsg(`分类 ${key} 已删除。`, false);
  } catch (err) {
    if (err?.status === 409) {
      const usage = err?.data?.usage || {};
      const examCatalogRefs = Number(usage.examCatalogRefs || 0);
      if (examCatalogRefs > 0) {
        const examItems = Array.isArray(usage.examCatalogItems) ? usage.examCatalogItems : [];
        const preview = examItems
          .slice(0, 4)
          .map((item) => String(item?.examCode || "").trim())
          .filter(Boolean)
          .join("、");
        const tail = examCatalogRefs > 4 ? " 等" : "";
        showCategoryMsg(
          `删除失败：该分类仍被 ${examCatalogRefs} 个考试项目引用（${preview}${tail}）。请先到“考试项目管理”改绑分类后再删除。`,
          true
        );
        return;
      }
      if (!err?.data?.forceAvailable) {
        showCategoryMsg(`删除失败：${err.message}`, true);
        return;
      }

      const bankUsage = usage.bank || {};
      const tip =
        `分类 ${key} 正在使用中。\n` +
        `题库引用：${Number(bankUsage.totalRefs || 0)}（显式考试 ${Number(bankUsage.examRefs || 0)}，题目 ${Number(
          bankUsage.questionRefs || 0
        )}，隐式 ${Number(bankUsage.implicitExamRefs || 0)}）\n` +
        `用户权限引用：${Number(usage.activeEntitlements || 0)}\n\n` +
        `点击“确定”执行强制删除（会移除该分类权限记录并清理题库 categoryKey 引用）；点击“取消”放弃。`;
      const force = window.confirm(tip);
      if (!force) {
        showCategoryMsg(`已取消删除分类 ${key}。`, true);
        return;
      }

      try {
        const forcedResult = await apiFetch(`/api/admin/categories/${encodeURIComponent(key)}?force=1`, {
          method: "DELETE",
          token: state.token
        });
        await reloadCategoriesAndUsers();
        const cleanup = forcedResult?.cleanup || {};
        showCategoryMsg(
          `分类 ${key} 已强制删除（清理考试 ${Number(cleanup.clearedExamRefs || 0)}，题目 ${Number(
            cleanup.clearedQuestionRefs || 0
          )}）。`,
          false
        );
      } catch (forceErr) {
        showCategoryMsg(`强制删除失败：${forceErr.message}`, true);
      }
      return;
    }
    showCategoryMsg(`删除失败：${err.message}`, true);
  }
}

async function onCreateExamCategory() {
  const examCode = String(examCategoryManageExamSelect?.value || "").trim();
  const code = String(examCategoryCodeInput?.value || "").trim().toUpperCase();
  const name = String(examCategoryNameInput?.value || "").trim();
  const nameZh = String(examCategoryNameZhInput?.value || "").trim();
  const sortOrder = Number.parseInt(examCategorySortInput?.value || "100", 10);
  const isActive = examCategoryEnabledInput?.checked === true;

  if (!examCode) {
    showExamCategoryMsg("请先选择所属考试。", true);
    return;
  }
  if (!code) {
    showExamCategoryMsg("请输入分类代码。", true);
    return;
  }
  if (name.length < 2) {
    showExamCategoryMsg("分类名称至少2个字符。", true);
    return;
  }
  try {
    await apiFetch("/api/admin/exam-categories", {
      method: "POST",
      token: state.token,
      body: {
        code,
        examCode,
        name,
        nameZh,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
        isActive
      }
    });
    if (examCategoryCodeInput) examCategoryCodeInput.value = "";
    if (examCategoryNameInput) examCategoryNameInput.value = "";
    if (examCategoryNameZhInput) examCategoryNameZhInput.value = "";
    if (examCategorySortInput) examCategorySortInput.value = "100";
    if (examCategoryEnabledInput) examCategoryEnabledInput.checked = true;
    await renderExamCategories();
    if (examCategoryManageExamSelect) examCategoryManageExamSelect.value = examCode;
    renderExamCategoriesTable();
    showExamCategoryMsg(`考试分类 ${code} 新增成功。`, false);
  } catch (err) {
    showExamCategoryMsg(`新增失败：${err.message}`, true);
  }
}

async function onExamCategoriesTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest("tr[data-code]");
  if (!row) return;
  const code = String(row.dataset.code || "").trim().toUpperCase();
  if (!code) return;
  const action = String(button.dataset.action || "");
  if (action === "save-exam-category") {
    await updateExamCategoryFromRow(code, row);
    return;
  }
  if (action === "delete-exam-category") {
    await deleteExamCategoryFromRow(code);
  }
}

async function updateExamCategoryFromRow(code, row) {
  const name = String(row.querySelector("input[data-field='name']")?.value || "").trim();
  const nameZh = String(row.querySelector("input[data-field='nameZh']")?.value || "").trim();
  const sortOrder = Number.parseInt(row.querySelector("input[data-field='sortOrder']")?.value || "100", 10);
  const isActive = row.querySelector("input[data-field='isActive']")?.checked === true;
  if (name.length < 2) {
    showExamCategoryMsg(`分类 ${code} 名称至少2个字符。`, true);
    return;
  }
  try {
    await apiFetch(`/api/admin/exam-categories/${encodeURIComponent(code)}`, {
      method: "PUT",
      token: state.token,
      body: {
        name,
        nameZh,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
        isActive
      }
    });
    await renderExamCategories();
    showExamCategoryMsg(`分类 ${code} 已更新。`, false);
  } catch (err) {
    showExamCategoryMsg(`更新失败：${err.message}`, true);
  }
}

async function deleteExamCategoryFromRow(code) {
  const ok = window.confirm(`确认删除考试分类 ${code} 吗？如仍有题目引用会被拦截。`);
  if (!ok) return;
  try {
    await apiFetch(`/api/admin/exam-categories/${encodeURIComponent(code)}`, {
      method: "DELETE",
      token: state.token
    });
    await renderExamCategories();
    showExamCategoryMsg(`分类 ${code} 已删除。`, false);
  } catch (err) {
    if (err?.status === 409) {
      const refs = Number(err?.data?.questionRefs || 0);
      showExamCategoryMsg(`删除失败：该分类仍被 ${refs} 道题引用，请先迁移或停用题目。`, true);
      return;
    }
    showExamCategoryMsg(`删除失败：${err.message}`, true);
  }
}

function renderUsersHeader() {
  if (!usersHeadRow) return;
  usersHeadRow.innerHTML = "";

  const headers = ["用户", "邮箱", "会员计划", "账号状态", "到期时间", "已分配考试", "操作"];
  for (const title of headers) {
    const th = document.createElement("th");
    th.textContent = title;
    usersHeadRow.appendChild(th);
  }
}

async function renderUsers() {
  if (!usersTbody || !adminSaveMsg) return;
  const includeArchived = showArchivedUsersToggle?.checked === true;
  const usersPath = includeArchived ? "/api/admin/users?include_archived=1" : "/api/admin/users";
  const users = await apiFetch(usersPath, { token: state.token });
  state.adminUsers = Array.isArray(users) ? users : [];
  const visibleUsers = includeArchived ? users : users.filter((user) => user.accountStatus !== "suspended");
  usersTbody.innerHTML = "";
  adminSaveMsg.classList.add("hidden");
  renderUsersHeader();
  const columnCount = 7;
  if (!visibleUsers.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="${columnCount}">${
      includeArchived ? "暂无用户，请先在前台注册。" : "暂无活跃账号。可勾选“显示已归档账号”查看已归档用户。"
    }</td>`;
    usersTbody.appendChild(tr);
    return;
  }

  visibleUsers.forEach((user) => {
    const accountStatus = String(user?.accountStatus || "active").toLowerCase() === "suspended" ? "suspended" : "active";
    const tier = normalizeMembershipTier(user?.membershipTier || user?.membership_tier || user?.plan || "free");
    const examsSummary =
      Array.isArray(user?.assignedExamCodes) && user.assignedExamCodes.length
        ? user.assignedExamCodes.join(", ")
        : "未分配";
    const nickname = String(user?.nickname || "").trim();
    const userName = String(user?.name || "学员");
    const displayName = nickname ? `${userName} / ${nickname}` : userName;
    const statusLabel = accountStatusLabel(accountStatus);
    const tierLabel = membershipTierLabel(tier);
    const tr = document.createElement("tr");
    tr.dataset.userId = String(user.id);
    tr.dataset.userEmail = String(user.email || "");
    tr.dataset.membershipTier = tier;
    tr.dataset.accountStatus = accountStatus;
    tr.innerHTML = `
      <td>
        <div style="font-weight:600;">${escapeHtml(displayName)}</div>
      </td>
      <td>
        <div>${escapeHtml(user.email)}</div>
        <div style="font-size:12px;color:#6b7a8c;margin-top:4px;">版本 ${Number(user.membershipVersion || 1)}</div>
      </td>
      <td><span class="status-chip status-chip-plan">${escapeHtml(tierLabel)}</span></td>
      <td><span class="status-chip ${accountStatus === "suspended" ? "status-chip-warn" : "status-chip-ok"}">${escapeHtml(statusLabel)}</span></td>
      <td>${escapeHtml(toDateInputValue(user?.aiEntitlement?.expiresAt || user?.bilingualEntitlement?.expiresAt || "") || "--")}</td>
      <td title="${escapeHtml(examsSummary)}">${escapeHtml(examsSummary)}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn" data-action="select-user">查看</button>
          <button type="button" class="btn" data-action="${accountStatus === "suspended" ? "restore-user" : "archive-user"}">${accountStatus === "suspended" ? "恢复" : "归档"}</button>
          <button type="button" class="btn ghost" data-action="delete-user">删除</button>
        </div>
      </td>
    `;
    usersTbody.appendChild(tr);
  });
  updateMembersListSelectedState();
}

function updateCategorySummary(row, totalCategories) {
  const summary = row.querySelector("[data-category-summary]");
  if (!summary) return;
  if (!totalCategories) {
    summary.textContent = "暂无启用分类";
    return;
  }
  const selected = row.querySelectorAll("input[data-category-key]:checked").length;
  summary.textContent = `已选 ${selected} / ${totalCategories}`;
}

function buildUserUpdatePayloadFromRow(row, overrides = {}) {
  const plan = overrides.plan ?? (row.querySelector("select[data-plan]")?.value === "paid" ? "paid" : "free");
  const accountStatus =
    overrides.accountStatus ?? (row.querySelector("select[data-account-status]")?.value === "suspended" ? "suspended" : "active");

  const categoryEntitlements = {};
  const categoryExpiresAt = {};
  row.querySelectorAll("input[data-category-key]").forEach((input) => {
    const key = input.dataset.categoryKey || "";
    if (!key) return;
    categoryEntitlements[key] = input.checked === true;
  });
  row.querySelectorAll("input[data-category-expiry-key]").forEach((input) => {
    const key = input.dataset.categoryExpiryKey || "";
    if (!key) return;
    categoryExpiresAt[key] = normalizeDateInput(input.value);
  });

  const entitlements = {
    bilingualAccess: row.querySelector("input[data-entitlement='bilingualAccess']")?.checked === true,
    bilingualExpiresAt: normalizeDateInput(
      row.querySelector("input[data-entitlement-expiry='bilingualExpiresAt']")?.value || ""
    )
  };
  if (Object.prototype.hasOwnProperty.call(categoryEntitlements, "b_license")) {
    entitlements.bLicenseAccess = categoryEntitlements.b_license;
  }
  if (Object.prototype.hasOwnProperty.call(categoryEntitlements, "c_license")) {
    entitlements.cLicenseAccess = categoryEntitlements.c_license;
  }

  return {
    plan,
    accountStatus,
    entitlements,
    categoryEntitlements,
    categoryExpiresAt
  };
}

function captureUserRowState(row) {
  const payload = buildUserUpdatePayloadFromRow(row);

  return JSON.stringify({
    plan: payload.plan,
    accountStatus: payload.accountStatus,
    categoryEntitlements: payload.categoryEntitlements,
    categoryExpiresAt: payload.categoryExpiresAt,
    bilingualAccess: payload.entitlements?.bilingualAccess === true,
    bilingualExpiresAt: payload.entitlements?.bilingualExpiresAt || ""
  });
}

function setUserRowDirtyState(row, isDirty) {
  row.dataset.dirty = isDirty ? "1" : "0";
  if (isDirty) {
    row.style.background = "#fffdf3";
    row.style.outline = "2px solid #f4cc4f";
  } else {
    row.style.background = "";
    row.style.outline = "";
  }
}

function clearUserRowError(row) {
  if (row.dataset.errorState === "1") {
    row.dataset.errorState = "0";
    row.title = "";
    const isDirty = row.dataset.dirty === "1";
    if (isDirty) {
      row.style.background = "#fffdf3";
      row.style.outline = "2px solid #f4cc4f";
    } else {
      row.style.background = "";
      row.style.outline = "";
    }
  }
}

function setUserRowError(row, message) {
  row.dataset.errorState = "1";
  row.style.background = "#fff1f1";
  row.style.outline = "2px solid #d94b4b";
  row.title = message || "";
}

function initializeUserRowDirtyState(row) {
  row.dataset.initialState = captureUserRowState(row);
  row.dataset.errorState = "0";
  setUserRowDirtyState(row, false);
}

function markUserRowDirty(row) {
  clearUserRowError(row);
  const initial = row.dataset.initialState || "";
  const current = captureUserRowState(row);
  setUserRowDirtyState(row, current !== initial);
}

async function saveUsersFromTable() {
  if (!usersTbody || !adminSaveMsg || !saveUsersBtn) return;
  const rows = Array.from(usersTbody.querySelectorAll("tr[data-user-id]"));
  if (!rows.length) return;
  const changedRows = rows.filter((row) => row.dataset.dirty === "1");
  if (!changedRows.length) {
    adminSaveMsg.textContent = "没有待保存的变更。";
    adminSaveMsg.style.color = "#5f6d82";
    adminSaveMsg.classList.remove("hidden");
    return;
  }

  saveUsersBtn.disabled = true;
  saveUsersBtn.textContent = "保存中...";
  adminSaveMsg.classList.add("hidden");

  let successRows = 0;
  let changedCount = 0;
  const failures = [];

  for (const row of changedRows) {
    clearUserRowError(row);
    const userId = Number(row.dataset.userId);
    if (!userId) continue;
    const payload = buildUserUpdatePayloadFromRow(row);

    try {
      const result = await apiFetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        token: state.token,
        body: payload
      });

      successRows += 1;
      if (result?.changed) changedCount += 1;
      row.dataset.initialState = captureUserRowState(row);
      setUserRowDirtyState(row, false);
      clearUserRowError(row);
    } catch (err) {
      const message = err?.message || "未知错误";
      setUserRowError(row, message);
      failures.push(`用户ID ${userId}: ${message}`);
    }
  }

  saveUsersBtn.disabled = false;
  saveUsersBtn.textContent = "保存会员设置";

  if (!failures.length) {
    await renderUsers();
    adminSaveMsg.textContent =
      changedCount > 0
        ? `保存成功：${successRows} 行已保存，${changedCount} 行触发会员/权限版本更新。`
        : `保存成功：${successRows} 行已保存（无版本变化）。`;
    adminSaveMsg.style.color = "#0b6b53";
    adminSaveMsg.classList.remove("hidden");
    return;
  }

  adminSaveMsg.textContent =
    `保存失败：成功 ${successRows} 行，失败 ${failures.length} 行。` +
    ` ${failures.slice(0, 3).join("；")}` +
    (failures.length > 3 ? "；更多错误请查看对应红色行。" : "");
  adminSaveMsg.style.color = "#be2f2f";
  adminSaveMsg.classList.remove("hidden");
}

async function onUsersTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const clickedRow = target.closest("tr[data-user-id]");
  if (!clickedRow) return;
  const button = target.closest("button[data-action]");
  if (!button) {
    const userId = Number(clickedRow.dataset.userId || "0");
    if (!userId) return;
    state.selectedAssignUserId = String(userId);
    renderSelectedUserAssignment();
    return;
  }
  const action = button.dataset.action || "";
  if (!["select-user", "archive-user", "restore-user", "delete-user"].includes(action)) return;
  const row = clickedRow;
  const userId = Number(row.dataset.userId || "0");
  if (!userId) return;
  if (action === "select-user") {
    state.selectedAssignUserId = String(userId);
    renderSelectedUserAssignment();
    return;
  }

  if (action === "delete-user") {
    await deleteUserFromRow(row, userId);
    return;
  }
  if (action === "archive-user") {
    await updateUserStatusFromRow(row, userId, "suspended");
    return;
  }
  if (action === "restore-user") {
    await updateUserStatusFromRow(row, userId, "active");
  }
}

async function updateUserStatusFromRow(row, userId, accountStatus) {
  if (!adminSaveMsg) return;
  const isSuspend = accountStatus === "suspended";
  const email = row.dataset.userEmail || `ID ${userId}`;
  const confirmed = confirm(`确认${isSuspend ? "归档" : "恢复"}账号 ${email} 吗？`);
  if (!confirmed) return;

  const payload = {
    membershipTier: normalizeMembershipTier(row.dataset.membershipTier || "free"),
    accountStatus
  };
  try {
    await apiFetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      token: state.token,
      body: payload
    });
    await renderUsers();
    await renderUserAssignmentPanel();
    adminSaveMsg.textContent = isSuspend ? `账号已归档：${email}` : `账号已恢复：${email}`;
    adminSaveMsg.style.color = "#0b6b53";
    adminSaveMsg.classList.remove("hidden");
  } catch (err) {
    adminSaveMsg.textContent = `${isSuspend ? "归档失败" : "恢复失败"}：${err.message}`;
    adminSaveMsg.style.color = "#be2f2f";
    adminSaveMsg.classList.remove("hidden");
  }
}

async function deleteUserFromRow(row, userId) {
  if (!adminSaveMsg) return;
  const email = row.dataset.userEmail || `ID ${userId}`;
  const confirmed = confirm(`确认永久删除账号 ${email} 吗？该操作不可恢复。`);
  if (!confirmed) return;
  try {
    await apiFetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
      token: state.token
    });
    if (String(state.selectedAssignUserId || "") === String(userId)) {
      state.selectedAssignUserId = "";
    }
    await renderUsers();
    await renderUserAssignmentPanel();
    adminSaveMsg.textContent = `账号已删除：${email}`;
    adminSaveMsg.style.color = "#0b6b53";
    adminSaveMsg.classList.remove("hidden");
  } catch (err) {
    adminSaveMsg.textContent = `删除失败：${err.message}`;
    adminSaveMsg.style.color = "#be2f2f";
    adminSaveMsg.classList.remove("hidden");
  }
}

async function onImportCsv() {
  const importMode = String(importModeSelect?.value || "auto").trim() || "auto";
  const defaultExamCode = String(importExamSelect?.value || "").trim();
  const defaultCategoryCode = String(importCategoryCodeSelect?.value || "").trim().toUpperCase();
  const duplicateMode = String(importDuplicateModeSelect?.value || "update").trim() || "update";
  const autoCreateCategory = importAutoCreateCategoryInput?.checked === true;

  if (importMode === "simple" && !defaultExamCode) {
    showImportMsg("简单导入建议先选择默认考试。", true);
    return;
  }
  if (importMode === "simple" && !defaultCategoryCode) {
    showImportMsg("简单导入请先选择默认分类。", true);
    return;
  }

  const file = csvFileInput.files?.[0];
  if (!file) {
    showImportMsg("请先选择 CSV 文件。", true);
    return;
  }

  try {
    const csvText = await file.text();
    const result = await apiFetch("/api/admin/question-bank/import-csv", {
      method: "POST",
      token: state.token,
      body: {
        csv_text: csvText,
        import_mode: importMode,
        default_exam_code: defaultExamCode,
        default_category_code: defaultCategoryCode,
        duplicate_mode: duplicateMode,
        auto_create_category: autoCreateCategory ? 1 : 0
      }
    });

    const failed = Number(result.failed || 0);
    const sampleFailures = Array.isArray(result.failures) ? result.failures.slice(0, 3) : [];
    const failureText = sampleFailures
      .map((item) => `行${item.line || "-"}(${item.question_id || "-"}) ${item.reason || "导入失败"}`)
      .join("；");

    showImportMsg(
      `导入完成（${result.modeUsed || importMode}）：总行数 ${Number(result.totalRows || 0)}，成功 ${Number(
        result.successCount || 0
      )}（新增 ${Number(result.inserted || 0)} / 更新 ${Number(result.updated || 0)}），跳过 ${Number(
        result.skipped || 0
      )}，失败 ${failed}${failed > 0 && failureText ? `。示例：${failureText}` : ""}`,
      failed > 0
    );

    await renderBankStats();
    await renderReviewPanel(state.reviewExamId);
  } catch (err) {
    showImportMsg(`导入失败：${err.message}`, true);
  }
}

async function renderBankStats() {
  if (!bankStats) return;
  const stats = await apiFetch("/api/admin/question-bank/stats", { token: state.token });
  const activeQuestions = Number(stats.activeQuestions ?? 0);
  const inactiveQuestions = Number(stats.inactiveQuestions ?? 0);
  const deletedQuestions = Number(stats.deletedQuestions ?? 0);
  const totalRecords = Number(stats.questions ?? activeQuestions + inactiveQuestions + deletedQuestions);
  const usableQuestions = activeQuestions + inactiveQuestions;

  bankStats.innerHTML = `
    <article class="progress-card"><h3>行业数</h3><div>${stats.industries}</div></article>
    <article class="progress-card"><h3>考试分类数</h3><div>${stats.exams}</div></article>
    <article class="progress-card"><h3>可用题目数（active+inactive）</h3><div>${usableQuestions}</div></article>
    <article class="progress-card"><h3>全部记录数（含已删除）</h3><div>${totalRecords}</div></article>
    <article class="progress-card"><h3>active</h3><div>${activeQuestions}</div></article>
    <article class="progress-card"><h3>inactive</h3><div>${inactiveQuestions}</div></article>
    <article class="progress-card"><h3>deleted</h3><div>${deletedQuestions}</div></article>
    <article class="progress-card"><h3>B证题型数</h3><div>${stats.bTypeCount}</div></article>
    <article class="progress-card"><h3>B证题目数</h3><div>${stats.bQuestionCount}</div></article>
    <article class="progress-card"><h3>数据来源</h3><div>${stats.source}</div></article>
  `;
}

async function onExportBank() {
  const bank = await apiFetch("/api/admin/question-bank/export", { token: state.token });
  const blob = new Blob([JSON.stringify(bank, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `question-bank-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
  showImportMsg("已导出当前题库 JSON。", false);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function getQuestionOption(question, index) {
  const options = Array.isArray(question?.options) ? question.options : [];
  return String(options[index] ?? "");
}

function buildQuestionBankCsvRows(bank) {
  const header = [
    "question_id",
    "exam_code",
    "category_code",
    "prompt",
    "prompt_zh",
    "option_a",
    "option_a_zh",
    "option_b",
    "option_b_zh",
    "option_c",
    "option_c_zh",
    "option_d",
    "option_d_zh",
    "answer",
    "explanation",
    "explanation_zh",
    "question_type",
    "difficulty",
    "tags",
    "key_points",
    "memory_trick"
  ];
  const rows = [header];
  const industries = Array.isArray(bank?.industries) ? bank.industries : [];
  for (const industry of industries) {
    const exams = Array.isArray(industry?.exams) ? industry.exams : [];
    for (const exam of exams) {
      const examCode = String(exam?.examCode || exam?.id || "").trim();
      const questions = Array.isArray(exam?.questions) ? exam.questions : [];
      for (const question of questions) {
        const i18n = question?.i18n && typeof question.i18n === "object" ? question.i18n : {};
        const zh = i18n?.zh && typeof i18n.zh === "object" ? i18n.zh : {};
        const en = i18n?.en && typeof i18n.en === "object" ? i18n.en : {};
        const answerIndex = Number.isInteger(question?.answerIndex) ? question.answerIndex : 0;
        const answerLetter = ["A", "B", "C", "D"][answerIndex] || "A";
        rows.push([
          String(question?.id || ""),
          examCode,
          String(question?.categoryCode || "").toUpperCase(),
          String(question?.prompt || ""),
          String(zh?.prompt || question?.prompt_zh || ""),
          getQuestionOption(question, 0),
          String((Array.isArray(zh?.options) ? zh.options[0] : "") || question?.option_a_zh || ""),
          getQuestionOption(question, 1),
          String((Array.isArray(zh?.options) ? zh.options[1] : "") || question?.option_b_zh || ""),
          getQuestionOption(question, 2),
          String((Array.isArray(zh?.options) ? zh.options[2] : "") || question?.option_c_zh || ""),
          getQuestionOption(question, 3),
          String((Array.isArray(zh?.options) ? zh.options[3] : "") || question?.option_d_zh || ""),
          answerLetter,
          String(question?.explanation || ""),
          String(zh?.explanation || question?.explanation_zh || ""),
          String(question?.questionType || ""),
          String(question?.difficulty || ""),
          String(question?.tags || ""),
          String(question?.keyPoints || question?.key_points || ""),
          String(question?.memory_trick || question?.memoryTrick || en?.memoryTrick || "")
        ]);
      }
    }
  }
  return rows.map((line) => line.map(csvEscape).join(",")).join("\n");
}

async function onExportBankCsv() {
  const headers = {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(resolveApiPath("/api/admin/question-bank/export-csv"), {
    method: "GET",
    headers
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `CSV 导出失败 (${res.status})`);
  }
  const csvText = await res.text();
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `question-bank-${Date.now()}.csv`;
  a.click();

  URL.revokeObjectURL(url);
  showImportMsg("已导出当前题库 CSV（含 memory_trick）。", false);
}

async function onResetBank() {
  const ok = confirm("确认重置为默认题库吗？这会清空云端导入覆盖。");
  if (!ok) return;

  await apiFetch("/api/admin/question-bank/reset", {
    method: "POST",
    token: state.token,
    body: {}
  });

  showImportMsg("已重置为默认题库。", false);
  await renderBankStats();
  await renderReviewPanel();
}

async function fetchMe() {
  try {
    return await apiFetch("/api/auth/me", { token: state.token });
  } catch {
    return null;
  }
}

function showImportMsg(message, isError) {
  if (!importMsg) return;
  importMsg.textContent = message;
  importMsg.classList.remove("hidden");
  importMsg.style.color = isError ? "#be2f2f" : "#2757d6";
}

function showQuestionManagerMsg(message, isError) {
  if (!qmMsg) return;
  qmMsg.textContent = message;
  qmMsg.classList.remove("hidden");
  qmMsg.style.color = isError ? "#be2f2f" : "#2757d6";
}

async function renderReviewPanel(preferredExamId = "", preferredQuestionId = "") {
  if (!reviewExamSelect || !reviewQuestionSelect) return;

  reviewSaveMsg?.classList.add("hidden");
  state.reviewQuestions = [];
  state.reviewExamId = "";
  state.reviewQuestionId = "";

  const bank = await apiFetch("/api/admin/question-bank/export", { token: state.token });
  const exams = [];
  for (const industry of bank?.industries || []) {
    for (const exam of industry?.exams || []) {
      const usableQuestions = (Array.isArray(exam?.questions) ? exam.questions : []).filter(
        (item) => !isDeletedQuestionForReview(item)
      );
      if (!usableQuestions.length) continue;
      exams.push({
        id: exam.examCode || exam.id,
        name: exam.name,
        industryName: industry.name,
        questionCount: usableQuestions.length
      });
    }
  }

  reviewExamSelect.innerHTML = "";
  if (!exams.length) {
    setSelectPlaceholder(reviewExamSelect, "当前无可校对考试");
    setSelectPlaceholder(reviewQuestionSelect, "训练内容正在整理中，请稍后再试");
    clearReviewEditor();
    return;
  }

  exams.sort((a, b) => `${a.industryName}-${a.id}`.localeCompare(`${b.industryName}-${b.id}`, "en"));
  for (const exam of exams) {
    const option = document.createElement("option");
    option.value = exam.id;
    option.textContent = `${exam.name}（${exam.id} / ${exam.questionCount}题）`;
    reviewExamSelect.appendChild(option);
  }
  reviewExamSelect.disabled = false;

  if (preferredExamId && exams.some((item) => item.id === preferredExamId)) {
    reviewExamSelect.value = preferredExamId;
  }

  state.reviewExamId = reviewExamSelect.value || exams[0].id;
  if (reviewTargetExamSelect && Array.from(reviewTargetExamSelect.options).some((opt) => opt.value === state.reviewExamId)) {
    reviewTargetExamSelect.value = state.reviewExamId;
  }
  await loadReviewQuestions(state.reviewExamId, preferredQuestionId);
}

async function onReviewExamChange() {
  const examId = reviewExamSelect?.value || "";
  await loadReviewQuestions(examId);
}

async function loadReviewQuestions(examId, preferredQuestionId = "") {
  state.reviewExamId = examId || "";
  state.reviewQuestionId = "";
  state.reviewQuestions = [];
  reviewQuestionSelect.innerHTML = "";
  reviewSaveMsg?.classList.add("hidden");

  if (!examId) {
    setSelectPlaceholder(reviewQuestionSelect, "请先选择考试分类");
    clearReviewEditor();
    return;
  }

  let payload;
  try {
    payload = await apiFetch(`/api/admin/question-bank/questions?examId=${encodeURIComponent(examId)}`, {
      token: state.token
    });
  } catch (err) {
    setSelectPlaceholder(reviewQuestionSelect, `加载失败：${err.message}`);
    clearReviewEditor();
    return;
  }
  const questions = (Array.isArray(payload?.questions) ? payload.questions : []).filter(
    (item) => !isDeletedQuestionForReview(item)
  );
  state.reviewQuestions = questions;

  if (!questions.length) {
    setSelectPlaceholder(reviewQuestionSelect, "当前无可校对题目，训练内容正在整理中");
    clearReviewEditor();
    return;
  }

  for (const q of questions) {
    const option = document.createElement("option");
    option.value = q.id;
    option.textContent = `${buildQuestionPreview(q)} [${translationStatusLabel(q.translation_status)}]`;
    reviewQuestionSelect.appendChild(option);
  }
  reviewQuestionSelect.disabled = false;

  if (preferredQuestionId && questions.some((item) => item.id === preferredQuestionId)) {
    reviewQuestionSelect.value = preferredQuestionId;
  }
  state.reviewQuestionId = reviewQuestionSelect.value || questions[0].id;
  renderReviewQuestion(state.reviewQuestionId);
}

function onReviewQuestionChange() {
  const questionId = reviewQuestionSelect?.value || "";
  state.reviewQuestionId = questionId;
  renderReviewQuestion(questionId);
}

function renderReviewQuestion(questionId) {
  const question = state.reviewQuestions.find((item) => item.id === questionId);
  if (!question) {
    clearReviewEditor();
    return;
  }

  document.getElementById("reviewEditorPanel")?.classList.remove("hidden");
  document.getElementById("reviewEditorEmpty")?.classList.add("hidden");

  const zh = question.zh || {};
  const en = question.en || {};
  const rootPrompt = question.prompt || "";
  const rootOptions = Array.isArray(question.options) ? question.options : ["", "", "", ""];
  const rootExplanation = question.explanation || "";

  enforceReviewEnglishReadOnly();
  reviewPromptEn.value = en.prompt || rootPrompt || "";
  reviewPromptZh.value = zh.prompt || rootPrompt || "";
  reviewOptionsEn.value = formatOptionsForTextarea(en.options?.length ? en.options : rootOptions);
  reviewOptionsZh.value = formatOptionsForTextarea(zh.options?.length ? zh.options : rootOptions);
  reviewExplanationEn.value = en.explanation || rootExplanation || "";
  if (reviewMemoryTrick) {
    reviewMemoryTrick.value = question.memoryTrick || question.memory_trick || en.memoryTrick || "";
  }
  reviewExplanationZh.value = zh.explanation || rootExplanation || "";
  if (reviewQuestionStatus) {
    reviewQuestionStatus.value = question.status || "active";
  }
  if (reviewTargetExamSelect) {
    const targetCode = question.examCode || state.reviewExamId || "";
    if (targetCode && Array.from(reviewTargetExamSelect.options).some((opt) => opt.value === targetCode)) {
      reviewTargetExamSelect.value = targetCode;
    }
  }
  if (reviewKeyPointEn) reviewKeyPointEn.value = en.keyPoint || question.keyPointEn || "";
  if (reviewKeyPointZh) reviewKeyPointZh.value = zh.keyPoint || question.keyPointZh || "";
  if (reviewReasoningEn) reviewReasoningEn.value = en.answerReasoning || question.answerReasoningEn || "";
  if (reviewReasoningZh) reviewReasoningZh.value = zh.answerReasoning || question.answerReasoningZh || "";
  reviewQuestionTypeZh.value = zh.questionType || question.questionType || "";
  if (reviewTranslationStatus) {
    reviewTranslationStatus.textContent = translationStatusLabel(question.translation_status);
  }
}

async function onSaveReview() {
  const questionId = reviewQuestionSelect?.value || "";
  if (!state.reviewExamId || !questionId) {
    showReviewMsg("请先选择要校对的题目。", true);
    return;
  }

  const targetExamCode = (reviewTargetExamSelect?.value || "").trim() || state.reviewExamId;
  const questionStatus = (reviewQuestionStatus?.value || "active").trim();
  if (!targetExamCode) {
    showReviewMsg("请选择归属考试。", true);
    return;
  }

  const body = {
    examId: state.reviewExamId,
    examCode: targetExamCode,
    status: questionStatus,
    memoryTrick: reviewMemoryTrick?.value?.trim() || "",
    zh: {
      prompt: reviewPromptZh.value.trim(),
      options: parseTextareaOptions(reviewOptionsZh.value),
      explanation: reviewExplanationZh.value.trim(),
      keyPoint: reviewKeyPointZh?.value?.trim() || "",
      answerReasoning: reviewReasoningZh?.value?.trim() || "",
      questionType: reviewQuestionTypeZh.value.trim()
    }
  };

  try {
    const result = await apiFetch(`/api/admin/question-bank/question/${questionId}`, {
      method: "PUT",
      token: state.token,
      body
    });

    if (result?.question) {
      const nextExamCode = result.question.examCode || state.reviewExamId;
      if (nextExamCode !== state.reviewExamId) {
        await renderReviewPanel(nextExamCode, result.question.id);
      } else {
        const idx = state.reviewQuestions.findIndex((item) => item.id === questionId);
        if (idx >= 0) {
          state.reviewQuestions[idx] = result.question;
        }
        const opt = reviewQuestionSelect?.querySelector(`option[value='${cssEscape(questionId)}']`);
        if (opt) {
          opt.textContent = `${buildQuestionPreview(result.question)} [${translationStatusLabel(result.question.translation_status)}]`;
        }
        renderReviewQuestion(questionId);
      }
    }

    showReviewMsg("题目已保存（含状态/归属考试/中文内容）。", false);
  } catch (err) {
    showReviewMsg(`保存失败：${err.message}`, true);
  }
}

function clearReviewEditor() {
  document.getElementById("reviewEditorPanel")?.classList.add("hidden");
  document.getElementById("reviewEditorEmpty")?.classList.remove("hidden");
  if (!reviewPromptEn) return;
  enforceReviewEnglishReadOnly();
  reviewPromptEn.value = "";
  reviewPromptZh.value = "";
  reviewOptionsEn.value = "";
  reviewOptionsZh.value = "";
  reviewExplanationEn.value = "";
  if (reviewMemoryTrick) reviewMemoryTrick.value = "";
  reviewExplanationZh.value = "";
  if (reviewQuestionStatus) reviewQuestionStatus.value = "active";
  if (reviewTargetExamSelect && reviewTargetExamSelect.options.length) {
    reviewTargetExamSelect.selectedIndex = 0;
  }
  if (reviewKeyPointEn) reviewKeyPointEn.value = "";
  if (reviewKeyPointZh) reviewKeyPointZh.value = "";
  if (reviewReasoningEn) reviewReasoningEn.value = "";
  if (reviewReasoningZh) reviewReasoningZh.value = "";
  reviewQuestionTypeZh.value = "";
  if (reviewTranslationStatus) {
    reviewTranslationStatus.textContent = "--";
  }
}

function isDeletedQuestionForReview(question) {
  const status = String(question?.status || question?.questionStatus || question?.question_status || "")
    .trim()
    .toLowerCase();
  return status === "deleted";
}

function translationStatusLabel(status) {
  const key = String(status || "").trim();
  if (key === "human_verified") return "human_verified（人工已校对）";
  if (key === "ai_translated") return "ai_translated（AI 已翻译）";
  return "untranslated（未翻译）";
}

function formatOptionsForTextarea(options) {
  const lines = Array.isArray(options) ? options.slice(0, 4).map((item) => String(item || "")) : [];
  while (lines.length < 4) lines.push("");
  return lines.join("\n");
}

function parseTextareaOptions(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .slice(0, 4)
    .map((line) => line.trim());
  while (lines.length < 4) lines.push("");
  return lines;
}

function buildQuestionPreview(question) {
  const text = String(question?.en?.prompt || question?.zh?.prompt || question?.prompt || "").trim();
  if (!text) return "未命名题目";
  if (text.length <= 28) return text;
  return `${text.slice(0, 28)}...`;
}

function showReviewMsg(message, isError) {
  if (!reviewSaveMsg) return;
  reviewSaveMsg.textContent = message;
  reviewSaveMsg.classList.remove("hidden");
  reviewSaveMsg.style.color = isError ? "#be2f2f" : "#2757d6";
}

function showCategoryMsg(message, isError) {
  if (!categoryMsg) return;
  categoryMsg.textContent = message;
  categoryMsg.classList.remove("hidden");
  categoryMsg.style.color = isError ? "#be2f2f" : "#2757d6";
}

function showExamCategoryMsg(message, isError) {
  if (!examCategoryMsg) return;
  examCategoryMsg.textContent = message;
  examCategoryMsg.classList.remove("hidden");
  examCategoryMsg.style.color = isError ? "#be2f2f" : "#2757d6";
}

function showSiteSettingsMsg(message, isError) {
  if (!siteSettingsMsg) return;
  siteSettingsMsg.textContent = message;
  siteSettingsMsg.classList.remove("hidden");
  siteSettingsMsg.style.color = isError ? "#be2f2f" : "#2757d6";
}

function showExamCatalogMsg(message, isError) {
  if (!examCatalogMsg) return;
  examCatalogMsg.textContent = message;
  examCatalogMsg.classList.remove("hidden");
  examCatalogMsg.style.color = isError ? "#be2f2f" : "#2757d6";
}

function showExamStructureMsg(message, isError) {
  if (!examStructureMsg) return;
  examStructureMsg.textContent = message;
  examStructureMsg.classList.remove("hidden");
  examStructureMsg.style.color = isError ? "#be2f2f" : "#2757d6";
}

function focusExamCatalogRow(examCode) {
  if (!examCatalogTbody || !examCode) return;
  const targetCode = String(examCode).trim();
  const rows = Array.from(examCatalogTbody.querySelectorAll("tr[data-exam-code]"));
  const row = rows.find((item) => String(item?.dataset?.examCode || "").trim() === targetCode);
  if (!row) return;
  row.scrollIntoView({ block: "center", behavior: "smooth" });
  const prev = row.style.backgroundColor;
  row.style.backgroundColor = "#fff4d6";
  setTimeout(() => {
    row.style.backgroundColor = prev || "";
  }, 1800);
}

async function apiFetch(path, options = {}) {
  const token = options.token || state.token || "";
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(resolveApiPath(path), {
      method: options.method || "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw new Error("无法连接后端。请先在项目目录运行：PORT=5173 python3 app.py");
  }

  if (res.status === 501) {
    throw new Error("检测到静态服务器（501）。请停止 python3 -m http.server，改为运行 python3 app.py。");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `请求失败 (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function resolveApiPath(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path}`;
}

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function normalizeEntitlements(user) {
  const raw = user?.entitlements || {};
  const paidDefault = user?.plan === "paid";
  return {
    bLicenseAccess: raw.bLicenseAccess ?? paidDefault,
    cLicenseAccess: raw.cLicenseAccess ?? paidDefault,
    bilingualAccess: raw.bilingualAccess ?? paidDefault
  };
}

function normalizeCategoryEntitlementDetails(user, categories, legacyEntitlements) {
  const rawActive = user?.categoryEntitlements && typeof user.categoryEntitlements === "object" ? user.categoryEntitlements : {};
  const rawDetails =
    user?.categoryEntitlementDetails && typeof user.categoryEntitlementDetails === "object"
      ? user.categoryEntitlementDetails
      : {};
  const mapped = {};
  const paidDefault = user?.plan === "paid";
  for (const category of categories) {
    const key = category?.key;
    if (!key) continue;
    const detail = rawDetails[key] && typeof rawDetails[key] === "object" ? rawDetails[key] : {};
    let hasAccess = detail.hasAccess;
    if (hasAccess === undefined && Object.prototype.hasOwnProperty.call(rawActive, key)) {
      hasAccess = rawActive[key] === true;
    }
    if (hasAccess === undefined && key === "b_license" && legacyEntitlements?.bLicenseAccess !== undefined) {
      hasAccess = legacyEntitlements.bLicenseAccess === true;
    }
    if (hasAccess === undefined && key === "c_license" && legacyEntitlements?.cLicenseAccess !== undefined) {
      hasAccess = legacyEntitlements.cLicenseAccess === true;
    }
    if (hasAccess === undefined) {
      hasAccess = paidDefault;
    }

    const expiresAt = typeof detail.expiresAt === "string" ? detail.expiresAt : "";
    const expiryYmd = toDateInputValue(expiresAt);
    const isActive = detail.isActive === true || (hasAccess && isDateActive(expiryYmd));
    const isExpired = detail.isExpired === true || (hasAccess && !isActive);
    mapped[key] = {
      hasAccess,
      expiresAt,
      expiryYmd,
      isActive,
      isExpired
    };
  }
  return mapped;
}

function normalizeBilingualEntitlement(user, legacyEntitlements) {
  const raw = user?.bilingualEntitlement && typeof user.bilingualEntitlement === "object" ? user.bilingualEntitlement : {};
  const paidDefault = user?.plan === "paid";
  const hasAccess =
    raw.hasAccess !== undefined
      ? raw.hasAccess === true
      : legacyEntitlements?.bilingualAccess !== undefined
        ? legacyEntitlements.bilingualAccess === true
        : paidDefault;
  const expiresAt = typeof raw.expiresAt === "string" ? raw.expiresAt : "";
  const expiryYmd = toDateInputValue(expiresAt);
  const isActive = raw.isActive === true || (hasAccess && isDateActive(expiryYmd));
  const isExpired = raw.isExpired === true || (hasAccess && !isActive);
  return {
    hasAccess,
    expiresAt,
    expiryYmd,
    isActive,
    isExpired
  };
}

function refreshRowStatus(row, categories) {
  for (const category of categories) {
    updateCategoryStatus(row, category.key);
  }
  updateBilingualStatus(row);
}

function updateCategoryStatus(row, key) {
  const check = row.querySelector(`input[data-category-key='${cssEscape(key)}']`);
  const expiry = row.querySelector(`input[data-category-expiry-key='${cssEscape(key)}']`);
  const statusEl = row.querySelector(`[data-category-status-key='${cssEscape(key)}']`);
  if (!statusEl) return;
  const status = formatEntitlementStatus(check?.checked === true, normalizeDateInput(expiry?.value || ""));
  statusEl.textContent = status.text;
  statusEl.style.color = status.isError ? "#be2f2f" : "#6b7a8c";
}

function updateBilingualStatus(row) {
  const check = row.querySelector("input[data-entitlement='bilingualAccess']");
  const expiry = row.querySelector("input[data-entitlement-expiry='bilingualExpiresAt']");
  const statusEl = row.querySelector("[data-bilingual-status]");
  if (!statusEl) return;
  const status = formatEntitlementStatus(check?.checked === true, normalizeDateInput(expiry?.value || ""));
  statusEl.textContent = status.text;
  statusEl.style.color = status.isError ? "#be2f2f" : "#6b7a8c";
}

function formatEntitlementStatus(hasAccess, dateYmd) {
  if (!hasAccess) {
    return { text: "未开通", isError: false };
  }
  if (!dateYmd) {
    return { text: "未设置到期（保存时将自动补为长期）", isError: false };
  }
  if (!isDateActive(dateYmd)) {
    return { text: `已过期（${dateYmd}）`, isError: true };
  }
  return { text: `有效期至 ${dateYmd}`, isError: false };
}

function applyRenewDateInput(input, months) {
  if (!input || !Number.isFinite(months) || months < 1) return;
  const currentYmd = normalizeDateInput(input.value);
  const today = parseDateYmd(todayYmd());
  const current = parseDateYmd(currentYmd);
  const base = current && today && current.getTime() > today.getTime() ? current : today;
  if (!base) return;
  input.value = formatDateYmd(addMonthsUtc(base, months));
}

function addMonthsUtc(date, months) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);
  return new Date(Date.UTC(targetYear, targetMonth, targetDay));
}

function todayYmd() {
  return formatDateYmd(new Date());
}

function toDateInputValue(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return formatDateYmd(date);
}

function normalizeDateInput(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function parseDateYmd(ymd) {
  const text = normalizeDateInput(ymd);
  if (!text) return null;
  const parts = text.split("-").map((item) => Number.parseInt(item, 10));
  if (parts.length !== 3 || parts.some((item) => Number.isNaN(item))) return null;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

function formatDateYmd(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateActive(ymd) {
  const text = normalizeDateInput(ymd);
  if (!text) return false;
  return text >= todayYmd();
}

function cssEscape(value) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(String(value || ""));
  }
  return String(value || "").replaceAll("'", "\\'");
}

function getEnabledCategories() {
  return state.categories.filter((item) => item && item.isEnabled === true);
}

function setSelectPlaceholder(selectEl, text) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = text;
  option.selected = true;
  selectEl.appendChild(option);
  selectEl.disabled = true;
}

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ============================================================
// Question image upload dialog (added 2026-04-24)
// ============================================================
function openQuestionImageDialog(questionId, currentImageUrl) {
  // Clean up any existing
  const existing = document.getElementById("qm-image-dialog");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "qm-image-dialog";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(0, 0, 0, 0.5)",
    zIndex: "100000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    width: "min(500px, 92vw)",
    maxHeight: "88vh",
    overflowY: "auto",
    boxShadow: "0 8px 40px rgba(0, 0, 0, 0.2)",
  });
  card.addEventListener("click", (e) => e.stopPropagation());

  // Title
  const title = document.createElement("h3");
  title.textContent = `题目图片：${questionId}`;
  Object.assign(title.style, { margin: "0 0 16px 0", fontSize: "18px", color: "#1f2937" });
  card.appendChild(title);

  // Current image preview
  const preview = document.createElement("div");
  preview.id = "qm-image-preview";
  Object.assign(preview.style, {
    marginBottom: "16px",
    textAlign: "center",
    padding: "12px",
    background: "#f9fafb",
    borderRadius: "8px",
    border: "1px dashed #d1d5db",
    minHeight: "80px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });
  function renderPreview(url) {
    preview.innerHTML = "";
    if (url) {
      const img = document.createElement("img");
      img.src = url + "?t=" + Date.now();  // cache bust
      Object.assign(img.style, { maxWidth: "100%", maxHeight: "240px", borderRadius: "6px" });
      preview.appendChild(img);
    } else {
      const p = document.createElement("p");
      p.textContent = "(暂无图片)";
      p.style.color = "#9ca3af";
      p.style.margin = "0";
      preview.appendChild(p);
    }
  }
  renderPreview(currentImageUrl);
  card.appendChild(preview);

  // File input
  const fileLabel = document.createElement("label");
  Object.assign(fileLabel.style, { display: "block", marginBottom: "8px", fontSize: "14px", color: "#4b5563" });
  fileLabel.textContent = "选择图片（png/jpg/jpeg/webp，最大 2MB）：";
  card.appendChild(fileLabel);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";
  Object.assign(fileInput.style, { width: "100%", marginBottom: "12px" });
  card.appendChild(fileInput);

  // Message area
  const msg = document.createElement("div");
  Object.assign(msg.style, { minHeight: "20px", fontSize: "13px", marginBottom: "12px" });
  card.appendChild(msg);

  function setMsg(text, color) {
    msg.textContent = text;
    msg.style.color = color || "#6b7280";
  }

  // Buttons row
  const btnRow = document.createElement("div");
  Object.assign(btnRow.style, { display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" });

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn ghost";
  closeBtn.textContent = "关闭";
  closeBtn.addEventListener("click", () => overlay.remove());

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn ghost";
  deleteBtn.textContent = "删除图片";
  deleteBtn.style.color = "#dc2626";
  deleteBtn.style.borderColor = "#fca5a5";
  if (!currentImageUrl) deleteBtn.style.display = "none";

  const uploadBtn = document.createElement("button");
  uploadBtn.type = "button";
  uploadBtn.className = "btn primary";
  uploadBtn.textContent = "上传";

  btnRow.appendChild(closeBtn);
  btnRow.appendChild(deleteBtn);
  btnRow.appendChild(uploadBtn);
  card.appendChild(btnRow);

  // Upload action
  uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      setMsg("请先选择文件", "#dc2626");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMsg(`文件太大（${(file.size / 1024 / 1024).toFixed(2)}MB），上限 2MB`, "#dc2626");
      return;
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["png", "jpg", "jpeg", "webp"].includes(ext)) {
      setMsg("仅支持 png/jpg/jpeg/webp 格式", "#dc2626");
      return;
    }
    uploadBtn.disabled = true;
    deleteBtn.disabled = true;
    setMsg("上传中...", "#6b7280");
    const fd = new FormData();
    fd.append("image", file);
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
      const r = await fetch(
        `/api/admin/question-bank/question/${encodeURIComponent(questionId)}/image`,
        {
          method: "POST",
          headers: { "Authorization": "Bearer " + token },
          body: fd,
        }
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg("上传失败：" + (data.error || r.status), "#dc2626");
        uploadBtn.disabled = false;
        deleteBtn.disabled = false;
        return;
      }
      setMsg("上传成功", "#16a34a");
      renderPreview(data.imageUrl);
      deleteBtn.style.display = "";
      // Update button state in the table (refresh visible row)
      updateImageButtonInTable(questionId, data.imageUrl);
      uploadBtn.disabled = false;
      deleteBtn.disabled = false;
      fileInput.value = "";
    } catch (e) {
      setMsg("上传失败：" + String(e), "#dc2626");
      uploadBtn.disabled = false;
      deleteBtn.disabled = false;
    }
  });

  // Delete action
  deleteBtn.addEventListener("click", async () => {
    if (!window.confirm(`确认删除题目 ${questionId} 的图片吗？`)) return;
    deleteBtn.disabled = true;
    uploadBtn.disabled = true;
    setMsg("删除中...", "#6b7280");
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
      const r = await fetch(
        `/api/admin/question-bank/question/${encodeURIComponent(questionId)}/image`,
        {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + token },
        }
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg("删除失败：" + (data.error || r.status), "#dc2626");
        uploadBtn.disabled = false;
        deleteBtn.disabled = false;
        return;
      }
      setMsg("已删除", "#16a34a");
      renderPreview("");
      deleteBtn.style.display = "none";
      updateImageButtonInTable(questionId, "");
      uploadBtn.disabled = false;
    } catch (e) {
      setMsg("删除失败：" + String(e), "#dc2626");
      uploadBtn.disabled = false;
      deleteBtn.disabled = false;
    }
  });

  overlay.addEventListener("click", () => overlay.remove());
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function updateImageButtonInTable(questionId, imageUrl) {
  const row = document.querySelector(`tr[data-question-id="${CSS.escape(questionId)}"]`);
  if (!row) return;
  const btn = row.querySelector("button[data-action='qm-image']");
  if (!btn) return;
  btn.dataset.imageUrl = imageUrl || "";
  if (imageUrl) {
    btn.textContent = "管理图片";
    btn.style.background = "#3b82f6";
    btn.style.color = "#fff";
  } else {
    btn.textContent = "添加图片";
    btn.style.background = "";
    btn.style.color = "";
  }
}
