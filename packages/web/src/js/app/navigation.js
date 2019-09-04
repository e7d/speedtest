import { UI } from "./ui";
import SpeedTest from "./speedtest";
import UserSettings from "./userSettings";
import HistoryPage from "./views/history";
import SettingsView from "./views/settings";
import ShareView from "./views/share";

export default class Navigation {
  constructor() {
    UI.page = "home";
    this.routes = [
      {
        url: "/about",
        handler: this.aboutPageHandler
      },
      {
        url: "/results",
        handler: this.resultsPageHandler
      },
      {
        url: "/run",
        handler: this.runPageHandler
      },
      {
        url: "/settings",
        handler: this.settingsPageHandler
      },
      {
        pattern: /result(\/[0-9a-f-]+)?/,
        handler: this.resultPageHandler
      },
      {
        pattern: /share(\/[0-9a-f-]+)?/,
        handler: this.sharePageHandler
      }
    ];

    this.speedtest = new SpeedTest();
    this.userSettings = new UserSettings();

    this.historyView = new HistoryPage();
    this.settingsView = new SettingsView();
    this.shareView = new ShareView();

    this.attachEventHandlers();
    this.attachStateHandler();
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

  /**
   * Attach the handler observing history state
   */
  attachStateHandler() {
    window.addEventListener("popstate", () => {
      this.pageHandler();
    });
    this.pageHandler();
  }

  pushState(data, title, url) {
    window.history.pushState(data, title, url);
    this.pageHandler();
  }

  pageHandler() {
    if (window.gtag) {
      gtag("config", this.userSettings.analytics.trackingId, { page_path: document.location.pathname });
    }

    UI.$shareResultButton.setAttribute("hidden", "");
    UI.dismissUnknownResultsAlert();

    const hasRoute = this.routes.some(route => {
      if (route.url && document.location.pathname === route.url) {
        route.handler.apply(this);
        return true;
      }
      if (route.pattern && route.pattern.test(document.location.pathname)) {
        route.handler.apply(this);
        return true;
      }
    });
    if (!hasRoute) this.defaultPageHandler();
  }

  defaultPageHandler() {
    UI.showPage("speedtest");
    UI.$speedtest.className = "ready";
    document.title = "Speed Test";
  }

  aboutPageHandler() {
    UI.showPage("about");
    document.title = "Speed Test - About";
  }

  resultPageHandler() {
    UI.showPage("speedtest");
    document.title = "Speed Test - Result";
    this.speedtest.loadResults();
  }

  resultsPageHandler() {
    UI.showPage("history");
    document.title = "Speed Test - Results history";
    this.historyView.loadResultsHistory();
  }

  runPageHandler() {
    UI.showPage("speedtest");
    document.title = "Speed Test - Running...";
    this.speedtest.startTest();
  }

  settingsPageHandler() {
    UI.showPage("settings");
    document.title = "Speed Test - Settings";
  }

  sharePageHandler() {
    UI.showPage("share");
    document.title = "Speed Test - Share result";
    this.shareView.generateShareResult();
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
    this.speedtest.stopTest(true);
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
   *
   * @param {MouseEvent} e
   */
  alertCloseButtonClickHandler(e) {
    e.target.parentElement.setAttribute("hidden", "");
  }
}
