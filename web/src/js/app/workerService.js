import IpInfo from "../utils/ipInfo";
import { UI } from "./ui";
import Results from "./results";
import SpeedTestWorker from "../worker";
import STATUS from "../worker/status";
import STEP from "../worker/step";

export default class WorkerService {
    constructor() {
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
                UI.$body.classList.add("ready");

                this.config = event.data.config;
                if (!event.data.config.hideCredits) {
                    UI.$credits.removeAttribute("hidden");
                }

                if (event.data.alerts.https) {
                    UI.$httpsAlert.removeAttribute("hidden");
                    UI.$httpsAlertMessage.innerHTML = event.data.alerts.https;
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

                UI.setProgressBar(0);
                UI.$startButton.removeAttribute("hidden");
                UI.$stopButton.setAttribute("hidden", "");

                break;
            case STATUS.ABORTED:
                window.clearInterval(this.statusInterval);

                this.processData(event.data || {});
                UI.$shareResultsButton.setAttribute("hidden", "");
                UI.$startButton.removeAttribute("hidden");
                UI.$stopButton.setAttribute("hidden", "");
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
            if (!data.results.ip) return;

            UI.$ipValue.innerHTML = data.results.ip;
            UI.$asnValue.style.display = "none";
            UI.$asnValue.innerHTML = "";
            IpInfo.get(data.results.ip)
                .then(info => {
                    if (info.bogon) return;
                    if (!info.org) return;

                    UI.$asnValue.style.display = "block";
                    UI.$asnValue.innerHTML = this.lastAsn = info.org;
                })
                .catch(e => console.error);
            return;
        }

        UI.highlightStep(data.step);

        if (data.step === STEP.LATENCY) {
            UI.$latencyValue.innerHTML = data.results.latency.avg || "";
            UI.$jitterValue.innerHTML = data.results.latency.jitter || "";
        }

        if (data.step === STEP.DOWNLOAD)
            UI.$downloadValue.innerHTML = data.results.download
                ? (+data.results.download.speed / (1024 * 1024)).toFixed(2)
                : "";

        if (data.step === STEP.DOWNLOAD)
            UI.$uploadValue.innerHTML = data.results.upload
                ? (+data.results.upload.speed / (1024 * 1024)).toFixed(2)
                : "";

        if ([STEP.LATENCY, STEP.DOWNLOAD, STEP.UPLOAD].includes(data.step))
            UI.setProgressBar(data.results[data.step].progress, data.step);
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

        UI.$shareResultsButton.removeAttribute("hidden");
        window.history.replaceState(
            {},
            "Speed Test - Results",
            `/result#${Results.toString(results)}`
        );
        document.title = "Speed Test";
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
