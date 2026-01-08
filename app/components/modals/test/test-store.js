import { createStore } from "/js/AlpineStore.js";
import { sleep } from "/js/sleep.js";

export const store = createStore("testModal", {
  openedAt: "",
  count: 0,
  message: "Hello from the A0 component system smoke test.",
  busy: false,
  log: [],

  init() {
    this.openedAt = new Date().toISOString();
    this.log.push(`[init] openedAt=${this.openedAt}`);
  },

  increment() {
    this.count += 1;
    this.log.push(`[count] ${this.count}`);
  },

  async demoAsync() {
    if (this.busy) return;
    this.busy = true;
    this.log.push("[async] start");

    // short pause to validate async reactivity
    await sleep(250);

    this.log.push("[async] done");
    this.busy = false;
  },

  cleanup() {
    // Intentionally noisy for validation (remove once the port is stable)
    console.log("[testModal] cleanup");
  },
});


