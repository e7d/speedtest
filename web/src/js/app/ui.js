import STEP from "../worker/step";

export default class UI {
    constructor() {
        this.page = "home";

        this.$html = document.querySelector("html");
        this.$body = document.querySelector("body");

        // Top navigation bar
        this.$commands = document.querySelector("#commands");
        this.$shareResultsButton = this.$commands.querySelector(
            "button#share-results"
        );
        this.$resultsHistoryButton = this.$commands.querySelector(
            "button#results-history"
        );
        this.$showSettingsButton = this.$commands.querySelector(
            "button#show-settings"
        );
        this.$startButton = this.$commands.querySelector("button#start");
        this.$stopButton = this.$commands.querySelector("button#stop");

        // Alerts
        this.$httpsAlert = document.querySelector("#https-alert");
        this.$httpsAlertMessage = document.querySelector(
            "#https-alert .message"
        );
        this.$closeButtons = document.querySelectorAll("button.close");

        // Settings page
        this.$settings = document.querySelector("#settings");
        this.$settingsForm = this.$settings.querySelector("form");

        // History page
        this.$history = document.querySelector("#history");
        this.$resultsHistory = this.$history.querySelector("table tbody");
        this.$eraseHistoryButton = this.$history.querySelector("#erase-history");

        // Share page
        this.$share = document.querySelector("#share");
        this.$shareResultsLink = document.querySelector("#share-results-link");
        this.$shareResultsLinkCopyButton = document.querySelector(
            "#share-results-link-copy"
        );
        this.$shareResultsImage = document.querySelector(
            "#share-results-image"
        );

        // SpeedTest page
        this.$speedtest = document.querySelector("#speedtest");
        this.$results = document.querySelectorAll(".result");
        this.$ipValue = document.querySelector("#ip .value");
        this.$asnValue = document.querySelector("#ip .asn");
        this.$latencyResult = document.querySelector("#latency");
        this.$latencyValue = this.$latencyResult.querySelector(".value");
        this.$jitterResult = document.querySelector("#jitter");
        this.$jitterValue = this.$jitterResult.querySelector(".value");
        this.$downloadResult = document.querySelector("#download");
        this.$downloadValue = this.$downloadResult.querySelector(".value");
        this.$uploadResult = document.querySelector("#upload");
        this.$uploadValue = this.$uploadResult.querySelector(".value");
        this.$progress = document.querySelector("#progress");
        this.$progressBar = document.querySelector("#progress .progress-bar");

        // Footer
        this.$credits = document.querySelector("#credits");
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
