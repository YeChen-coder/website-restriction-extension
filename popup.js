const STORAGE_KEYS = {
  LANGUAGE: "uiLanguage"
};

const I18N = {
  en: {
    documentTitle: "Edge Page Limiter",
    popupTitle: "Page limiter",
    languageLabel: "Language",
    loading: "Loading status...",
    openOptions: "Open rule settings",
    rescanCurrent: "Rescan current tab",
    cooldown: "Global lock remaining {time}.",
    status: "{enabled}/{total} rules enabled, {tabs} tabs currently being timed. {cooldown}"
  },
  zh: {
    documentTitle: "Edge Page Limiter",
    popupTitle: "页面时间锁",
    languageLabel: "界面语言",
    loading: "读取状态中...",
    openOptions: "打开规则设置",
    rescanCurrent: "重新检查当前标签页",
    cooldown: "整体锁定剩余 {time}。",
    status: "{enabled}/{total} 条规则启用，{tabs} 个标签页正在计时。{cooldown}"
  }
};

let language = "en";

function t(key, replacements = {}) {
  const template = I18N[language]?.[key] || I18N.en[key] || key;
  return Object.entries(replacements).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  );
}

async function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

async function loadLanguage() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.LANGUAGE);
  language = data[STORAGE_KEYS.LANGUAGE] === "zh" ? "zh" : "en";
  document.querySelector("#languageSelect").value = language;
  applyStaticText();
}

function applyStaticText() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = t("documentTitle");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
}

async function refresh() {
  const statusNode = document.querySelector("#status");
  statusNode.textContent = t("loading");
  const status = await sendMessage({ type: "GET_STATUS" });
  const enabled = (status.rules || []).filter((rule) => rule.enabled).length;
  const cooldownMs = Number(status.globalCooldownRemaining || 0);
  const cooldownText = cooldownMs > 0
    ? t("cooldown", { time: formatRemaining(cooldownMs) })
    : "";
  statusNode.textContent = t("status", {
    enabled,
    total: (status.rules || []).length,
    tabs: status.activeLimitedTabs || 0,
    cooldown: cooldownText
  });
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

document.querySelector("#languageSelect").addEventListener("change", async (event) => {
  language = event.target.value === "zh" ? "zh" : "en";
  await chrome.storage.local.set({ [STORAGE_KEYS.LANGUAGE]: language });
  applyStaticText();
  await refresh();
});

document.querySelector("#openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.querySelector("#rescan").addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;
  if (tabId !== undefined) {
    await sendMessage({ type: "RESCAN_TAB", tabId });
  }
  await refresh();
});

loadLanguage().then(refresh);
