import UI from "./app/ui"
import SpeedTest from "./app/speedtest";
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
        this.ui = new UI();

        this.speedtest = new SpeedTest(this.ui);
        this.share = new Share(this.ui);
        this.history = new History(this.ui);

        this.attachEventHandlers();

        window.addEventListener("popstate", () => {
            this.speedtest.stopTest(true);

            switch (document.location.pathname) {
                case "/result":
                    this.ui.showPage("speedtest");
                    this.speedtest.loadResultsFromUri();
                    break;

                case "/results":
                    this.ui.showPage("history");
                    this.history.loadResultsHistory();
                    break;

                case "/run":
                    this.ui.showPage("speedtest");
                    this.speedtest.startTest();
                    break;

                case "/share":
                    this.ui.showPage("share");
                    this.speedtest.loadResultsFromUri();
                    this.share.generateShareResultsLinks();
                    break;

                default:
                    this.ui.showPage("speedtest");
                    break;
            }
        });
        window.dispatchEvent(new Event("popstate"));
    }

    /**
     * Attach event handlers to the UI
     */
    attachEventHandlers() {
        this.ui.$shareResultsButton.addEventListener(
            "click",
            this.shareResultsButtonClickHandler.bind(this)
        );
        this.ui.$resultsHistoryButton.addEventListener(
            "click",
            this.resultsHistoryButtonClickHandler.bind(this)
        );
        this.ui.$startButton.addEventListener(
            "click",
            this.startButtonClickHandler.bind(this)
        );
        this.ui.$stopButton.addEventListener(
            "click",
            this.stopButtonClickHandler.bind(this)
        );
        this.ui.$closeButtons.forEach($closeButton =>
            $closeButton.addEventListener(
                "click",
                this.alertCloseButtonClickHandler.bind(this)
            )
        );
        this.ui.$shareResultsLink.addEventListener(
            "click",
            this.shareResultsLinkClickHandler.bind(this)
        );
        this.ui.$shareResultsLinkCopyButton.addEventListener(
            "click",
            this.shareResultsLinkCopyButtonClickHandler.bind(this)
        );
    }

    /**
     * Prepare the share results button with a PNG image
     */
    shareResultsButtonClickHandler() {
        this.share.generateShareResultsLinks();
        this.ui.showPage("share");
        window.history.pushState(
            {},
            "Speed Test - Share Results",
            `/share${window.location.hash}`
        );
    }

    /**
     * Toggle history results
     */
    resultsHistoryButtonClickHandler() {
        this.speedtest.stopTest();
        this.ui.clearResults();

        this.history.loadResultsHistory();
        this.ui.showPage("history");
        window.history.pushState({}, "Speed Test - Results", "/results");
    }

    /**
     * Launch a speed test on "Start" button click
     */
    startButtonClickHandler() {
        this.ui.showPage("speedtest");
        window.history.pushState({}, "Speed Test - Running...", "/run");
        this.speedtest.startTest();
    }

    /**
     * Abort the running speed test on "Stop" button click
     */
    stopButtonClickHandler() {
        this.ui.showPage("speedtest");
        window.history.pushState({}, "Speed Test", "/");
        this.speedtest.stopTest();
    }

    /**
     * Close alert boxes on "×" button click
     *
     * @param {MouseEvent} e
     */
    alertCloseButtonClickHandler(e) {
        e.target.parentElement.setAttribute("hidden", "");
    }

    /**
     * Select the share result link on text input click
     */
    shareResultsLinkClickHandler() {
        this.ui.$shareResultsLink.select();
    }

    /**
     * Select and copy the share result link on "Copy" button click
     */
    shareResultsLinkCopyButtonClickHandler() {
        this.ui.$shareResultsLink.select();
        document.execCommand("copy");
    }
}
