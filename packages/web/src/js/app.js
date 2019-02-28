import { UI } from "./app/ui";
import HistoryPage from "./app/views/history";
import Navigation from "./app/navigation";
import SettingsView from "./app/views/settings";
import ShareView from "./app/views/share";
import SpeedView from "./app/speedtest";

/**
 * Speed Test web UI
 *
 * @class WebUI
 */
export default class WebUI {
  /**
   * Create an instance of WebUI
   */
  constructor() {
    this.navigation = new Navigation();
    this.speedtest = new SpeedView();

    this.historyView = new HistoryPage();
    this.settingsView = new SettingsView();
    this.shareView = new ShareView();

    this.attachStateHandler();
  }

  /**
   * Attach the handler observing history state
   */
  attachStateHandler() {
    window.addEventListener("popstate", () => {
      this.speedtest.stopTest(true);
      UI.$shareResultButton.setAttribute("hidden", "");
      UI.dismissUnknownResultsAlert();

      switch (document.location.pathname) {
      case "/about":
        UI.showPage("about");
        document.title = "Speed Test - About";
        break;

      case "/result":
        UI.showPage("speedtest");
        document.title = "Speed Test - Result";
        this.speedtest.loadResults();
        break;

      case "/results":
        UI.showPage("history");
        document.title = "Speed Test - Results history";
        this.historyView.loadResultsHistory();
        break;

      case "/run":
        UI.showPage("speedtest");
        document.title = "Speed Test - Running...";
        this.speedtest.startTest();
        break;

      case "/settings":
        UI.showPage("settings");
        document.title = "Speed Test - Settings";
        break;

      case "/share":
        UI.showPage("share");
        document.title = "Speed Test - Share result";
        this.shareView.generateShareResult();
        break;

      default:
        UI.showPage("speedtest");
        UI.$speedtest.className = "ready";
        document.title = "Speed Test";
        break;
      }
    });
    window.dispatchEvent(new Event("popstate"));
  }
}
