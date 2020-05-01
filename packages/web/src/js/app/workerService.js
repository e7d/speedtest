import DateFormat from "../utils/dateFormat";
import { convertPaths } from "../utils/object";
import SpeedTestWorker from "../worker";
import STATUS from "../worker/status";
import STEP from "../worker/step";
import { UI } from "./ui";
import UserSettings from "./userSettings";

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

    this.userSettings = new UserSettings();

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

    this.worker.postMessage({ config: convertPaths(this.userSettings.data).config });
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
   * @param {Object} data
   */
  processReadyStatus(data) {
    this.workerReady = true;
    UI.$main.removeAttribute("hidden");

    this.config = data.config;
    this.userSettings.loadEndpoints(data.config.endpoints);
    if (this.config.analytics) this.setupAnalytics();
    if (!this.config.hideVersion) {
      UI.$version.removeAttribute("hidden");
    }

    if (this.queueTest) {
      this.queueTest = false;
      this.start();
    }
  }

  /**
   * Setup the Google Analytics tracking scripts
   */
  setupAnalytics() {
    this.userSettings.analytics = this.config.analytics;

    const gtagScript = document.createElement("script");
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.analytics.trackingId}`;

    const gtagConfigScript = document.createElement("script");
    gtagConfigScript.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${
      this.config.analytics.trackingId
    }');`;

    UI.$head.appendChild(gtagScript);
    UI.$head.appendChild(gtagConfigScript);
  }

  /**
   * Update UI as speed test is successful
   * @param {Object} data
   */
  processDoneStatus(data) {
    data.result.timestamp = new Date().getTime();
    this.storeLatestResult(data.result);
  }

  /**
   * Update UI as speed test is finished
   * @param {Object} data
   */
  processFinishedStatus(data) {
    this.running = false;
    window.clearInterval(this.statusInterval);
    this.processData(data);
    UI.$gaugeValue.innerHTML = "";
    UI.gauge.setValue(0);
    UI.setProgressBar(0);
    UI.resetHiglightStep();
    UI.$startButton.removeAttribute("hidden");
    UI.$stopButton.setAttribute("hidden", "");
    UI.$speedtest.className = "done";
  }

  /**
   * Process a set of data
   * @param {Object} data
   */
  processData(data = {}) {
    if (!this.running) return;

    UI.highlightStep(data.step);

    this.processIpData(data.step, data.result.ipInfo);
    this.processLatencyData(data.step, data.result.latency, data.result.jitter);
    this.processBandwidthData(data.step, data.result);

    this.processDoneStep(data.status, data.result.timestamp, data.result.id);
  }

  /**
   * Process IP related information
   * @param {*} step
   * @param {Object} ipInfo
   */
  processIpData(step, ipInfo) {
    if (step !== STEP.IP || !ipInfo) return;

    UI.$ipValue.innerHTML = ipInfo.ip;
    UI.$orgValue.style.display = "none";
    UI.$orgValue.innerHTML = "";

    if (ipInfo.bogon || !ipInfo.org) return;

    UI.$orgValue.style.display = "block";
    UI.$orgValue.innerHTML = ipInfo.org;
  }

  /**
   * Process latency related information
   * @param {*} step
   * @param {Object} latency
   */
  processLatencyData(step, latency, jitter) {
    if (step !== STEP.LATENCY) return;

    UI.setProgressBar(latency.progress, STEP.LATENCY);
    if (!latency || !jitter) return;

    UI.$latencyValue.innerHTML = latency.avg || "";
    UI.$jitterValue.innerHTML = jitter || "";
  }

  /**
   * Process bandwidth related information
   * @param {*} step
   * @param {Object} data
   */
  processBandwidthData(step, result) {
    if (![STEP.DOWNLOAD, STEP.UPLOAD].includes(step)) return;
    const [data, $element] =
      step === STEP.DOWNLOAD ? [result.download, UI.$downloadValue] : [result.upload, UI.$uploadValue];

    UI.setProgressBar(data.progress, step);
    if (!data.speed) {
      UI.gauge.setValue(0);
      UI.$gaugeValue.innerHTML = "...";
      return;
    }

    const dataSpeed = (+data.speed || 0) / 1024 ** 2;
    UI.gauge.setValue(Math.log(10 * dataSpeed + 1));
    UI.$gaugeValue.innerHTML = $element.innerHTML = dataSpeed ? dataSpeed.toFixed(2) : "";
  }

  /**
   * Process a done test
   * @param {*} status
   * @param {String} timestamp
   * @param {String} id
   */
  processDoneStep(status, timestamp, id) {
    if (status !== STATUS.DONE) return;

    UI.$timestamp.setAttribute("timestamp", timestamp);
    UI.$timestamp.innerHTML = `<a href="/result/${id}">${DateFormat.toISO(new Date(timestamp))}</a>`;
  }

  /**
   * Build a storable result history object
   * @param {Object} result
   */
  buildHistoryResult(result) {
    return {
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
  }

  /**
   * Store a speed test run results to the local storage
   * @param {Object} result
   */
  storeLatestResult(result) {
    const resultsHistory = JSON.parse(localStorage.getItem("history")) || {};
    resultsHistory[result.timestamp] = this.buildHistoryResult(result);
    localStorage.setItem("history", JSON.stringify(this.limitResultsHistory(resultsHistory)));

    UI.$shareResultButton.removeAttribute("hidden");
    window.history.replaceState({}, "Speed Test - Results", `/result/${result.id}`);
    document.title = "Speed Test";
  }

  /**
   * Filter out the oldest results history entries
   * @param {Object} resultsHistory
   * @param {number} [maxEntries=20]
   * @returns {Object}
   */
  limitResultsHistory(resultsHistory, maxEntries = 20) {
    const filteredResults = {};
    Object.keys(resultsHistory)
      .sort((a, b) => +b - +a)
      .slice(0, maxEntries)
      .map(timestamp => (filteredResults[timestamp] = resultsHistory[timestamp]));
    return filteredResults;
  }
}
