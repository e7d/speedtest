import { UI } from "./ui";
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
                event.data.result.timestamp = new Date().getTime();
                this.storeLatestResult(event.data.result);

                UI.setProgressBar(0);
                UI.$startButton.removeAttribute("hidden");
                UI.$stopButton.setAttribute("hidden", "");

                break;
            case STATUS.ABORTED:
                window.clearInterval(this.statusInterval);

                this.processData(event.data || {});
                UI.$shareResultButton.setAttribute("hidden", "");
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
            if (!data.result.ipInfo) return;

            UI.$ipValue.innerHTML = data.result.ipInfo.ip;
            UI.$orgValue.style.display = "none";
            UI.$orgValue.innerHTML = "";

            if (data.result.ipInfo.bogon || !data.result.ipInfo.org) return;

            UI.$orgValue.style.display = "block";
            UI.$orgValue.innerHTML = data.result.ipInfo.org;
        }

        UI.highlightStep(data.step);

        if (data.step === STEP.LATENCY) {
            UI.$latencyValue.innerHTML = data.result.latency.avg || "";
            UI.$jitterValue.innerHTML = data.result.latency.jitter || "";
        }

        if (data.step === STEP.DOWNLOAD)
            UI.$downloadValue.innerHTML = data.result.download
                ? ((+data.result.download.speed || 0) / (1024 * 1024)).toFixed(
                      2
                  )
                : "";

        if (data.step === STEP.UPLOAD)
            UI.$uploadValue.innerHTML = data.result.upload
                ? ((+data.result.upload.speed || 0) / (1024 * 1024)).toFixed(2)
                : "";

        if ([STEP.LATENCY, STEP.DOWNLOAD, STEP.UPLOAD].includes(data.step))
            UI.setProgressBar(data.result[data.step].progress, data.step);

        if (data.status === STATUS.DONE) {
            UI.$timestamp.setAttribute("timestamp", data.result.timestamp);
            UI.$timestamp.innerHTML = `<a href="/result#${
                data.result.id
            }">${new Date(data.result.timestamp).toLocaleString()}</a>`;
        }
    }

    /**
     * Store a speed test run results to the local storage.
     *
     * @param {Object} result
     */
    storeLatestResult(result) {
        const resultsHistory =
            JSON.parse(localStorage.getItem("history")) || {};
        resultsHistory[result.timestamp] = result;
        localStorage.setItem(
            "history",
            JSON.stringify(this.limitResultsHistory(resultsHistory))
        );

        UI.$shareResultButton.removeAttribute("hidden");
        window.history.replaceState(
            {},
            "Speed Test - Results",
            `/result#${result.id}`
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
