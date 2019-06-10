import Bandwidth from "../utils/bandwidth";
import AbstractTest from "./abstractTest";
import STATUS from "./status";

export default class XHRTest extends AbstractTest {
  constructor(step) {
    super(step);
  }

  /**
   * Prepare the test run
   */
  prepareRun() {
    Object.assign(this, {
      data: [],
      loadDiff: [],
      sizeLoaded: [],
      size: 0
    });
  }

  /**
   * Run the XHR based upload speed test
   *
   * @param {any} size
   * @returns {Promise}
   */
  runTest(params) {
    const index = this.index++;

    return new Promise((resolve, reject) => {
      if (this.test.status === STATUS.ABORTED) {
        this.status = STATUS.ABORTED;
        return reject({
          status: STATUS.ABORTED
        });
      }

      if (this.status === STATUS.DONE) {
        return resolve();
      }

      const xhr = new XMLHttpRequest();
      this.requests[index] = xhr;

      this.registerEvents(index, xhr, params, resolve, reject);
      this.sendMessage(xhr);
      xhr.startDate = Date.now();
    });
  }

  /**
   * Register events for the XHR of the bandwidth test
   *
   * @param {*} index
   * @param {*} xhr
   * @param {*} params
   * @param {*} resolve
   * @param {*} reject
   */
  registerEvents(index, xhr, params, resolve, reject) {
    const xhrHandler = this.initXHR(index, xhr, params);
    xhrHandler.addEventListener("progress", e => this.handleProgress(e, index, xhr, params, resolve, reject));
    xhrHandler.addEventListener("load", e => this.handleLoad(e, index, xhr, params, resolve, reject));
    xhrHandler.addEventListener("timeout", e => this.handleTimeout(e, index, xhr, params, resolve, reject));
    xhrHandler.addEventListener("error", e => this.handleError(e, xhr, params, resolve, reject));
  }

  /**
   * Handle the XHR progress event
   *
   * @param {*} e
   * @param {*} index
   * @param {*} xhr
   * @param {*} resolve
   * @param {*} reject
   */
  handleProgress(e, index, xhr, params, resolve, reject) {
    if (xhr.readyState === XMLHttpRequest.DONE) return;

    if (this.test.status === STATUS.ABORTED) {
      this.status = STATUS.ABORTED;
      xhr.abort();
      return reject({ status: STATUS.ABORTED });
    }

    if (this.status === STATUS.DONE) {
      xhr.abort();
      return resolve();
    }

    this.loadDiff[index] = e.loaded - this.sizeLoaded[index];
    this.sizeLoaded[index] = e.loaded;
    if (this.status === STATUS.RUNNING) {
      this.size += this.loadDiff[index];
    }
    this.processResult();
  }

  /**
   * Handle the XHR load event
   *
   * @param {*} e
   * @param {*} index
   * @param {*} xhr
   * @param {*} params
   * @param {*} resolve
   * @param {*} reject
   */
  handleLoad(e, index, xhr, params, resolve, reject) {
    const duration = Date.now() - xhr.startDate;
    if (duration < this.test.config[this.step].minDuration) {
      this.test.config[this.step].size = Math.min(
        Math.round(e.loaded / (duration / 1000)),
        this.test.config[this.step].maxSize
      );
    }
    this.runTest(params)
      .then(resolve)
      .catch(reject);
  }

  /**
   * Handle the XHR timeout event
   *
   * @param {*} e
   * @param {*} index
   * @param {*} xhr
   * @param {*} params
   * @param {*} resolve
   * @param {*} reject
   */
  handleTimeout(e, index, xhr, params, resolve, reject) {
    this.test.config[this.step].size = Math.max(
      Math.round(e.loaded / (this.test.config[this.step].maxDuration / 1000)),
      this.test.config[this.step].minSize
    );
    this.runTest(params)
      .then(resolve)
      .catch(reject);
  }

  /**
   * Handle the XHR error event
   *
   * @param {*} e
   * @param {*} xhr
   * @param {*} params
   * @param {*} resolve
   * @param {*} reject
   */
  handleError(e, xhr, params, resolve, reject) {
    if (this.test.config.ignoreErrors) {
      this.runTest(params)
        .then(resolve)
        .catch(reject);
      return;
    }

    reject({
      status: STATUS.FAILED,
      error: e.error,
      message: e.message
    });
  }

  /**
   * Process the bandwidth speed test result
   */
  processResult() {
    this.test.result[this.step] = {
      status: this.status,
      progress: 0
    };
    if (this.status <= STATUS.WAITING) return;

    const durationFromInit = (Date.now() - this.initDate);
    const durationFromStart = (Date.now() - this.startDate);
    const progress = durationFromInit / this.test.config[this.step].duration;
    this.test.result[this.step].progress = progress;
    if (this.status <= STATUS.STARTING) return;

    const { bitBandwidth: bandwidth } = Bandwidth.compute(
      this.size,
      durationFromStart / 1000,
      this.test.config.overheadCompensation
    );
    this.test.result[this.step].speed = +bandwidth.toFixed(2);
  }
}
