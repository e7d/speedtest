import Bandwidth from "../utils/bandwidth";
import Request from "../utils/request";
import Uuid from "../utils/uuid";

import STATUS from "./status";
import Test from "./test";

export default class DownloadTest {
  constructor() {
    this.test = new Test();
  }

  /**
   * Run the download speed test
   *
   * @returns {Promise}
   */
  async run() {
    Object.assign(this, {
      error: null,
      requests: [],
      initDate: null,
      status: STATUS.WAITING,
      running: true,
      startDate: null,
      size: 0,
      index: 0,
      promises: []
    });

    const run =
      "websocket" === this.test.config.download.mode
        ? (size, delay = 0) => this.testWebSocket(size, delay)
        : (size, delay = 0) => this.testXHR(size, delay);

    this.promises = [];
    for (let index = 0; index < this.test.config.download.xhr.streams; index++) {
      const testPromise = run(
        this.test.config.download.xhr.size,
        this.test.config.download.delay * 1000 + index * this.test.config.download.xhr.delay
      );
      this.promises.push(testPromise);
    }

    this.processResult();
    this.test.timeouts.push(
      self.setTimeout(() => {
        this.status = STATUS.STARTING;
        this.initDate = Date.now();
      }, this.test.config.download.delay * 1000)
    );
    this.test.timeouts.push(
      self.setTimeout(() => {
        this.status = STATUS.RUNNING;
        this.startDate = Date.now();
      }, this.test.config.download.delay * 1000 + this.test.config.download.gracetime * 1000)
    );
    this.test.timeouts.push(
      self.setTimeout(() => {
        this.status = STATUS.DONE;
        this.running = false;
      }, this.test.config.download.delay * 1000 + this.test.config.download.duration * 1000)
    );

    return Promise.all(this.promises)
      .then(() => this.processResult)
      .catch(reason => {
        this.error = reason;
        this.test.result.download = null;
      })
      .then(() => {
        this.running = false;
        Request.clearRequests(this.requests);

        if (this.error) {
          throw this.error;
        }
      });
  }

  /**
   * Run the WebSocket based download speed test
   *
   * @param {any} size
   * @param {number} [delay=0]
   * @returns {Promise}
   */
  testWebSocket(size, delay = 0) {
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

      const endpoint = `${this.test.config.endpoint.websocket.uri}/${this.test.config.download.websocket.path}`;
      const socket = new WebSocket(endpoint);
      socket.binaryType = this.test.config.download.websocket.binaryType;
      this.requests[index] = socket;
      socket.addEventListener("message", e => {
        if (this.test.status === STATUS.ABORTED) {
          this.status = STATUS.ABORTED;
          socket.close();
          return reject({ status: STATUS.ABORTED });
        }

        if (STATUS.DONE === this.status) {
          socket.close();
          return resolve();
        }

        if (STATUS.RUNNING === this.status) {
          this.size += e.data.length;
        }
        this.processResult();

        socket.send(
          JSON.stringify({
            action: "download"
          })
        );
      });

      socket.addEventListener("close", () => {
        Request.clearWebSocket(socket);
      });

      socket.addEventListener("error", e => {
        if (this.test.config.ignoreErrors) {
          this.testWebSocket(size)
            .then(resolve)
            .catch(reject);
          return;
        }

        Request.clearWebSocket(socket);

        reject({
          status: STATUS.FAILED,
          error: e.error,
          message: e.message
        });
      });

      socket.addEventListener("open", () => {
        self.setTimeout(() => {
          socket.send(
            JSON.stringify({
              action: "prepare",
              size: this.test.config.download.websocket.size,
              chunkSize: this.test.config.download.websocket.chunkSize
            })
          );

          socket.send(
            JSON.stringify({
              action: "download"
            })
          );
        }, delay);
      });
    });
  }

  /**
   * Run the XHR based download speed test
   *
   * @param {any} size
   * @param {number} [delay=0]
   * @returns {Promise}
   */
  testXHR(size, delay = 0) {
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

      const endpoint = `${this.test.config.endpoint.xhr.uri}/${
        this.test.config.download.xhr.path
      }?${Uuid.v4()}&size=${size}`;

      const xhr = new XMLHttpRequest();
      this.requests[index] = xhr;
      xhr.responseType = this.test.config.download.xhr.responseType;

      let sizeLoaded = 0;
      xhr.open("GET", endpoint, true);
      xhr.addEventListener("progress", e => {
        if (this.test.status === STATUS.ABORTED) {
          this.status = STATUS.ABORTED;
          Request.clearXMLHttpRequest(xhr);
          return reject({ status: STATUS.ABORTED });
        }

        if (STATUS.DONE === this.status) {
          Request.clearXMLHttpRequest(xhr);
          return resolve();
        }

        const loadDiff = e.loaded - sizeLoaded;
        sizeLoaded = e.loaded;
        if (STATUS.RUNNING === this.status) {
          this.size += loadDiff;
        }
        this.processResult();
      });
      xhr.addEventListener("load", () => {
        Request.clearXMLHttpRequest(xhr);

        this.testXHR(size)
          .then(resolve)
          .catch(reject);
      });
      xhr.addEventListener("error", e => {
        Request.clearXMLHttpRequest(xhr);

        if (this.test.config.ignoreErrors) {
          this.testXHR(size)
            .then(resolve)
            .catch(reject);
          return;
        }

        reject({
          status: STATUS.FAILED,
          error: e.error,
          message: e.message
        });
      });

      this.test.timeouts.push(self.setTimeout(() => xhr.send(null), delay));
    });
  }

  /**
   * Process the download speed test result
   */
  processResult() {
    this.test.result.download = {
      status: this.status,
      progress: 0
    };
    if (this.status <= STATUS.WAITING) return;

    const durationFromInit = (Date.now() - this.initDate) / 1000;
    const durationFromStart = (Date.now() - this.startDate) / 1000;
    const progress = durationFromInit / this.test.config.download.duration;
    this.test.result.download.progress = progress;
    if (this.status <= STATUS.STARTING) return;

    const { bitBandwidth: bandwidth } = Bandwidth.compute(
      this.size,
      durationFromStart,
      this.test.config.overheadCompensation
    );
    this.test.result.download.speed = +bandwidth.toFixed(2);
  }
}
