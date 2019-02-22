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
    UI.$saveConfirmation.classList.add("fade", "in");
    this.fadeInOutTimeout = window.setTimeout(() => UI.$saveConfirmation.classList.remove("in"), 2000);
  }
}
