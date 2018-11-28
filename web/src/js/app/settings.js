import { UI } from "./ui";

export default class Settings {
    constructor() {
        this.loadSettings();
        this.attachEventHandlers();
    }

    /**
     * Attach event handlers to the UI
     */
    attachEventHandlers() {
        UI.$settingsForm.addEventListener(
            "submit",
            this.settingsFormSubmitHandler.bind(this)
        );
    }

    /**
     * Handle the posted form
     *
     * @param {HtmlFormEvent} e
     */
    settingsFormSubmitHandler(e) {
        this.processFormData(new FormData(e.target));

        e.preventDefault();
    }

    /**
     * Process the data posted through the form
     *
     * @param {FormData} formData
     */
    processFormData(formData) {
        this.settings.theme = formData.get("theme");
        this.saveSettings();
        UI.changeTheme(this.settings.theme);
    }

    /**
     * Load and apply stored settings
     */
    loadSettings() {
        this.settings = JSON.parse(localStorage.getItem("settings")) || {
            theme: "light"
        };
        document.querySelector(
            `[name=theme][value=${this.settings.theme}]`
        ).checked = true;
        UI.changeTheme(this.settings.theme);
    }

    /**
     * Save settings to storage
     */
    saveSettings() {
        localStorage.setItem("settings", JSON.stringify(this.settings));
    }
}
