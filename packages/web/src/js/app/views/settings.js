import Preset from "../preset";
import { UI } from "../ui";
import UserSettings from "../userSettings";

export default class SettingsView {
  constructor() {
    this.userSettings = new UserSettings();
    this.applySettings();

    this.attachEventHandlers();
  }

  /**
   * Attach event handlers to the UI
   */
  attachEventHandlers() {
    UI.$settingsForm.addEventListener("submit", this.settingsFormSubmitHandler.bind(this));
  }

  /**
   * Handle the posted form
   * @param {HtmlFormEvent} e
   */
  settingsFormSubmitHandler(e) {
    e.preventDefault();
    this.processFormData(new FormData(e.target));
  }

  /**
   * Process the data posted through the form
   * @param {FormData} formData
   */
  processFormData(formData) {
    this.userSettings.data = {};
    for (let [key, value] of formData.entries()) {
      this.userSettings.data[key] = value;
    }
    this.userSettings.save();
    this.applySettings();
  }

  /**
   * Apply current user settings
   */
  applySettings() {
    for (let key in this.userSettings.data) {
      if (!UI.$settingsForm[key]) continue;
      UI.$settingsForm[key].value = this.userSettings.data[key];
    }

    this.applyPreset(this.userSettings.data.preset);
    this.useEndpoint(this.userSettings.data.server);
    UI.changeTheme(this.userSettings.data.theme);
  }

  /**
   * Apply current user selected preset
   */
  applyPreset(preset) {
    this.userSettings.data = {
      ...this.userSettings.data,
      ...Preset[preset || "normal"]
    };
  }

  useEndpoint(uri) {
    if (!uri) return;
    const [protocol, host] = uri.split("//");
    this.userSettings.data["config.endpoint"] = { isSecure: protocol === "https:", host };
  }
}
