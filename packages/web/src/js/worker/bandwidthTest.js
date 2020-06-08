import Bandwidth from "../utils/bandwidth";
import AbstractTest from "./abstractTest";
import STATUS from "./status";

export default class XHRTest extends AbstractTest {
  /**
   * @param {string} step
   */
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
   * @param {object} params
   * @returns {Promise<void>}
   */
  runTest(params) {
    const index = this.index++;

    return new Promise((resolve, reject) => {
      if (this.test.status === STATUS.ABORTED) {
        this.status = STATUS.ABORTED;
        reject({
          status: STATUS.ABORTED
        });
        return;
      }

      if (this.status === STATUS.DONE) {
        resolve();
        return;
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
   * @param {number} index
   * @param {XMLHttpRequest} xhr
   * @param {object} params
   * @param {function} resolve
   * @param {function} reject
   */
  registerEvents(index, xhr, params, resolve, reject) {
    xhr = this.initXHR(index, xhr, params);
    const xhrProgressHandler = this.step === 'upload' ? xhr.upload : xhr;
    xhrProgressHandler.onprogress = e => this.handleProgress(e, index, xhr, resolve, reject);
    xhr.addEventListener("load", e => this.handleLoad(e, xhr, params, resolve, reject));
    xhr.addEventListener("error", e => this.handleError(e, params, resolve, reject));
    xhr.addEventListener("timeout", e => this.handleTimeout(e, params, resolve, reject));
  }

  /**
   * Handle the XHR progress event
   * @param {Event} e
   * @param {number} index
   * @param {XMLHttpRequest} xhr
   * @param {function} resolve
   * @param {function} reject
   */
  handleProgress(e, index, xhr, resolve, reject) {
    if (xhr.readyState === XMLHttpRequest.DONE) return;

    if (this.test.status === STATUS.ABORTED) {
      this.status = STATUS.ABORTED;
      xhr.abort();
      reject({ status: STATUS.ABORTED });
      return;
    }

    if (this.status === STATUS.DONE) {
      xhr.abort();
      resolve();
      return;
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
   * @param {Event} e
   * @param {XMLHttpRequest} xhr
   * @param {object} params
   * @param {function} resolve
   * @param {function} reject
   */
  handleLoad(e, xhr, params, resolve, reject) {
    const duration = Date.now() - xhr.startDate;
    if (this.test.config[this.step].adjustSize && e.laoded > 0 && duration < this.test.config[this.step].minDuration) {
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
   * Handle the XHR error event
   * @param {Event} e
   * @param {object} params
   * @param {function} resolve
   * @param {function} reject
   */
  handleError(e, params, resolve, reject) {
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
   * Handle the XHR timeout event
   * @param {Event} e
   * @param {XMLHttpRequest} xhr
   * @param {object} params
   * @param {function} resolve
   * @param {function} reject
   */
  handleTimeout(e, params, resolve, reject) {
    if (this.test.config[this.step].adjustSize) {
      this.test.config[this.step].size = Math.max(
        Math.round(e.loaded / (this.test.config[this.step].maxDuration / 1000)),
        this.test.config[this.step].minSize
      );
    }
    this.runTest(params)
      .then(resolve)
      .catch(reject);
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

    const durationFromInit = Date.now() - this.initDate;
    const durationFromStart = Date.now() - this.startDate;
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
