const params = new URLSearchParams(location.search);
const ruleName = params.get("rule") || "某条规则";
const reason = params.get("reason") === "cooldown" ? "仍在锁定期内" : "已达到可运行时间";

document.querySelector("#message").textContent = `「${ruleName}」${reason}。这里只锁定当前标签页，其他标签页不会被关闭。`;
document.querySelector("#openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
