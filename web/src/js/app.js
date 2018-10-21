//@ts-check

import html2canvas from "html2canvas";
import SpeedTestWorker from "./worker";

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
        this.page = "home";

        this.STATUS = {
            WAITING: 0,
            STARTING: 1,
            RUNNING: 2,
            DONE: 3,
            ABORTED: 4,
            FAILED: -1
        };

        this.config = {
            updateDelay: 150,
            endless: false // false
        };
        this.lastAsn = null;
        this.resultsString = null;
        this.queueTest = false;
        this.statusInterval = null;
        this.workerReady = false;

        this.worker = new SpeedTestWorker();
        this.worker.addEventListener("message", event => {
            this.processWorkerResponse(event);
        });

        this.$shareResultsButton = document.querySelector(
            "#commands button#share-results"
        );
        this.$showResultsHistoryButton = document.querySelector(
            "#commands button#show-results-history"
        );
        this.$startButton = document.querySelector("#commands button#start");
        this.$stopButton = document.querySelector("#commands button#stop");
        this.$httpsAlert = document.querySelector("#https-alert");
        this.$httpsAlertMessage = document.querySelector(
            "#https-alert .message"
        );
        this.$history = document.querySelector("#history");
        this.$historyResults = document.querySelector("#history table tbody");
        this.$share = document.querySelector("#share");
        this.$shareResultsLink = document.querySelector("#share-results-link");
        this.$shareResultsLinkCopyButton = document.querySelector(
            "#share-results-link-copy"
        );
        this.$shareResultsImage = document.querySelector(
            "#share-results-image"
        );
        this.$speedtest = document.querySelector("#speedtest");
        this.$ipResult = document.querySelector("#ip");
        this.$ipValue = document.querySelector("#ip span.value");
        this.$asnValue = document.querySelector("#ip span.asn");
        this.$latencyResult = document.querySelector("#latency");
        this.$latencyValue = document.querySelector("#latency span.value");
        this.$jitterResult = document.querySelector("#jitter");
        this.$jitterValue = document.querySelector("#jitter span.value");
        this.$downloadResult = document.querySelector("#download");
        this.$downloadValue = document.querySelector("#download span.value");
        this.$uploadResult = document.querySelector("#upload");
        this.$uploadValue = document.querySelector("#upload span.value");
        this.$progress = document.querySelector("#progress");
        this.$progressBar = document.querySelector("#progress .progress-bar");
        this.$credits = document.querySelector("#credits");
        this.$closeButtons = document.querySelectorAll("button.close");

        this.$shareResultsButton.addEventListener(
            "click",
            this.shareResultsButtonClickHandler.bind(this)
        );
        this.$showResultsHistoryButton.addEventListener(
            "click",
            this.showResultsHistoryButtonClickHandler.bind(this)
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
        this.$shareResultsLink.addEventListener(
            "click",
            this.shareResultsLinkClickHandler.bind(this)
        );
        this.$shareResultsLinkCopyButton.addEventListener(
            "click",
            this.shareResultsLinkCopyButtonClickHandler.bind(this)
        );

        window.addEventListener("popstate", () => {
            this.stopTest(true);

            switch (document.location.pathname) {
                case "/result":
                    this.showPage("speedtest");
                    this.loadResultsFromUri();
                    break;

                case "/results":
                    this.showPage("history");
                    this.loadResultsHistory();
                    break;

                case "/run":
                    this.showPage("speedtest");
                    this.startTest();
                    break;

                case "/share":
                    this.showPage("share");
                    this.loadResultsFromUri();
                    this.generateShareResultsLinks();
                    break;

                default:
                    this.showPage("speedtest");
                    break;
            }
        });
        window.dispatchEvent(new Event("popstate"));
    }

    startButtonClickHandler() {
        this.showPage("speedtest");
        window.history.pushState({}, "Speed Test - Running...", "/run");
        this.startTest();
    }

    stopButtonClickHandler() {
        this.showPage("speedtest");
        window.history.pushState({}, "Speed Test", "/");
        this.stopTest();
    }

    /**
     * Start a speed test.
     */
    startTest() {
        if (this.running) return;
        if (!this.workerReady) {
            this.queueTest = true;
            return;
        }
        this.running = true;

        this.$shareResultsButton.setAttribute("hidden", "");
        this.$startButton.setAttribute("hidden", "");
        this.$stopButton.removeAttribute("hidden");

        this.setProgressBar(0);
        this.clearResults();

        this.worker.postMessage("start");

        window.clearInterval(this.statusInterval);
        this.statusInterval = window.setInterval(() => {
            this.worker.postMessage("status");
        }, this.config.updateDelay);
    }

    /**
     * Abort a running speed test.
     */
    stopTest(clearResults = false) {
        if (!this.running) return;
        this.running = false;

        window.clearInterval(this.statusInterval);
        this.statusInterval = null;

        if (this.worker) this.worker.postMessage("abort");

        this.setProgressBar(0);
        this.resetHiglightStep();
        if (clearResults) this.clearResults();
    }

    /**
     * Process an event response from the speed test Worker
     *
     * @param {MessageEvent} event
     */
    processWorkerResponse(event) {
        if (!this.workerReady) {
            if (!event.data.ready) return;
            this.workerReady = event.data.ready;

            if (!event.data.config.hideCredits) {
                this.$credits.removeAttribute("hidden");
            }

            if (event.data.alerts.https) {
                this.$httpsAlert.removeAttribute("hidden");
                this.$httpsAlertMessage.innerHTML = event.data.alerts.https;
            }
        }

        if (this.queueTest && this.workerReady) {
            this.queueTest = false;
            this.startTest();
            return;
        }

        switch (event.data.status) {
            case this.STATUS.RUNNING:
                this.processData(event.data || {});
                break;
            case this.STATUS.DONE:
                window.clearInterval(this.statusInterval);

                this.processData(event.data || {});
                if (this.config.endless) {
                    this.startTest();
                    return;
                }

                this.running = false;
                event.data.results.timestamp = new Date().getTime();
                event.data.results.asn = this.lastAsn;
                this.storeLatestResults(event.data.results);

                this.setProgressBar(0);
                this.$startButton.removeAttribute("hidden");
                this.$stopButton.setAttribute("hidden", "");

                break;
            case this.STATUS.ABORTED:
                window.clearInterval(this.statusInterval);

                this.processData(event.data || {});
                this.$shareResultsButton.setAttribute("hidden", "");
                this.$startButton.removeAttribute("hidden");
                this.$stopButton.setAttribute("hidden", "");
                break;
        }
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
     * Process a set of data.
     *
     * @param {Object} data
     */
    processData(data) {
        if (!this.running) {
            return;
        }

        if (data.step === "ip") {
            this.$ipValue.innerHTML = data.results.ip;
            this.$asnValue.style.display = "none";
            this.$asnValue.innerHTML = "";
            this.getIpInfo(data.results.ip).then(info => {
                if (info.bogon) return;
                if (!info.org) return;

                this.$asnValue.style.display = "block";
                this.$asnValue.innerHTML = this.lastAsn = info.org;
            });

            return;
        }

        if (this.previousStep !== data.step) this.highlightStep(data.step);
        this.previousStep = data.step;

        this.$latencyValue.innerHTML = data.results.latency.avg || "";
        this.$jitterValue.innerHTML = data.results.latency.jitter || "";
        const downloadValue = data.results.download
            ? +data.results.download.speed / (1024 * 1024)
            : 0;
        this.$downloadValue.innerHTML = downloadValue
            ? downloadValue.toFixed(2)
            : "";
        const uploadValue = data.results.upload
            ? +data.results.upload.speed / (1024 * 1024)
            : 0;
        this.$uploadValue.innerHTML = uploadValue ? uploadValue.toFixed(2) : "";

        switch (data.step) {
            case "latency":
                this.setProgressBar(data.results.latency.progress);
                break;
            case "download":
                this.setProgressBar(data.results.download.progress, "download");
                break;
            case "upload":
                this.setProgressBar(data.results.upload.progress);
                break;
        }
    }

    /**
     * Resets the highlighted step.
     */
    resetHiglightStep() {
        document
            .querySelectorAll(".result")
            .forEach(elem => elem.classList.remove("active"));
    }

    /**
     * Highlights the current running step.
     * @param {String} step
     */
    highlightStep(step) {
        this.resetHiglightStep();

        switch (step) {
            case "latency":
                this.$latencyResult.classList.add("active");
                this.$jitterResult.classList.add("active");
                break;
            case "download":
                this.$downloadResult.classList.add("active");
                break;
            case "upload":
                this.$uploadResult.classList.add("active");
                break;
        }
    }

    /**
     * Set a value on the progress bar
     *
     * @param {Number} progress
     * @param {String} mode
     */
    setProgressBar(progress, mode = "") {
        this.$progress.style.flexDirection =
            mode === "download" ? "row-reverse" : "row";
        this.$progressBar.style.width = progress * 100 + "%";
    }

    /**
     * Get IP information from "ipinfo.io"
     *
     * @param {String} ip
     */
    getIpInfo(ip) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener("readystatechange", () => {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(xhr.statusText);
                    }
                }
            });
            xhr.open("GET", `//ipinfo.io/${ip}/json`, true);
            xhr.send(null);
        });
    }

    showPage(page) {
        this.page = page;

        this.$history.setAttribute("hidden", "");
        this.$share.setAttribute("hidden", "");
        this.$speedtest.setAttribute("hidden", "");
        this[`$${page}`].removeAttribute("hidden");
    }

    /**
     * Show the page to share results
     */
    generateShareResultsLinks() {
        this.$shareResultsLink.value = `${window.location.origin}/result${
            window.location.hash
        }`;

        html2canvas(this.$speedtest, {
            logging: false,
            scale: 1,
            onclone: doc => {
                const $el = doc.querySelector("#speedtest");
                $el.removeAttribute("hidden");
                $el.classList.add("share");
            }
        }).then(canvas => {
            this.$shareResultsImage.src = canvas.toDataURL("image/png");
        });
    }

    /**
     * Prepare the share results button with a PNG image
     */
    shareResultsButtonClickHandler() {
        this.generateShareResultsLinks();
        this.showPage("share");
        window.history.pushState(
            {},
            "Speed Test - Share Results",
            `/share#${this.resultsString}`
        );
    }

    /**
     * Select the share result link on input click
     */
    shareResultsLinkClickHandler() {
        this.$shareResultsLink.select();
    }

    /**
     * Select anc copy the share result link on "Copy" button click
     */
    shareResultsLinkCopyButtonClickHandler() {
        this.$shareResultsLink.select();
        document.execCommand("copy");
    }

    /**
     * Close alert boxes on click
     *
     * @param {MouseEvent} e
     */
    alertCloseButtonClickHandler(e) {
        e.target.parentElement.setAttribute("hidden", "");
    }

    /**
     * Store a speed test run results to the local storage
     *
     * @param {Object} results
     */
    storeLatestResults(results) {
        const resultsHistory =
            JSON.parse(localStorage.getItem("history")) || {};
        resultsHistory[results.timestamp] = results;
        localStorage.setItem(
            "history",
            JSON.stringify(this.limitResultsHistory(resultsHistory))
        );

        this.resultsString = this.getResultsString(results);
        this.$shareResultsButton.removeAttribute("hidden");
        window.history.pushState(
            {},
            "Speed Test - Results",
            `/result#${this.resultsString}`
        );
    }

    limitResultsHistory(resultsHistory, maxEntries = 5) {
        const filteredResults = {};
        Object.keys(resultsHistory)
            .sort((a, b) => +b - +a)
            .slice(0, maxEntries)
            .map(
                timestamp =>
                    (filteredResults[timestamp] = resultsHistory[timestamp])
            );
        return filteredResults;
    }

    /**
     * Load the results from the currect URI
     */
    loadResultsFromUri() {
        const [
            latency,
            jitter,
            download,
            upload,
            ip,
            asn
        ] = window.location.hash.replace("#", "").split(",");

        this.$ipValue.innerHTML = ip;
        this.$asnValue.innerHTML = decodeURIComponent(asn);
        this.$latencyValue.innerHTML = latency;
        this.$jitterValue.innerHTML = jitter;
        this.$downloadValue.innerHTML = (+download / (1024 * 1024)).toFixed(2);
        this.$uploadValue.innerHTML = (+upload / (1024 * 1024)).toFixed(2);

        // this.resultsString = `${latency},${jitter},${download},${upload},${ip},${asn}`;
    }

    /**
     * Toggle history results
     */
    showResultsHistoryButtonClickHandler() {
        this.stopTest();
        this.clearResults();

        this.loadResultsHistory();
        this.showPage("history");
        window.history.pushState({}, "Speed Test - Results", "/results");
    }

    loadResultsHistory() {
        const history = JSON.parse(localStorage.getItem("history")) || {};

        this.$historyResults.innerHTML = "";
        if (Object.entries(history).length === 0) {
            const $resultsRow = document.createElement("tr");
            $resultsRow.innerHTML =
                '<td class="text-center" colspan="6">No results.<br><a href="#run">Run a speed test</a> now.</td>';
            this.$historyResults.appendChild($resultsRow);

            return;
        }

        Object.entries(history).forEach(([timestamp, results]) => {
            const date = new Date(+timestamp);
            const $resultsRow = document.createElement("tr");
            $resultsRow.innerHTML = `
                <td>${date.toLocaleDateString()}<br>${date.toLocaleTimeString()}</td>
                <td>${results.latency.avg} ms</td>
                <td>${results.latency.jitter} ms</td>
                <td>${(results.download.speed / 1024 ** 2).toFixed(2)} Mbps</td>
                <td>${(results.upload.speed / 1024 ** 2).toFixed(2)} Mbps</td>
                <td>${results.ip}${
                    results.asn ? `<br>(${results.asn})` : ""
                }</td>
                <td>
                    <a class="btn btn-link" href="share#${this.getResultsString(
                        results
                    )}"><i class="icon icon-link"></i></a>
                </td>
            `;
            this.$historyResults.appendChild($resultsRow);
        });
    }

    getResultsString(results) {
        return `${results.latency.avg},${results.latency.jitter},${
            results.download.speed
        },${results.upload.speed},${results.ip},${results.asn || ""}`;
    }
}
