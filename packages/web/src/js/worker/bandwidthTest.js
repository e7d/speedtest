import Bandwidth from "../utils/bandwidth";
import Request from "../utils/request";
import AbstractTest from "./abstractTest";
import STATUS from "./status";

export default class XHRTest extends AbstractTest {
  constructor(type) {
    super(type);
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

      if (STATUS.DONE === this.status) {
        return resolve();
      }

      const xhr = new XMLHttpRequest();
      this.requests[index] = xhr;

      this.registerEvents(index, xhr, params, resolve, reject);
      this.sendMessage(xhr);
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
    xhrHandler.addEventListener("progress", e => this.handleProgress(e, index, xhr, resolve, reject));
    xhrHandler.addEventListener("load", e => this.handleLoad(xhr, params, resolve, reject));
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
  handleProgress(e, index, xhr, resolve, reject) {
    if (this.test.status === STATUS.ABORTED) {
      this.status = STATUS.ABORTED;
      Request.clearXMLHttpRequest(xhr);
      return reject({ status: STATUS.ABORTED });
    }

    if (STATUS.DONE === this.status) {
      Request.clearXMLHttpRequest(xhr);
      return resolve();
    }

    this.loadDiff[index] = e.loaded - this.sizeLoaded[index];
    this.sizeLoaded[index] = e.loaded;
    if (STATUS.RUNNING === this.status) {
      this.size += this.loadDiff[index];
    }
    this.processResult();
  }

  /**
   * Handle the XHR load event
   *
   * @param {*} xhr
   * @param {*} params
   * @param {*} resolve
   * @param {*} reject
   */
  handleLoad(xhr, params, resolve, reject) {
    Request.clearXMLHttpRequest(xhr);
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
    Request.clearXMLHttpRequest(xhr);

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

    const durationFromInit = (Date.now() - this.initDate) / 1000;
    const durationFromStart = (Date.now() - this.startDate) / 1000;
    const progress = durationFromInit / this.test.config[this.step].duration;
    this.test.result[this.step].progress = progress;
    if (this.status <= STATUS.STARTING) return;

    const { bitBandwidth: bandwidth } = Bandwidth.compute(
      this.size,
      durationFromStart,
      this.test.config.overheadCompensation
    );
    this.test.result[this.step].speed = +bandwidth.toFixed(2);
  }
}
