import { UI } from "../ui";
import Preset from "../preset";
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
    UI.$settingsPreset.addEventListener("change", this.settingsPresetChangeHandler.bind(this));
    UI.$testDuration.forEach($testDuration =>
      $testDuration.addEventListener("change", this.testDurationChangeHandler.bind(this))
    );
  }

  /**
   * Handle the posted form
   *
   * @param {HtmlFormEvent} e
   */
  settingsFormSubmitHandler(e) {
    e.preventDefault();
    this.processFormData(new FormData(e.target));
  }

  /**
   * Handle the changed preset
   */
  settingsPresetChangeHandler() {
    const preset = Preset[UI.$settingsForm["preset"].value];
    if (!preset) return;
    for (let field in preset.fields) {
      if (!UI.$settingsForm[field]) continue;
      UI.$settingsForm[field].value = preset.fields[field];
    }
  }

  /**
   * Handle the changed test duration
   */
  testDurationChangeHandler() {
    UI.$settingsForm["preset"].value = "custom";
  }

  /**
   * Process the data posted through the form
   *
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

    UI.changeTheme(this.userSettings.data.theme);
  }
}
