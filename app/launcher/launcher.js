function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value ?? "—";
}

(async () => {
  try {
    const [contentVersion, appVersion] = await Promise.all([
      globalThis.electronAPI?.getContentVersion?.(),
      globalThis.electronAPI?.getAppVersion?.(),
    ]);

    setText("content-version", contentVersion || "unknown");
    setText("app-version", appVersion || "unknown");

    const cv = contentVersion || "unknown";
    const av = appVersion || "unknown";
    setText("version", `App: ${av} · Content: ${cv}`);
  } catch (err) {
    console.warn("Failed to load version info:", err);
    setText("content-version", "unknown");
    setText("app-version", "unknown");
    setText("version", "Version: unknown");
  }
})();


