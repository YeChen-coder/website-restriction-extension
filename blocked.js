const STORAGE_KEYS = {
  LANGUAGE: "uiLanguage"
};

const I18N = {
  en: {
    documentTitle: "Page blocked",
    blockedTitle: "Page blocked",
    openOptions: "Open rule settings",
    fallbackRule: "A rule",
    cooldownReason: "is still in its lock period",
    limitReason: "has reached its allowed time",
    message: "{rule} {reason}. Only this tab is blocked; other tabs are not closed."
  },
  zh: {
    documentTitle: "页面已锁定",
    blockedTitle: "页面已锁定",
    openOptions: "打开规则设置",
    fallbackRule: "某条规则",
    cooldownReason: "仍在锁定期内",
    limitReason: "已达到可运行时间",
    message: "「{rule}」{reason}。这里只锁定当前标签页，其他标签页不会被关闭。"
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

async function loadLanguage() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.LANGUAGE);
  language = data[STORAGE_KEYS.LANGUAGE] === "zh" ? "zh" : "en";
  applyText();
}

function applyText() {
  const params = new URLSearchParams(location.search);
  const ruleName = params.get("rule") || t("fallbackRule");
  const reason = params.get("reason") === "cooldown" ? t("cooldownReason") : t("limitReason");

  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = t("documentTitle");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelector("#message").textContent = t("message", { rule: ruleName, reason });
}

document.querySelector("#openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

loadLanguage();
