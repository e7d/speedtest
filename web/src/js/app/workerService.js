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
                this.processReadyStatus(event.data);
                break;
            case STATUS.RUNNING:
                this.processData(event.data);
                break;
            case STATUS.DONE:
                if (this.settings.endless) {
                    this.start();
                    return;
                }

                this.processDoneStatus(event.data);
                break;
            case STATUS.ABORTED:
                this.processAbortedStatus(event.data);
                break;
        }
    }

    processReadyStatus(data) {
        this.workerReady = true;
        UI.$body.classList.add("ready");

        this.config = data.config;
        if (!data.config.hideCredits) {
            UI.$credits.removeAttribute("hidden");
        }

        if (data.alerts.https) {
            UI.$httpsAlert.removeAttribute("hidden");
            UI.$httpsAlertMessage.innerHTML = data.alerts.https;
        }

        if (this.queueTest) {
            this.queueTest = false;
            this.start();
        }
    }

    processDoneStatus(data) {
        this.running = false;
        window.clearInterval(this.statusInterval);

        data.result.timestamp = new Date().getTime();
        this.processData(event.data);
        this.storeLatestResult(data.result);

        UI.setProgressBar(0);
        UI.$startButton.removeAttribute("hidden");
        UI.$stopButton.setAttribute("hidden", "");
    }

    processAbortedStatus(data) {
        this.running = false;
        window.clearInterval(this.statusInterval);

        this.processData(data);

        UI.$shareResultButton.setAttribute("hidden", "");
        UI.$startButton.removeAttribute("hidden");
        UI.$stopButton.setAttribute("hidden", "");
    }

    /**
     * Process a set of data.
     *
     * @param {Object} data
     */
    processData(data = {}) {
        if (!this.running) {
            return;
        }

        UI.highlightStep(data.step);

        if (data.step === STEP.IP) this.processIpData(data.result.ipInfo);
        if (data.step === STEP.LATENCY)
            this.processLatencyData(data.result.latency);
        if (data.step === STEP.DOWNLOAD)
            this.processDownloadData(data.result.download);
        if (data.step === STEP.UPLOAD)
            this.processUploadData(data.result.upload);

        if (data.status === STATUS.DONE) {
            UI.$timestamp.setAttribute("timestamp", data.result.timestamp);
            UI.$timestamp.innerHTML = `<a href="/result#${
                data.result.id
            }">${new Date(data.result.timestamp).toLocaleString()}</a>`;
        }
    }

    /**
     * Process IP related information.
     *
     * @param {Object} ipInfo
     */
    processIpData(ipInfo) {
        if (!ipInfo) return;

        UI.$ipValue.innerHTML = ipInfo.ip;
        UI.$orgValue.style.display = "none";
        UI.$orgValue.innerHTML = "";

        if (ipInfo.bogon || !ipInfo.org) return;

        UI.$orgValue.style.display = "block";
        UI.$orgValue.innerHTML = ipInfo.org;
    }

    /**
     * Process latency related information
     *
     * @param {Object} latency
     */
    processLatencyData(latency) {
        UI.setProgressBar(latency.progress, STEP.LATENCY);
        UI.$latencyValue.innerHTML = latency.avg || "";
        UI.$jitterValue.innerHTML = latency.jitter || "";
    }

    /**
     * Process download related information
     *
     * @param {Object} download
     */
    processDownloadData(download) {
        UI.setProgressBar(download.progress, STEP.DOWNLOAD);
        UI.$downloadValue.innerHTML = download
            ? ((+download.speed || 0) / (1024 * 1024)).toFixed(2)
            : "";
    }

    /**
     * Process upload related information
     *
     * @param {Object} upload
     */
    processUploadData(upload) {
        UI.setProgressBar(upload.progress, STEP.UPLOAD);
        UI.$uploadValue.innerHTML = upload
            ? ((+upload.speed || 0) / (1024 * 1024)).toFixed(2)
            : "";
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
