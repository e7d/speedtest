import { UI } from "./app/ui";
import SpeedTest from "./app/speedtest";
import Settings from "./app/settings";
import Share from "./app/share";
import History from "./app/history";

/**
 * Speed Test web UI
 *
 * @class WebUI
 */
export default class WebUI {
    /**
     * Create an instance of WebUI.
     */
    constructor() {
        this.speedtest = new SpeedTest();
        this.settings = new Settings();
        this.share = new Share();
        this.history = new History();

        this.attachEventHandlers();

        window.addEventListener("popstate", () => {
            this.speedtest.stopTest(true);

            switch (document.location.pathname) {
                case "/result":
                    UI.showPage("speedtest");
                    this.speedtest.loadResultsFromUri();
                    break;

                case "/results":
                    UI.showPage("history");
                    this.history.loadResultsHistory();
                    break;

                case "/run":
                    UI.showPage("speedtest");
                    this.speedtest.startTest();
                    break;

                case "/settings":
                    UI.showPage("settings");
                    break;

                case "/share":
                    UI.showPage("share");
                    this.speedtest.loadResultsFromUri();
                    this.share.generateShareResultsLinks();
                    break;

                default:
                    UI.showPage("speedtest");
                    break;
            }
        });
        window.dispatchEvent(new Event("popstate"));
    }

    /**
     * Attach event handlers to the UI
     */
    attachEventHandlers() {
        UI.$shareResultsButton.addEventListener(
            "click",
            this.shareResultsButtonClickHandler.bind(this)
        );
        UI.$resultsHistoryButton.addEventListener(
            "click",
            this.resultsHistoryButtonClickHandler.bind(this)
        );
        UI.$showSettingsButton.addEventListener(
            "click",
            this.showSettingsButtonClickHandler.bind(this)
        );
        UI.$startButton.addEventListener(
            "click",
            this.startButtonClickHandler.bind(this)
        );
        UI.$stopButton.addEventListener(
            "click",
            this.stopButtonClickHandler.bind(this)
        );
        UI.$closeButtons.forEach($closeButton =>
            $closeButton.addEventListener(
                "click",
                this.alertCloseButtonClickHandler.bind(this)
            )
        );
    }

    /**
     * Prepare the share results button with a PNG image
     */
    shareResultsButtonClickHandler() {
        window.history.pushState(
            {},
            "Speed Test - Share Results",
            `/share${window.location.hash}`
        );
        window.dispatchEvent(new Event("popstate"));
    }

    /**
     * Show results history
     */
    resultsHistoryButtonClickHandler() {
        window.history.pushState({}, "Speed Test - Results", "/results");
        window.dispatchEvent(new Event("popstate"));
    }

    /**
     * Show settings
     */
    showSettingsButtonClickHandler() {
        window.history.pushState({}, "Speed Test - Settings", "/settings");
        window.dispatchEvent(new Event("popstate"));
    }

    /**
     * Launch a speed test on "Start" button click
     */
    startButtonClickHandler() {
        window.history.pushState({}, "Speed Test - Running...", "/run");
        window.dispatchEvent(new Event("popstate"));
    }

    /**
     * Abort the running speed test on "Stop" button click
     */
    stopButtonClickHandler() {
        window.history.pushState({}, "Speed Test", "/");
        window.dispatchEvent(new Event("popstate"));
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
