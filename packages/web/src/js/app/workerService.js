import DateFormat from "../utils/dateFormat";
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
            updateDelay: 100,
            endless: false
        };

        this.worker = new SpeedTestWorker();
        this.worker.addEventListener("message", event => {
            this.processWorkerResponse(event);
        });
    }

    /**
     * Start the worker job
     */
    start() {
        if (this.running) return;
        if (!this.workerReady) {
            this.queueTest = true;
            return;
        }

        this.running = true;
        UI.$speedtest.className = "";
        UI.$gaugeValue.innerHTML = "...";

        this.worker.postMessage("start");
        window.clearInterval(this.statusInterval);
        this.statusInterval = window.setInterval(() => {
            this.worker.postMessage("status");
        }, this.settings.updateDelay);
    }

    /**
     * Abort the worker job
     */
    abort() {
        if (!this.running) return;
        this.running = false;
        UI.$speedtest.className = "ready";

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
                this.processFinishedStatus(event.data);
                break;
            case STATUS.ABORTED:
                this.processFinishedStatus(event.data);
                break;
        }
    }

    /**
     * Update UI as speed test is ready
     *
     * @param {Object} data
     */
    processReadyStatus(data) {
        this.workerReady = true;
        UI.$body.classList.add("ready");

        this.config = data.config;
        if (!data.config.hideVersion) {
            UI.$version.removeAttribute("hidden");
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

    /**
     * Update UI as speed test is successful
     *
     * @param {Object} data
     */
    processDoneStatus(data) {
        data.result.timestamp = new Date().getTime();
        this.storeLatestResult(data.result);
    }

    /**
     * Update UI as speed test is finished
     *
     * @param {Object} data
     */
    processFinishedStatus(data) {
        this.processData(data);

        UI.$gaugeValue.innerHTML = "";
        UI.gauge.setValue(0);
        UI.setProgressBar(0);
        UI.$startButton.removeAttribute("hidden");
        UI.$stopButton.setAttribute("hidden", "");

        this.running = false;
        UI.$speedtest.className = "done";
        window.clearInterval(this.statusInterval);
    }

    /**
     * Process a set of data
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
            this.processLatencyData(data.result.latency, data.result.jitter);
        if (data.step === STEP.DOWNLOAD)
            this.processDownloadData(data.result.download);
        if (data.step === STEP.UPLOAD)
            this.processUploadData(data.result.upload);

        if (data.status === STATUS.DONE) {
            UI.$timestamp.setAttribute("timestamp", data.result.timestamp);
            UI.$timestamp.innerHTML = `<a href="/result#${
                data.result.id
            }">${DateFormat.toISO(new Date(data.result.timestamp))}</a>`;
        }
    }

    /**
     * Process IP related information
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
    processLatencyData(latency, jitter) {
        UI.setProgressBar(latency.progress, STEP.LATENCY);
        if (!latency || !jitter) return;

        UI.$latencyValue.innerHTML = latency.avg || "";
        UI.$jitterValue.innerHTML = jitter || "";
    }

    /**
     * Process download related information
     *
     * @param {Object} download
     */
    processDownloadData(download) {
        UI.setProgressBar(download.progress, STEP.DOWNLOAD);
        if (!download.speed) {
            UI.gauge.setValue(0);
            UI.$gaugeValue.innerHTML = "...";
            return;
        }

        const downloadSpeed = (+download.speed || 0) / (1024 * 1024);
        UI.gauge.setValue(Math.log(10 * downloadSpeed + 1));
        UI.$gaugeValue.innerHTML = UI.$downloadValue.innerHTML = download
            ? downloadSpeed.toFixed(2)
            : "";
    }

    /**
     * Process upload related information
     *
     * @param {Object} upload
     */
    processUploadData(upload) {
        UI.setProgressBar(upload.progress, STEP.UPLOAD);
        if (!upload.speed) {
            UI.gauge.setValue(0);
            UI.$gaugeValue.innerHTML = "...";
            return;
        }

        const uploadSpeed = (+upload.speed || 0) / (1024 * 1024);
        UI.gauge.setValue(Math.log(10 * uploadSpeed + 1));
        UI.$gaugeValue.innerHTML = UI.$uploadValue.innerHTML = upload
            ? uploadSpeed.toFixed(2)
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
        resultsHistory[result.timestamp] = {
            version: VERSION,
            timestamp: result.timestamp,
            id: result.id,
            ipInfo: result.ipInfo,
            latency: {
                avg: result.latency.avg
            },
            jitter: result.jitter,
            download: {
                speed: result.download.speed
            },
            upload: {
                speed: result.upload.speed
            }
        };
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
     * @param {Object} resultsHistory
     * @param {number} [maxEntries=20]
     *
     * @returns {Object}
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
