import { UI } from "./ui";

export default class UserSettings extends EventTarget {
  constructor() {
    if (!UserSettings.instance) {
      super();
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
    endpoints.forEach(endpoint => {
      const value = JSON.stringify(endpoint.value);
      const selected = this.data.server === value ? "selected" : "";
      // ToDo: disable inscure enpoints if browser over https
      const disabled = window.location.protocol === "https:" && !endpoint.value.isSecure ? "disabled" : "";
      const label = endpoint.label;
      UI.$settingsServerSelect.innerHTML += `<option value='${value}' ${selected} ${disabled}>${label}</option>`;
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
