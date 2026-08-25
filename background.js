const STORAGE_KEYS = {
  RULES: "rules",
  RUNTIME: "runtimeState"
};

const DEFAULT_RULES = [
  {
    id: "sample-bilibili",
    enabled: false,
    name: "Bilibili",
    type: "domain",
    domains: ["bilibili.com"],
    keywords: [],
    usageLimitMinutes: 10,
    cooldownMinutes: 5,
    action: "close",
    createdAt: 1
  },
  {
    id: "sample-youtube",
    enabled: false,
    name: "YouTube",
    type: "domain",
    domains: ["youtube.com", "youtu.be"],
    keywords: [],
    usageLimitMinutes: 10,
    cooldownMinutes: 5,
    action: "close",
    createdAt: 2
  },
  {
    id: "sample-chatgpt-keywords",
    enabled: false,
    name: "ChatGPT 关键词",
    type: "keyword",
    domains: ["chatgpt.com", "chat.openai.com"],
    keywords: ["游戏", "娱乐", "小说", "摸鱼"],
    usageLimitMinutes: 10,
    cooldownMinutes: 5,
    action: "redirect",
    createdAt: 3
  }
];

const DEFAULT_RUNTIME = {
  globalCooldownUntil: 0,
  rules: {},
  tabs: {}
};

let cachedRules = null;
let cachedRuntime = null;

function now() {
  return Date.now();
}

function normalizeDomain(input) {
  const value = String(input || "").trim().toLowerCase();
  if (!value) return "";

  try {
    const withProtocol = value.includes("://") ? value : `https://${value}`;
    const url = new URL(withProtocol);
    return url.hostname.replace(/^www\./, "");
  } catch (_error) {
    return value
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(":")[0]
      .trim();
  }
}

function normalizeRule(raw) {
  const type = raw.type === "keyword" ? "keyword" : "domain";
  const action = raw.action === "redirect" ? "redirect" : "close";
  return {
    id: String(raw.id || crypto.randomUUID()),
    enabled: Boolean(raw.enabled),
    name: String(raw.name || "Untitled rule").trim() || "Untitled rule",
    type,
    domains: Array.isArray(raw.domains)
      ? raw.domains.map(normalizeDomain).filter(Boolean)
      : [],
    keywords: Array.isArray(raw.keywords)
      ? raw.keywords.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
    usageLimitMinutes: Math.max(0.05, Number(raw.usageLimitMinutes || 10)),
    cooldownMinutes: Math.max(0.05, Number(raw.cooldownMinutes || 5)),
    action,
    createdAt: Number(raw.createdAt || Date.now())
  };
}

async function getRules() {
  if (cachedRules) return cachedRules;
  const data = await chrome.storage.local.get(STORAGE_KEYS.RULES);
  let rules = data[STORAGE_KEYS.RULES];
  if (!Array.isArray(rules)) {
    rules = DEFAULT_RULES;
    await chrome.storage.local.set({ [STORAGE_KEYS.RULES]: rules });
  }
  cachedRules = rules.map(normalizeRule).sort((a, b) => a.createdAt - b.createdAt);
  return cachedRules;
}

async function saveRules(rules) {
  cachedRules = rules.map(normalizeRule).sort((a, b) => a.createdAt - b.createdAt);
  await chrome.storage.local.set({ [STORAGE_KEYS.RULES]: cachedRules });
  await rescanAllTabs();
}

async function getRuntime() {
  if (cachedRuntime) return cachedRuntime;
  const data = await chrome.storage.local.get(STORAGE_KEYS.RUNTIME);
  const runtime = data[STORAGE_KEYS.RUNTIME] || DEFAULT_RUNTIME;
  cachedRuntime = {
    globalCooldownUntil: Number(runtime.globalCooldownUntil || 0),
    rules: runtime.rules && typeof runtime.rules === "object" ? runtime.rules : {},
    tabs: runtime.tabs && typeof runtime.tabs === "object" ? runtime.tabs : {}
  };
  return cachedRuntime;
}

async function saveRuntime() {
  if (!cachedRuntime) return;
  await chrome.storage.local.set({ [STORAGE_KEYS.RUNTIME]: cachedRuntime });
}

function isWebUrl(url) {
  return /^https?:\/\//i.test(String(url || ""));
}

function getHost(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch (_error) {
    return "";
  }
}

function hostMatchesDomain(host, domain) {
  const cleanHost = normalizeDomain(host);
  const cleanDomain = normalizeDomain(domain);
  return cleanHost === cleanDomain || cleanHost.endsWith(`.${cleanDomain}`);
}

function domainScopeMatches(rule, url) {
  if (!isWebUrl(url)) return false;
  if (!rule.domains.length) return rule.type === "keyword";
  const host = getHost(url);
  return rule.domains.some((domain) => hostMatchesDomain(host, domain));
}

function keywordMatches(rule, snapshot) {
  if (!rule.keywords.length) return false;
  const haystack = [
    snapshot.url || "",
    snapshot.title || "",
    snapshot.text || ""
  ].join("\n").toLowerCase();
  return rule.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function ruleMatches(rule, snapshot) {
  if (!rule.enabled) return false;
  if (!domainScopeMatches(rule, snapshot.url)) return false;
  if (rule.type === "domain") return true;
  return keywordMatches(rule, snapshot);
}

function alarmNameForTab(tabId) {
  return `limit-tab-${tabId}`;
}

async function clearTabState(tabId) {
  const runtime = await getRuntime();
  delete runtime.tabs[String(tabId)];
  await chrome.alarms.clear(alarmNameForTab(tabId));
  await saveRuntime();
}

async function scheduleLimitAlarm(tabId, whenMs) {
  await chrome.alarms.clear(alarmNameForTab(tabId));
  chrome.alarms.create(alarmNameForTab(tabId), { when: Math.max(Date.now() + 1000, whenMs) });
}

async function getContentSnapshot(tabId, tab) {
  const fallback = {
    url: tab?.url || "",
    title: tab?.title || "",
    text: ""
  };

  if (!isWebUrl(fallback.url)) return fallback;

  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "GET_PAGE_SNAPSHOT" });
    if (response && response.url) return response;
  } catch (_error) {
    return fallback;
  }

  return fallback;
}

async function applyRuleAction(tabId, rule, reason) {
  await clearTabState(tabId);
  if (rule.action === "redirect") {
    const url = chrome.runtime.getURL(
      `blocked.html?rule=${encodeURIComponent(rule.name)}&reason=${encodeURIComponent(reason)}`
    );
    try {
      await chrome.tabs.update(tabId, { url });
    } catch (_error) {
      // The tab may have already been closed or navigated away.
    }
    return;
  }

  try {
    await chrome.tabs.remove(tabId);
  } catch (_error) {
    // The tab may have already been closed.
  }
}

async function enforceTab(tabId, snapshot) {
  if (!isWebUrl(snapshot.url)) {
    await clearTabState(tabId);
    return;
  }

  const rules = await getRules();
  const runtime = await getRuntime();
  const currentTime = now();
  const tabKey = String(tabId);
  const globalCooldownUntil = Number(runtime.globalCooldownUntil || 0);

  for (const rule of rules) {
    if (!ruleMatches(rule, snapshot)) continue;

    const ruleState = runtime.rules[rule.id] || {};
    const ruleCooldownUntil = Number(ruleState.cooldownUntil || 0);
    const cooldownUntil = Math.max(globalCooldownUntil, ruleCooldownUntil);
    if (cooldownUntil > currentTime) {
      runtime.tabs[tabKey] = {
        ruleId: rule.id,
        startedAt: null,
        lastUrl: snapshot.url,
        lastTitle: snapshot.title || "",
        lockedAt: currentTime
      };
      await saveRuntime();
      await applyRuleAction(tabId, rule, "cooldown");
      return;
    }

    if (globalCooldownUntil && globalCooldownUntil <= currentTime) {
      runtime.globalCooldownUntil = 0;
    }

    if (ruleCooldownUntil && ruleCooldownUntil <= currentTime) {
      runtime.rules[rule.id] = { cooldownUntil: 0 };
    }

    const previous = runtime.tabs[tabKey];
    let startedAt = currentTime;
    if (previous && previous.ruleId === rule.id && Number(previous.startedAt)) {
      startedAt = Number(previous.startedAt);
    }

    const limitMs = Math.max(3000, rule.usageLimitMinutes * 60 * 1000);
    const elapsed = currentTime - startedAt;
    if (elapsed >= limitMs) {
      runtime.globalCooldownUntil = currentTime + Math.max(3000, rule.cooldownMinutes * 60 * 1000);
      runtime.tabs[tabKey] = {
        ruleId: rule.id,
        startedAt: null,
        lastUrl: snapshot.url,
        lastTitle: snapshot.title || "",
        lockedAt: currentTime
      };
      await saveRuntime();
      await applyRuleAction(tabId, rule, "limit");
      await rescanAllTabs();
      return;
    }

    runtime.tabs[tabKey] = {
      ruleId: rule.id,
      startedAt,
      lastUrl: snapshot.url,
      lastTitle: snapshot.title || "",
      lastSeenAt: currentTime
    };
    await saveRuntime();
    await scheduleLimitAlarm(tabId, startedAt + limitMs);
    return;
  }

  if (runtime.tabs[tabKey]) {
    delete runtime.tabs[tabKey];
    await chrome.alarms.clear(alarmNameForTab(tabId));
    await saveRuntime();
  }
}

async function enforceTabFromBrowser(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const snapshot = await getContentSnapshot(tabId, tab);
    await enforceTab(tabId, snapshot);
  } catch (_error) {
    await clearTabState(tabId);
  }
}

async function rescanAllTabs() {
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  } catch (_error) {
    return;
  }

  await Promise.allSettled(
    tabs
      .filter((tab) => tab.id !== undefined)
      .map((tab) => enforceTabFromBrowser(tab.id))
  );
}

async function getStatus() {
  const rules = await getRules();
  const runtime = await getRuntime();
  const currentTime = now();
  const tabStates = Object.values(runtime.tabs || {});
  const globalCooldownUntil = Number(runtime.globalCooldownUntil || 0);
  return {
    rules,
    runtime,
    activeLimitedTabs: tabStates.filter((item) => item && item.startedAt).length,
    cooldowns: Object.fromEntries(
      rules.map((rule) => {
        const ruleCooldownUntil = Number(runtime.rules?.[rule.id]?.cooldownUntil || 0);
        const cooldownUntil = Math.max(globalCooldownUntil, ruleCooldownUntil);
        return [rule.id, Math.max(0, cooldownUntil - currentTime)];
      })
    ),
    globalCooldownRemaining: Math.max(0, globalCooldownUntil - currentTime)
  };
}

chrome.runtime.onInstalled.addListener(async () => {
  await getRules();
  await getRuntime();
  await rescanAllTabs();
});

chrome.runtime.onStartup.addListener(async () => {
  await getRules();
  await getRuntime();
  await rescanAllTabs();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes[STORAGE_KEYS.RULES]) cachedRules = null;
  if (changes[STORAGE_KEYS.RUNTIME]) cachedRuntime = null;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title || changeInfo.status === "complete") {
    const snapshot = {
      url: tab.url || "",
      title: tab.title || "",
      text: ""
    };
    enforceTab(tabId, snapshot);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  clearTabState(tabId);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith("limit-tab-")) return;
  const tabId = Number(alarm.name.replace("limit-tab-", ""));
  if (Number.isFinite(tabId)) enforceTabFromBrowser(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PAGE_SNAPSHOT" && sender.tab?.id !== undefined) {
    enforceTab(sender.tab.id, {
      url: message.url || sender.tab.url || "",
      title: message.title || sender.tab.title || "",
      text: message.text || ""
    });
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "GET_RULES") {
    getRules().then((rules) => sendResponse({ ok: true, rules }));
    return true;
  }

  if (message?.type === "SAVE_RULES") {
    saveRules(message.rules || []).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "GET_STATUS") {
    getStatus().then((status) => sendResponse({ ok: true, ...status }));
    return true;
  }

  if (message?.type === "RESCAN") {
    rescanAllTabs().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "RESCAN_TAB") {
    enforceTabFromBrowser(Number(message.tabId)).then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
