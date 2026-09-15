const STORAGE_KEYS = {
  LANGUAGE: "uiLanguage"
};

const I18N = {
  en: {
    documentTitle: "Edge Page Limiter Settings",
    appTitle: "Edge Page Limiter",
    languageLabel: "Language",
    newRule: "New rule",
    rescanTabs: "Rescan tabs",
    ruleList: "Rule list",
    enabledRule: "Enable this rule",
    nameLabel: "Name",
    namePlaceholder: "For example: Bilibili or ChatGPT entertainment",
    typeLabel: "Rule type",
    domainOption: "Domain rule: match the whole site",
    keywordOption: "Keyword rule: match specific pages only",
    usageLabel: "Allowed minutes",
    cooldownLabel: "Lock minutes",
    actionLabel: "Action when time is up / locked",
    closeOption: "Close matching tabs",
    redirectOption: "Redirect matching tabs to blocked page",
    domainsLabel: "Target domains",
    domainsPlaceholder: "One per line: bilibili.com\nyoutube.com\nchatgpt.com",
    keywordsLabel: "Keywords",
    keywordsPlaceholder: "One per line: game\nentertainment\nnovel\nprocrastination",
    saveRule: "Save rule",
    duplicate: "Duplicate",
    delete: "Delete",
    ruleUnit: "rules",
    enabled: "Enabled",
    disabled: "Disabled",
    domain: "Domain",
    keyword: "Keyword",
    closeTabs: "Close tabs",
    blockedPage: "Blocked page",
    noDomains: "No domains set",
    allSites: "All websites",
    noKeywords: "No keywords set",
    locked: "Locked",
    globalCooldown: "Global lock remaining {time}.",
    summary: "Only matching tabs are restricted. The browser and unrelated tabs stay open. {enabled}/{total} rules enabled. {cooldown}",
    domainHint: "Domain rules match the domain and its subdomains. For example, bilibili.com matches www.bilibili.com.",
    keywordHint: "Keyword rules apply within the target domains and match the URL, page title, and visible page text. Useful for limiting specific ChatGPT conversations.",
    newRuleName: "New rule",
    untitledRule: "Untitled rule",
    copySuffix: "copy",
    deleteConfirm: "Delete \"{name}\"?"
  },
  zh: {
    documentTitle: "Edge Page Limiter 设置",
    appTitle: "Edge 页面时间锁",
    languageLabel: "界面语言",
    newRule: "新建规则",
    rescanTabs: "重新检查标签页",
    ruleList: "规则列表",
    enabledRule: "启用这条规则",
    nameLabel: "名称",
    namePlaceholder: "比如 Bilibili 或 ChatGPT 娱乐",
    typeLabel: "规则类型",
    domainOption: "域名规则：命中整个网站",
    keywordOption: "关键词规则：只命中特定页面",
    usageLabel: "可运行分钟",
    cooldownLabel: "锁定分钟",
    actionLabel: "到时间/锁定期动作",
    closeOption: "关闭命中的标签页",
    redirectOption: "把命中的标签页跳到锁定页",
    domainsLabel: "适用域名",
    domainsPlaceholder: "每行一个：bilibili.com\nyoutube.com\nchatgpt.com",
    keywordsLabel: "关键词",
    keywordsPlaceholder: "每行一个：游戏\n娱乐\n小说\n摸鱼",
    saveRule: "保存规则",
    duplicate: "复制",
    delete: "删除",
    ruleUnit: "条",
    enabled: "启用",
    disabled: "停用",
    domain: "域名",
    keyword: "关键词",
    closeTabs: "关闭标签页",
    blockedPage: "锁定页",
    noDomains: "未设置域名",
    allSites: "所有网站",
    noKeywords: "未设置关键词",
    locked: "锁定",
    globalCooldown: "整体锁定剩余 {time}。",
    summary: "只限制命中的标签页，不关闭浏览器和其他标签页。当前 {enabled}/{total} 条规则启用。{cooldown}",
    domainHint: "域名规则会匹配该域名和它的子域名，例如 bilibili.com 会匹配 www.bilibili.com。",
    keywordHint: "关键词规则只在适用域名内生效，并匹配 URL、页面标题、页面可见文本。适合 ChatGPT 的部分聊天限制。",
    newRuleName: "新规则",
    untitledRule: "未命名规则",
    copySuffix: "副本",
    deleteConfirm: "删除「{name}」？"
  }
};

const ruleList = document.querySelector("#ruleList");
const ruleCount = document.querySelector("#ruleCount");
const summary = document.querySelector("#summary");
const form = document.querySelector("#ruleForm");
const languageSelect = document.querySelector("#languageSelect");
const fields = {
  id: document.querySelector("#ruleId"),
  enabled: document.querySelector("#enabled"),
  name: document.querySelector("#name"),
  type: document.querySelector("#type"),
  usageLimitMinutes: document.querySelector("#usageLimitMinutes"),
  cooldownMinutes: document.querySelector("#cooldownMinutes"),
  action: document.querySelector("#action"),
  domains: document.querySelector("#domains"),
  keywords: document.querySelector("#keywords")
};
const keywordsField = document.querySelector("#keywordsField");
const typeHint = document.querySelector("#typeHint");

let rules = [];
let selectedId = "";
let cooldowns = {};
let globalCooldownRemaining = 0;
let formDirty = false;
let renderingForm = false;
let language = "en";

function t(key, replacements = {}) {
  const template = I18N[language]?.[key] || I18N.en[key] || key;
  return Object.entries(replacements).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  );
}

async function loadLanguage() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.LANGUAGE);
  language = data[STORAGE_KEYS.LANGUAGE] === "zh" ? "zh" : "en";
  languageSelect.value = language;
  applyStaticText();
}

function applyStaticText() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = t("documentTitle");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  updateTypeHint();
}

function parseLines(value) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatLines(items) {
  return (items || []).join("\n");
}

function formatMinutes(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : String(number).replace(/0+$/, "").replace(/\.$/, "");
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function newRuleTemplate() {
  return {
    id: crypto.randomUUID(),
    enabled: false,
    name: t("newRuleName"),
    type: "domain",
    domains: [],
    keywords: [],
    usageLimitMinutes: 10,
    cooldownMinutes: 5,
    action: "close",
    createdAt: Date.now()
  };
}

function selectedRule() {
  return rules.find((rule) => rule.id === selectedId) || rules[0] || null;
}

async function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

async function load(options = {}) {
  const status = await sendMessage({ type: "GET_STATUS" });
  cooldowns = status.cooldowns || {};
  globalCooldownRemaining = Number(status.globalCooldownRemaining || 0);

  if (!formDirty || options.force) {
    rules = status.rules || [];
    if (!selectedId || !rules.some((rule) => rule.id === selectedId)) {
      selectedId = rules[0]?.id || "";
    }
    render();
    return;
  }

  renderList();
  renderSummary();
}

async function saveAll() {
  formDirty = false;
  await sendMessage({ type: "SAVE_RULES", rules });
  await load({ force: true });
  formDirty = false;
}

function render() {
  applyStaticText();
  renderList();
  renderForm();
  renderSummary();
}

function renderSummary() {
  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const cooldownText = globalCooldownRemaining > 0
    ? t("globalCooldown", { time: formatRemaining(globalCooldownRemaining) })
    : "";
  summary.textContent = t("summary", {
    enabled: enabledCount,
    total: rules.length,
    cooldown: cooldownText
  });
}

function renderList() {
  ruleList.textContent = "";
  ruleCount.textContent = language === "zh" ? `${rules.length} ${t("ruleUnit")}` : `${rules.length} ${t("ruleUnit")}`;

  for (const rule of rules) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `rule-card ${rule.id === selectedId ? "selected" : ""}`;
    button.addEventListener("click", () => {
      selectedId = rule.id;
      render();
    });

    const title = document.createElement("strong");
    title.textContent = rule.name;
    const meta = document.createElement("span");
    meta.textContent = [
      rule.enabled ? t("enabled") : t("disabled"),
      rule.type === "domain" ? t("domain") : t("keyword"),
      rule.action === "close" ? t("closeTabs") : t("blockedPage")
    ].join(" · ");

    const target = document.createElement("small");
    if (rule.type === "domain") {
      target.textContent = (rule.domains || []).join(", ") || t("noDomains");
    } else {
      const domainText = (rule.domains || []).join(", ") || t("allSites");
      const keywordText = (rule.keywords || []).slice(0, 4).join(", ") || t("noKeywords");
      target.textContent = `${domainText} · ${keywordText}`;
    }

    const cooldown = Number(cooldowns[rule.id] || 0);
    if (cooldown > 0) {
      const pill = document.createElement("em");
      pill.textContent = `${t("locked")} ${formatRemaining(cooldown)}`;
      button.append(title, meta, target, pill);
    } else {
      button.append(title, meta, target);
    }

    ruleList.append(button);
  }
}

function renderForm() {
  const rule = selectedRule();
  if (!rule) {
    renderingForm = true;
    form.reset();
    fields.id.value = "";
    renderingForm = false;
    return;
  }

  renderingForm = true;
  fields.id.value = rule.id;
  fields.enabled.checked = Boolean(rule.enabled);
  fields.name.value = rule.name || "";
  fields.type.value = rule.type || "domain";
  fields.usageLimitMinutes.value = formatMinutes(rule.usageLimitMinutes || 10);
  fields.cooldownMinutes.value = formatMinutes(rule.cooldownMinutes || 5);
  fields.action.value = rule.action || "close";
  fields.domains.value = formatLines(rule.domains || []);
  fields.keywords.value = formatLines(rule.keywords || []);
  updateTypeHint();
  renderingForm = false;
}

function updateTypeHint() {
  const type = fields.type.value;
  keywordsField.hidden = type !== "keyword";
  typeHint.textContent = type === "domain" ? t("domainHint") : t("keywordHint");
}

function readFormRule() {
  const existing = selectedRule() || newRuleTemplate();
  const usage = Number(fields.usageLimitMinutes.value);
  const cooldown = Number(fields.cooldownMinutes.value);
  return {
    ...existing,
    id: fields.id.value || existing.id || crypto.randomUUID(),
    enabled: fields.enabled.checked,
    name: fields.name.value.trim() || t("untitledRule"),
    type: fields.type.value,
    domains: parseLines(fields.domains.value),
    keywords: parseLines(fields.keywords.value),
    usageLimitMinutes: Number.isFinite(usage) && usage > 0 ? usage : 10,
    cooldownMinutes: Number.isFinite(cooldown) && cooldown > 0 ? cooldown : 5,
    action: fields.action.value,
    createdAt: existing.createdAt || Date.now()
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveCurrentRule();
});

async function saveCurrentRule() {
  const nextRule = readFormRule();
  const index = rules.findIndex((rule) => rule.id === nextRule.id);
  if (index >= 0) {
    rules[index] = nextRule;
  } else {
    rules.push(nextRule);
  }
  selectedId = nextRule.id;
  await saveAll();
}

function markFormDirty() {
  if (!renderingForm) formDirty = true;
}

form.addEventListener("input", markFormDirty);
form.addEventListener("change", markFormDirty);

languageSelect.addEventListener("change", async () => {
  language = languageSelect.value === "zh" ? "zh" : "en";
  await chrome.storage.local.set({ [STORAGE_KEYS.LANGUAGE]: language });
  render();
});

fields.type.addEventListener("change", updateTypeHint);

fields.enabled.addEventListener("change", async () => {
  markFormDirty();
  await saveCurrentRule();
});

document.querySelector("#newRuleButton").addEventListener("click", () => {
  const rule = newRuleTemplate();
  rules.push(rule);
  selectedId = rule.id;
  formDirty = true;
  render();
});

document.querySelector("#duplicateButton").addEventListener("click", () => {
  const rule = selectedRule();
  if (!rule) return;
  const copy = {
    ...rule,
    id: crypto.randomUUID(),
    enabled: false,
    name: `${rule.name} ${t("copySuffix")}`,
    createdAt: Date.now()
  };
  rules.push(copy);
  selectedId = copy.id;
  formDirty = true;
  render();
});

document.querySelector("#deleteButton").addEventListener("click", async () => {
  const rule = selectedRule();
  if (!rule) return;
  if (!confirm(t("deleteConfirm", { name: rule.name }))) return;
  rules = rules.filter((item) => item.id !== rule.id);
  selectedId = rules[0]?.id || "";
  await saveAll();
});

document.querySelector("#rescanButton").addEventListener("click", async () => {
  await sendMessage({ type: "RESCAN" });
  await load({ force: !formDirty });
});

loadLanguage().then(load);
setInterval(load, 5000);
