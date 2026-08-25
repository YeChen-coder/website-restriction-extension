const SNAPSHOT_TEXT_LIMIT = 30000;
const SNAPSHOT_DEBOUNCE_MS = 900;

let snapshotTimer = null;
let lastPayloadKey = "";

function getVisibleText() {
  const text = document.body?.innerText || "";
  return text.replace(/\s+/g, " ").trim().slice(0, SNAPSHOT_TEXT_LIMIT);
}

function buildSnapshot() {
  return {
    type: "PAGE_SNAPSHOT",
    url: location.href,
    title: document.title || "",
    text: getVisibleText()
  };
}

function sendSnapshot(force = false) {
  const payload = buildSnapshot();
  const key = `${payload.url}\n${payload.title}\n${payload.text.slice(0, 2000)}`;
  if (!force && key === lastPayloadKey) return;
  lastPayloadKey = key;

  try {
    chrome.runtime.sendMessage(payload, () => {
      void chrome.runtime.lastError;
    });
  } catch (_error) {
    // The extension may be reloading.
  }
}

function scheduleSnapshot(force = false) {
  clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => sendSnapshot(force), SNAPSHOT_DEBOUNCE_MS);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_PAGE_SNAPSHOT") {
    sendResponse(buildSnapshot());
  }
  return false;
});

sendSnapshot(true);

const observer = new MutationObserver(() => scheduleSnapshot(false));
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true
});

window.addEventListener("popstate", () => scheduleSnapshot(true));
window.addEventListener("hashchange", () => scheduleSnapshot(true));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) scheduleSnapshot(true);
});

let lastLocation = location.href;
setInterval(() => {
  if (location.href !== lastLocation) {
    lastLocation = location.href;
    scheduleSnapshot(true);
  }
}, 1000);
