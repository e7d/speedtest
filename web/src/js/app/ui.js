import STEP from "../worker/step";

class UIService {
    constructor() {
        this.page = "home";

        this.$html = document.querySelector("html");
        this.$body = document.querySelector("body");

        // Top navigation bar
        this.$titleLink = document.querySelector("h1 a");
        this.$commands = document.querySelector("#commands");
        this.$showAboutButton = this.$commands.querySelector(
            "button#show-about"
        );
        this.$resultsHistoryButton = this.$commands.querySelector(
            "button#results-history"
        );
        this.$showSettingsButton = this.$commands.querySelector(
            "button#show-settings"
        );

        // Alerts
        this.$httpsAlert = document.querySelector("#https-alert");
        this.$httpsAlertMessage = this.$httpsAlert.querySelector(".message");
        this.$ieAlert = document.querySelector("#ie-alert");
        this.$closeButtons = document.querySelectorAll("button.close");

        // About page
        this.$about = document.querySelector("#about");

        // Settings page
        this.$settings = document.querySelector("#settings");
        this.$settingsForm = this.$settings.querySelector("form");

        // History page
        this.$history = document.querySelector("#history");
        this.$resultsHistory = this.$history.querySelector("table tbody");
        this.$eraseHistoryButton = this.$history.querySelector(
            "#erase-history"
        );

        // Share page
        this.$share = document.querySelector("#share");
        this.$shareResultsLink = this.$share.querySelector(
            "#share-results-link"
        );
        this.$shareResultsLinkCopyButton = this.$share.querySelector(
            "#share-results-link-copy"
        );
        this.$shareResultsImage = this.$share.querySelector(
            "#share-results-image"
        );

        // SpeedTest page
        this.$speedtest = document.querySelector("#speedtest");
        this.$shareResultsButton = this.$speedtest.querySelector(
            "button#share-results"
        );
        this.$startButton = this.$speedtest.querySelector("button#start");
        this.$stopButton = this.$speedtest.querySelector("button#stop");
        this.$results = this.$speedtest.querySelectorAll(".result");
        this.$ipValue = this.$speedtest.querySelector("#ip .value");
        this.$asnValue = this.$speedtest.querySelector("#ip .asn");
        this.$latencyResult = this.$speedtest.querySelector("#latency");
        this.$latencyValue = this.$latencyResult.querySelector(".value");
        this.$jitterResult = this.$speedtest.querySelector("#jitter");
        this.$jitterValue = this.$jitterResult.querySelector(".value");
        this.$downloadResult = this.$speedtest.querySelector("#download");
        this.$downloadValue = this.$downloadResult.querySelector(".value");
        this.$uploadResult = this.$speedtest.querySelector("#upload");
        this.$uploadValue = this.$uploadResult.querySelector(".value");
        this.$progress = this.$speedtest.querySelector("#progress");
        this.$progressBar = this.$speedtest.querySelector(
            "#progress .progress-bar"
        );

        // Footer
        this.$credits = document.querySelector("#credits");

        this.attachEventHandlers();
    }

    /**
     * Attach event handlers to the UI
     */
    attachEventHandlers() {
        this.$eraseHistoryButton.addEventListener(
            "click",
            this.eraseHistoryButtonClickHandler.bind(this)
        );
    }

    /**
     * Attach event handlers to the UI
     */
    attachEventHandlers() {
        this.$titleLink.addEventListener(
            "click",
            this.titleLinkClickHandler.bind(this)
        );
        this.$showAboutButton.addEventListener(
            "click",
            this.showAboutButtonClickHandler.bind(this)
        );
        this.$shareResultsButton.addEventListener(
            "click",
            this.shareResultsButtonClickHandler.bind(this)
        );
        this.$resultsHistoryButton.addEventListener(
            "click",
            this.resultsHistoryButtonClickHandler.bind(this)
        );
        this.$showSettingsButton.addEventListener(
            "click",
            this.showSettingsButtonClickHandler.bind(this)
        );
        this.$startButton.addEventListener(
            "click",
            this.startButtonClickHandler.bind(this)
        );
        this.$stopButton.addEventListener(
            "click",
            this.stopButtonClickHandler.bind(this)
        );
        this.$closeButtons.forEach($closeButton =>
            $closeButton.addEventListener(
                "click",
                this.alertCloseButtonClickHandler.bind(this)
            )
        );
    }

    /**
     * Navigate back to home on title click
     */
    titleLinkClickHandler(e) {
        e.preventDefault();
        window.history.pushState({}, "Speed Test", `/`);
        window.dispatchEvent(new Event("popstate"));
    }

    /**
     * Shows the information page
     */
    showAboutButtonClickHandler() {
        window.history.pushState({}, "Speed Test - About", `/about`);
        window.dispatchEvent(new Event("popstate"));
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

    /**
     * Changes the color theme, light or dark.
     *
     * @param {String} theme
     */
    changeTheme(theme = "light") {
        this.$html.classList[theme === "dark" ? "add" : "remove"]("dark");
    }

    /**
     * Changes the current displayed page.
     *
     * @param {String} page
     */
    showPage(page) {
        this.page = page;

        this.$about.setAttribute("hidden", "");
        this.$settings.setAttribute("hidden", "");
        this.$history.setAttribute("hidden", "");
        this.$share.setAttribute("hidden", "");
        this.$speedtest.setAttribute("hidden", "");
        this[`$${page}`].removeAttribute("hidden");
    }

    /**
     * Reset the current results.
     */
    clearResults() {
        this.$ipValue.innerHTML = "";
        this.$latencyValue.innerHTML = "";
        this.$jitterValue.innerHTML = "";
        this.$downloadValue.innerHTML = "";
        this.$uploadValue.innerHTML = "";
    }

    /**
     * Resets the highlighted step.
     */
    resetHiglightStep() {
        this.$results.forEach(elem => elem.classList.remove("active"));
    }

    /**
     * Highlights the current running step.
     *
     * @param {String} step
     */
    highlightStep(step) {
        if (this.previousStep === step) {
            return;
        }
        this.previousStep = step;

        this.resetHiglightStep();

        switch (step) {
            case STEP.LATENCY:
                this.$latencyResult.classList.add("active");
                this.$jitterResult.classList.add("active");
                break;
            case STEP.DOWNLOAD:
                this.$downloadResult.classList.add("active");
                break;
            case STEP.UPLOAD:
                this.$uploadResult.classList.add("active");
                break;
        }
    }

    /**
     * Set a value on the progress bar
     *
     * @param {Number} progress
     * @param {String} step
     */
    setProgressBar(progress, step = "") {
        this.$progress.style.flexDirection =
            step === STEP.DOWNLOAD ? "row-reverse" : "row";
        this.$progressBar.style.width = progress * 100 + "%";
    }
}

export let UI = new UIService();
