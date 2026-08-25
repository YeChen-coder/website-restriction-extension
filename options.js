const ruleList = document.querySelector("#ruleList");
const ruleCount = document.querySelector("#ruleCount");
const summary = document.querySelector("#summary");
const form = document.querySelector("#ruleForm");
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
    name: "新规则",
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
  renderList();
  renderForm();
  renderSummary();
}

function renderSummary() {
  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const cooldownText = globalCooldownRemaining > 0
    ? `整体锁定剩余 ${formatRemaining(globalCooldownRemaining)}。`
    : "";
  summary.textContent = `只限制命中的标签页，不关闭浏览器和其他标签页。当前 ${enabledCount}/${rules.length} 条规则启用。${cooldownText}`;
}

function renderList() {
  ruleList.textContent = "";
  ruleCount.textContent = `${rules.length} 条`;

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
      rule.enabled ? "启用" : "停用",
      rule.type === "domain" ? "域名" : "关键词",
      rule.action === "close" ? "关闭标签页" : "锁定页"
    ].join(" · ");

    const target = document.createElement("small");
    if (rule.type === "domain") {
      target.textContent = (rule.domains || []).join(", ") || "未设置域名";
    } else {
      const domainText = (rule.domains || []).join(", ") || "所有网站";
      const keywordText = (rule.keywords || []).slice(0, 4).join(", ") || "未设置关键词";
      target.textContent = `${domainText} · ${keywordText}`;
    }

    const cooldown = Number(cooldowns[rule.id] || 0);
    if (cooldown > 0) {
      const pill = document.createElement("em");
      pill.textContent = `锁定 ${formatRemaining(cooldown)}`;
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
  typeHint.textContent = type === "domain"
    ? "域名规则会匹配该域名和它的子域名，例如 bilibili.com 会匹配 www.bilibili.com。"
    : "关键词规则只在适用域名内生效，并匹配 URL、页面标题、页面可见文本。适合 ChatGPT 的部分聊天限制。";
}

function readFormRule() {
  const existing = selectedRule() || newRuleTemplate();
  const usage = Number(fields.usageLimitMinutes.value);
  const cooldown = Number(fields.cooldownMinutes.value);
  return {
    ...existing,
    id: fields.id.value || existing.id || crypto.randomUUID(),
    enabled: fields.enabled.checked,
    name: fields.name.value.trim() || "未命名规则",
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
    name: `${rule.name} 副本`,
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
  if (!confirm(`删除「${rule.name}」？`)) return;
  rules = rules.filter((item) => item.id !== rule.id);
  selectedId = rules[0]?.id || "";
  await saveAll();
});

document.querySelector("#rescanButton").addEventListener("click", async () => {
  await sendMessage({ type: "RESCAN" });
  await load({ force: !formDirty });
});

load();
setInterval(load, 5000);
