import IpInfo from "../utils/ipInfo";
import Results from "./results";
import SpeedTestWorker from "../worker";
import STATUS from "../worker/status";
import STEP from "../worker/step";

export default class WorkerService {
    constructor(ui) {
        this.ui = ui;

        this.queueTest = false;
        this.workerReady = false;
        this.statusInterval = null;
        this.config = {};
        this.settings = {
            updateDelay: 150,
            endless: false
        };

        this.worker = new SpeedTestWorker();
        this.worker.addEventListener("message", event => {
            this.processWorkerResponse(event);
        });
    }

    /**
     * Start the worker job.
     */
    start() {
        if (this.running) return;
        if (!this.workerReady) {
            this.queueTest = true;
            return;
        }

        this.running = true;

        this.worker.postMessage("start");
        window.clearInterval(this.statusInterval);
        this.statusInterval = window.setInterval(() => {
            this.worker.postMessage("status");
        }, this.settings.updateDelay);
    }

    /**
     * Abort the worker job.
     */
    abort() {
        if (!this.running) return;
        this.running = false;

        this.worker.postMessage("abort");
        window.clearInterval(this.statusInterval);
    }

    /**
     * Process an event response from the speed test Worker
     *
     * @param {MessageEvent} event
     */
    processWorkerResponse(event) {
        switch (event.data.status) {
            case STATUS.READY:
                this.workerReady = true;
                this.ui.$body.classList.add("ready");

                this.config = event.data.config;
                if (!event.data.config.hideCredits) {
                    this.ui.$credits.removeAttribute("hidden");
                }

                if (event.data.alerts.https) {
                    this.ui.$httpsAlert.removeAttribute("hidden");
                    this.ui.$httpsAlertMessage.innerHTML = event.data.alerts.https;
                }

                if (this.queueTest) {
                    this.queueTest = false;
                    this.start();
                }
                break;
            case STATUS.RUNNING:
                this.processData(event.data || {});
                break;
            case STATUS.DONE:
                window.clearInterval(this.statusInterval);

                this.processData(event.data || {});
                if (this.settings.endless) {
                    this.start();
                    return;
                }

                this.running = false;
                event.data.results.timestamp = new Date().getTime();
                event.data.results.asn = this.lastAsn;
                this.storeLatestResults(event.data.results);

                this.ui.setProgressBar(0);
                this.ui.$startButton.removeAttribute("hidden");
                this.ui.$stopButton.setAttribute("hidden", "");

                break;
            case STATUS.ABORTED:
                window.clearInterval(this.statusInterval);

                this.processData(event.data || {});
                this.ui.$shareResultsButton.setAttribute("hidden", "");
                this.ui.$startButton.removeAttribute("hidden");
                this.ui.$stopButton.setAttribute("hidden", "");
                break;
        }
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

        if (data.step === STEP.IP) {
            this.ui.$ipValue.innerHTML = data.results.ip;
            this.ui.$asnValue.style.display = "none";
            this.ui.$asnValue.innerHTML = "";
            IpInfo.get(data.results.ip).then(info => {
                if (info.bogon) return;
                if (!info.org) return;

                this.ui.$asnValue.style.display = "block";
                this.ui.$asnValue.innerHTML = this.lastAsn = info.org;
            });

            return;
        }

        this.ui.highlightStep(data.step);

        this.ui.$latencyValue.innerHTML = data.results.latency.avg || "";
        this.ui.$jitterValue.innerHTML = data.results.latency.jitter || "";
        const downloadValue = data.results.download
            ? +data.results.download.speed / (1024 * 1024)
            : 0;
        this.ui.$downloadValue.innerHTML = downloadValue
            ? downloadValue.toFixed(2)
            : "";
        const uploadValue = data.results.upload
            ? +data.results.upload.speed / (1024 * 1024)
            : 0;
        this.ui.$uploadValue.innerHTML = uploadValue
            ? uploadValue.toFixed(2)
            : "";

        if ([STEP.LATENCY, STEP.DOWNLOAD, STEP.UPLOAD].includes(data.step)) {
            this.ui.setProgressBar(data.results[data.step].progress, data.step);
        }
    }

    /**
     * Store a speed test run results to the local storage.
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

        this.ui.$shareResultsButton.removeAttribute("hidden");
        window.history.pushState(
            {},
            "Speed Test - Results",
            `/result#${Results.toString(results)}`
        );
    }

    /**
     * Filter out the oldest results history entries.
     *
     * @param {*} resultsHistory
     * @param {number} [maxEntries=5]
     * @returns
     * @memberof WebUI
     */
    limitResultsHistory(resultsHistory, maxEntries = 20) {
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
}
