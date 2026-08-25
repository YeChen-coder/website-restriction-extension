async function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

async function refresh() {
  const status = await sendMessage({ type: "GET_STATUS" });
  const enabled = (status.rules || []).filter((rule) => rule.enabled).length;
  const cooldownMs = Number(status.globalCooldownRemaining || 0);
  const cooldownText = cooldownMs > 0
    ? `整体锁定剩余 ${formatRemaining(cooldownMs)}。`
    : "";
  document.querySelector("#status").textContent =
    `${enabled}/${(status.rules || []).length} 条规则启用，${status.activeLimitedTabs || 0} 个标签页正在计时。${cooldownText}`;
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

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

refresh();
