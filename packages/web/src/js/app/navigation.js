import { UI } from "./ui";

export default class Navigation {
  constructor() {
    UI.page = "home";

    this.attachEventHandlers();
  }

  /**
   * Attach event handlers to the UI
   */
  attachEventHandlers() {
    UI.$titleLink.addEventListener("click", this.titleLinkClickHandler.bind(this));
    UI.$showAboutButton.addEventListener("click", this.showAboutButtonClickHandler.bind(this));
    UI.$resultsHistoryButton.addEventListener("click", this.resultsHistoryButtonClickHandler.bind(this));
    UI.$showSettingsButton.addEventListener("click", this.showSettingsButtonClickHandler.bind(this));
    UI.$startButton.addEventListener("click", this.startButtonClickHandler.bind(this));
    UI.$stopButton.addEventListener("click", this.stopButtonClickHandler.bind(this));
    UI.$shareResultButton.addEventListener("click", this.shareResultsButtonClickHandler.bind(this));
    UI.$closeButtons.forEach($closeButton =>
      $closeButton.addEventListener("click", this.alertCloseButtonClickHandler.bind(this))
    );
  }

  pushState(data, title, url) {
    window.history.pushState(data, title, url);
    window.dispatchEvent(new Event("popstate"));
  }

  /**
   * Navigate back to home on title click
   */
  titleLinkClickHandler(e) {
    e.preventDefault();
    this.pushState({}, "Speed Test", "/");
  }

  /**
   * Shows the information page
   */
  showAboutButtonClickHandler(e) {
    e.preventDefault();
    this.pushState({}, "Speed Test - About", "/about");
  }

  /**
   * Show results history
   */
  resultsHistoryButtonClickHandler(e) {
    e.preventDefault();
    this.pushState({}, "Speed Test - Results", "/results");
  }

  /**
   * Show settings
   */
  showSettingsButtonClickHandler(e) {
    e.preventDefault();
    this.pushState({}, "Speed Test - Settings", "/settings");
  }

  /**
   * Launch a speed test on "Start" button click
   */
  startButtonClickHandler() {
    this.pushState({}, "Speed Test - Running...", "/run");
  }

  /**
   * Abort the running speed test on "Stop" button click
   */
  stopButtonClickHandler() {
    this.pushState({}, "Speed Test", "/");
  }

  /**
   * Prepare the share results page
   */
  shareResultsButtonClickHandler() {
    const id = window.location.pathname.split("/").pop();
    this.pushState({}, "Speed Test - Share Results", `/share/${id}`);
  }

  /**
   * Close alert boxes on "×" button click
   * @param {MouseEvent} e
   */
  alertCloseButtonClickHandler(e) {
    e.target.parentElement.setAttribute("hidden", "");
  }
}
