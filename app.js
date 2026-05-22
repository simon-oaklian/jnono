const AUTH_TOKEN_KEY = "jnono-auth-token-v1";
const API_BASE =
  window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
    ? "http://127.0.0.1:5173"
    : "";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");

const registerForm = document.getElementById("registerForm");
const registerNameInput = document.getElementById("registerNameInput");
const registerEmailInput = document.getElementById("registerEmailInput");
const registerPasswordInput = document.getElementById("registerPasswordInput");
const registerError = document.getElementById("registerError");
const registerSuccess = document.getElementById("registerSuccess");
const loginPanel = document.getElementById("loginPanel");
const registerPanel = document.getElementById("registerPanel");
const registerToggle = document.querySelector("#registerPanel .lp-register-toggle");
const heroTryBtn = document.getElementById("heroTryBtn");
const heroLoginBtn = document.getElementById("heroLoginBtn");
const wechatIdText = document.getElementById("wechatIdText");
const wechatCopyBtn = document.getElementById("wechatCopyBtn");
const wechatHint = document.getElementById("wechatHint");

const DEFAULT_WECHAT_ID = "JNONO_HELP";
let wechatId = DEFAULT_WECHAT_ID;

(async () => {
  await init();
})();

async function init() {
  await loadSiteSettings();
  initWechatContact();
  initHeroActions();

  const token = getAuthToken();
  if (token) {
    const me = await fetchMe(token);
    if (me?.role === "user") {
      routeByPlan(me.user.plan);
      return;
    }
    if (!me) {
      clearAuthToken();
    }
  }

  loginForm.addEventListener("submit", onLogin);
  registerForm.addEventListener("submit", onRegister);
}

async function loadSiteSettings() {
  try {
    const payload = await apiFetch("/api/site-settings");
    const fetched = normalizeWechatId(payload?.wechatId);
    if (fetched) {
      wechatId = fetched;
    }
  } catch {}
}

function normalizeWechatId(value) {
  const text = String(value || "").trim().replace(/\s+/g, "");
  return text || "";
}

function initHeroActions() {
  if (heroTryBtn) {
    heroTryBtn.addEventListener("click", (event) => {
      event.preventDefault();
      if (registerToggle) {
        registerToggle.open = true;
      }
      scrollToElement(registerPanel || registerForm);
      setTimeout(() => {
        registerNameInput?.focus();
      }, 220);
    });
  }

  if (heroLoginBtn) {
    heroLoginBtn.addEventListener("click", (event) => {
      event.preventDefault();
      scrollToElement(loginPanel || loginForm);
      setTimeout(() => {
        emailInput?.focus();
      }, 220);
    });
  }
}

function scrollToElement(target) {
  if (!target || typeof target.scrollIntoView !== "function") return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function initWechatContact() {
  if (wechatIdText) {
    wechatIdText.textContent = wechatId;
  }
  if (!wechatCopyBtn) return;

  wechatCopyBtn.addEventListener("click", async () => {
    const ok = await copyText(wechatId);
    if (!wechatHint) return;
    wechatHint.textContent = ok ? "已复制微信号，打开微信可直接粘贴添加。" : `复制失败，请手动添加：${wechatId}`;
  });
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  try {
    const input = document.createElement("input");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(input);
    return ok;
  } catch {
    return false;
  }
}

async function onLogin(event) {
  event.preventDefault();

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  try {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: { email, password }
    });

    loginError.classList.add("hidden");
    registerError.classList.add("hidden");
    registerSuccess.classList.add("hidden");

    setAuthToken(data.token);
    routeByPlan(data.user.plan);
  } catch (err) {
    loginError.textContent = err.message || "账号或密码错误，请重试。";
    loginError.classList.remove("hidden");
  }
}

async function onRegister(event) {
  event.preventDefault();

  const name = registerNameInput.value.trim();
  const email = registerEmailInput.value.trim().toLowerCase();
  const password = registerPasswordInput.value;

  if (name.length < 2) {
    registerError.textContent = "姓名至少 2 个字符。";
    registerError.classList.remove("hidden");
    registerSuccess.classList.add("hidden");
    return;
  }

  if (password.length < 6) {
    registerError.textContent = "密码至少 6 位。";
    registerError.classList.remove("hidden");
    registerSuccess.classList.add("hidden");
    return;
  }

  try {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: { name, email, password }
    });

    registerError.classList.add("hidden");
    registerSuccess.textContent = "注册成功，正在进入10题模拟页面...";
    registerSuccess.classList.remove("hidden");

    setAuthToken(data.token);
    routeByPlan(data.user.plan);
  } catch (err) {
    registerError.textContent = err.message || "注册失败，请重试。";
    registerError.classList.remove("hidden");
    registerSuccess.classList.add("hidden");
  }
}

function routeByPlan(plan) {
  if (plan === "paid") {
    window.location.href = "/member.html";
    return;
  }
  window.location.href = "/trial.html";
}

async function fetchMe(token) {
  try {
    return await apiFetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch {
    return null;
  }
}

async function apiFetch(path, options = {}) {
  const opts = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  };

  if (options.body !== undefined) {
    opts.body = JSON.stringify(options.body);
  }

  const res = await fetch(resolveApiPath(path), opts);
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

function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
