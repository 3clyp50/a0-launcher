import { createStore } from "/a0ui/js/AlpineStore.js";

export const dockerManagerStore = createStore("dockerManager", {
  loading: false,
  banner: { type: "", message: "" },
  meta: { appVersion: "", contentVersion: "" },
  dockerAvailable: false,
  uiUrl: "",
  error: "",
  environment: null,
  images: [],
  containers: [],
  volumes: [],
  progress: null,
  setBanner(type, message) {
    this.banner = { type: type || "", message: message || "" };
  }
});