//@ts-check

import html2canvas from "html2canvas";
import SpeedTestWorker from "worker-loader!./worker";

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

        this.statusInterval = null;

        this.config = {
            updateDelay: 150,
            endless: false // false
        };

        this.worker = new SpeedTestWorker();
        this.worker.addEventListener("message", event => {
            this.processResponse(event);
        });
        this.$shareButton = document.querySelector("#commands a#share");
        this.$toggleHistoryButton = document.querySelector(
            "#commands button#toggle-history"
        );
        this.$startButton = document.querySelector("#commands button#start");
        this.$stopButton = document.querySelector("#commands button#stop");
        this.$httpsAlert = document.querySelector("#https-alert");
        this.$httpsAlertMessage = document.querySelector(
            "#https-alert .message"
        );
        this.$history = document.querySelector("#history");
        this.$historyResults = document.querySelector("#history table tbody");
        this.$results = document.querySelector("#results");
        this.$ipResult = document.querySelector("#ip");
        this.$ipValue = document.querySelector("#ip span.value");
        this.$ipDetails = document.querySelector("#ip span.details");
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

        this.$toggleHistoryButton.addEventListener("click", () => {
            this.toggleResults();
        });
        this.$startButton.addEventListener("click", this.startTest.bind(this));
        this.$stopButton.addEventListener("click", this.stopTest.bind(this));
        this.$closeButtons.forEach($closeButton =>
            $closeButton.addEventListener("click", this.closeAlert.bind(this))
        );

        if (window.location.hash === "#results") {
            this.showResults();
        }
        window.addEventListener("popstate", e => {
            switch (document.location.hash) {
                case "#results":
                    this.showResults();
                    break;

                case "#run":
                    this.startTest();
                    break;

                default:
                    this.showHome();
                    break;
            }
        });
    }

    /**
     * Start a speed test.
     */
    startTest() {
        if (this.running) return;

        this.showHome();
        window.history.pushState({}, "Speed Test - Run", "/#run");
        this.running = true;

        this.$shareButton.setAttribute("hidden", "");
        this.$startButton.setAttribute("hidden", "");
        this.$stopButton.removeAttribute("hidden");

        this.setProgressBar(0);
        this.resetResults();

        this.worker.postMessage("start");

        if (!this.config.updateDelay) return;
        if (this.config.updateDelay === "auto") {
            this.worker.postMessage("status");
        }
        window.clearInterval(this.statusInterval);
        this.statusInterval = window.setInterval(() => {
            this.worker.postMessage("status");
        }, this.config.updateDelay);
    }

    /**
     * Abort a running speed test.
     */
    stopTest() {
        if (!this.running) return;
        this.running = false;

        window.clearInterval(this.statusInterval);
        this.statusInterval = null;

        if (this.worker) this.worker.postMessage("abort");

        this.setProgressBar(0);
    }

    /**
     * Process an event response from the speed test Worker
     *
     * @param {MessageEvent} event
     */
    processResponse(event) {
        switch (event.data.status) {
            case this.STATUS.WAITING:
                if (!event.data.config.hideCredits) {
                    this.$credits.removeAttribute("hidden");
                }

                if (event.data.alerts.https) {
                    this.$httpsAlert.removeAttribute("hidden");
                    this.$httpsAlertMessage.innerHTML = event.data.alerts.https;
                }
                break;
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
                this.storeResults(event.data.results);
                this.setProgressBar(0);

                window.setTimeout(this.shareResults.bind(this), 1000);
                this.$startButton.removeAttribute("hidden");
                this.$stopButton.setAttribute("hidden", "");

                break;
            case this.STATUS.ABORTED:
                window.clearInterval(this.statusInterval);

                this.processData(event.data || {});
                this.$shareButton.setAttribute("hidden", "");
                this.$startButton.removeAttribute("hidden");
                this.$stopButton.setAttribute("hidden", "");
                break;
        }

        if (this.config.updateDelay == "auto") {
            window.requestAnimationFrame(
                this.worker.postMessage.bind(this, "status")
            );
        }
    }

    /**
     * Reset the current results.
     */
    resetResults() {
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

        switch (data.step) {
            case "ip":
                if (!data.results.ip) return;
                this.$ipValue.innerHTML = data.results.ip;
                this.$ipDetails.style.display = "none";
                this.$ipDetails.innerHTML = "";
                this.getIpInfo(data.results.ip).then(info => {
                    if (info.bogon) return;
                    if (!info.org) return;

                    this.$ipDetails.style.display = "block";
                    this.$ipDetails.innerHTML = info.org;
                });
                break;
            case "latency":
                this.$latencyValue.innerHTML = data.results.latency.avg || "";
                this.$jitterValue.innerHTML = data.results.latency.jitter || "";
                this.setProgressBar(data.results.latency.progress);
                break;
            case "download":
                const downloadValue = data.results.download
                    ? +data.results.download.speed / (1024 * 1024)
                    : 0;
                this.$downloadValue.innerHTML = downloadValue
                    ? downloadValue.toFixed(2)
                    : "";
                this.setProgressBar(data.results.download.progress, "download");
                break;
            case "upload":
                const uploadValue = data.results.upload
                    ? +data.results.upload.speed / (1024 * 1024)
                    : 0;
                this.$uploadValue.innerHTML = uploadValue
                    ? uploadValue.toFixed(2)
                    : "";
                this.setProgressBar(data.results.upload.progress);
                break;
        }

        if (this.previousStep !== data.step) this.highlightStep(data.step);
        this.previousStep = data.step;
    }

    /**
     * Highlights the curren running step.
     * @param {String} step
     */
    highlightStep(step) {
        document
            .querySelectorAll(".result")
            .forEach(elem => elem.classList.remove("active"));

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
        if (this.config.updateDelay === "auto") {
            this.$progressBar.style.transition = "unset";
        }
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

    /**
     * Prepare the share results button with a PNG image
     */
    shareResults() {
        html2canvas(this.$results, {
            logging: false,
            scale: 1,
            onclone: doc => doc.querySelector("#results").classList.add("share")
        }).then(canvas => {
            this.$shareButton.href = canvas
                .toDataURL("image/png")
                .replace(/^data:image\/[^;]/, "data:application/octet-stream");
            this.$shareButton.removeAttribute("hidden");
        });
    }

    /**
     * Close alert boxes on click
     *
     * @param {MouseEvent} e
     */
    closeAlert(e) {
        console.log("close", e);
        e.target.parentElement.setAttribute("hidden", "");
    }

    /**
     * Store a speed test run results to the local storage
     *
     * @param {Object} results
     */
    storeResults(results) {
        const history = JSON.parse(localStorage.getItem("history")) || {};
        history[new Date().getTime()] = {
            latency: {
                avg: results.latency.avg,
                jitter: results.latency.jitter
            },
            download: results.download.speed,
            upload: results.upload.speed,
            ip: results.ip
        };
        localStorage.setItem("history", JSON.stringify(history));
    }

    /**
     * Show history results
     */
    showHome() {
        this.page = "home";

        this.$results.removeAttribute("hidden");
        this.$history.setAttribute("hidden", "");

        this.stopTest();
    }

    /**
     * Toggle history results
     */
    toggleResults() {
        if (this.page === "results") {
            this.showHome();
            window.history.pushState({}, "Speed Test", "/");

            return;
        }
        this.showResults();
        window.history.pushState({}, "Speed Test - Results", "/#results");
    }

    /**
     * Show history results
     */
    showResults() {
        this.page = "results";

        this.stopTest();

        this.$history.removeAttribute("hidden");
        this.$results.setAttribute("hidden", "");

        this.$historyResults.innerHTML = "";
        this.readHistory();
    }

    readHistory() {
        const history = JSON.parse(localStorage.getItem("history")) || {};

        if (Object.entries(history).length === 0) {
            const $resultsRow = document.createElement("tr");
            $resultsRow.innerHTML = '<td class="text-center" colspan="6">No results.<br><a href="#run">Run a speed test</a> now.</td>';
            this.$historyResults.appendChild($resultsRow);

            return;
        }

        Object.entries(history).forEach(([timestamp, result]) => {
            const date = new Date(+timestamp);
            const $resultsRow = document.createElement("tr");
            $resultsRow.innerHTML = `
                <td>${date.toLocaleDateString()}<br>${date.toLocaleTimeString()}</td>
                <td>${result.latency.avg} ms</td>
                <td>${result.latency.jitter} ms</td>
                <td>${(result.download / 1024 ** 2).toFixed(2)} Mbps</td>
                <td>${(result.upload / 1024 ** 2).toFixed(2)} Mbps</td>
                <td>${result.ip}</td>
            `;
            this.$historyResults.appendChild($resultsRow);
        });
    }
}
