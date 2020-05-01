import { UI } from "./ui";

export default class UserSettings {
  constructor() {
    if (!UserSettings.instance) {
      UserSettings.instance = this;
      this.load();
    }

    return UserSettings.instance;
  }

  /**
   * Load and apply stored settings
   */
  load() {
    this.data = JSON.parse(localStorage.getItem("settings")) || {};
    this.data.theme = this.data.theme || "dark";
  }

  /**
   * Load and display endpoints from configuration
   * @param {*} endpoints
   */
  loadEndpoints(endpoints) {
    if (!endpoints) return;
    endpoints.forEach(({ label, uri }) => {
      const isSecure = uri.startsWith('https:');
      const selected = this.data.server === uri ? "selected" : "";
      const disabled = window.location.protocol === "https:" && !isSecure ? "disabled" : "";
      UI.$settingsServerSelect.innerHTML += `<option value="${uri}" ${selected} ${disabled}>${label}</option>`;
    });
    UI.$settingsServerField.removeAttribute("hidden");
  }

  /**
   * Save settings to storage
   */
  save() {
    localStorage.setItem("settings", JSON.stringify(this.data));
    this.confirm();
  }

  /**
   * Display the save settings confirmation
   */
  confirm() {
    window.clearTimeout(this.fadeInOutTimeout);
    UI.$saveConfirmation.classList.add("fade");
    this.fadeInOutTimeout = window.setTimeout(() => UI.$saveConfirmation.classList.remove("fade"), 4000);
  }
}
