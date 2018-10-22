//@ts-check


import STEP from "../worker/step";

export default class UI {
    constructor() {
        this.page = "home";

        // Top navigation bar
        this.$shareResultsButton = document.querySelector(
            "#commands button#share-results"
        );
        this.$showResultsHistoryButton = document.querySelector(
            "#commands button#show-results-history"
        );
        this.$startButton = document.querySelector("#commands button#start");
        this.$stopButton = document.querySelector("#commands button#stop");

        // Alerts
        this.$httpsAlert = document.querySelector("#https-alert");
        this.$httpsAlertMessage = document.querySelector(
            "#https-alert .message"
        )
        this.$closeButtons = document.querySelectorAll("button.close");

        // History page
        this.$history = document.querySelector("#history");
        this.$historyResults = document.querySelector("#history table tbody");

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
        this.$ipValue = document.querySelector("#ip span.value");
        this.$asnValue = document.querySelector("#ip span.asn");
        this.$latencyResult = document.querySelector("#latency");
        this.$latencyValue = this.$latencyResult.querySelector("span.value");
        this.$jitterResult = document.querySelector("#jitter");
        this.$jitterValue = this.$jitterResult.querySelector("span.value");
        this.$downloadResult = document.querySelector("#download");
        this.$downloadValue = this.$downloadResult.querySelector("span.value");
        this.$uploadResult = document.querySelector("#upload");
        this.$uploadValue = this.$uploadResult.querySelector("span.value");
        this.$progress = document.querySelector("#progress");
        this.$progressBar = document.querySelector("#progress .progress-bar");

        // Footer
        this.$credits = document.querySelector("#credits");
    }

    /**
     * Changes the current displayed page.
     *
     * @param {String} page
     */
    showPage(page) {
        this.page = page;

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
