import Bandwidth from "../utils/bandwidth";
import Request from "../utils/request";
import Uuid from "../utils/uuid";

import STATUS from "./status";
import Test from "./test";

export default class UploadTest {
  constructor() {
    this.test = new Test();
  }

  /**
   * Produce random data
   *
   * @returns {Float32Array}
   */
  getRandomData() {
    const bufferSize = 128 * 1024;
    const buffer = new Float32Array(new ArrayBuffer(bufferSize));
    for (let index = 0; index < buffer.length; index++) {
      buffer[index] = Math.random();
    }

    const dataSize = this.test.config.upload.xhr.size;
    let data = new Float32Array(new ArrayBuffer(dataSize));
    for (let i = 0; i < data.byteLength / buffer.byteLength; i++) {
      data.set(buffer, i * buffer.length);
    }

    return data;
  }

  /**
   * Produce a Blob made of random data
   *
   * @returns {Blob}
   */
  getRandomBlob() {
    return new Blob([this.getRandomData()], {
      type: "application/octet-stream"
    });
  }

  /**
   * Run the upload speed
   *
   * @returns {Promise}
   */
  async run() {
    Object.assign(this, {
      requests: [],
      initDate: null,
      status: STATUS.WAITING,
      running: true,
      startDate: null,
      size: 0,
      index: 0,
      promises: [],
      blob: this.getRandomBlob()
    });

    const run =
      "websocket" === this.test.config.upload.mode
        ? (size, delay = 0) => this.testWebSocket(size, delay)
        : (size, delay = 0) => this.testXHR(size, delay);

    this.promises = [];
    for (let index = 0; index < this.test.config.upload.xhr.streams; index++) {
      const testPromise = run(
        this.test.config.upload.xhr.size,
        this.test.config.upload.delay * 1000 + index * this.test.config.upload.xhr.delay
      );
      this.promises.push(testPromise);
    }

    this.processResult();
    this.test.timeouts.push(
      self.setTimeout(() => {
        this.status = STATUS.STARTING;
        this.initDate = Date.now();
      }, this.test.config.upload.delay * 1000)
    );
    this.test.timeouts.push(
      self.setTimeout(() => {
        this.status = STATUS.RUNNING;
        this.startDate = Date.now();
      }, this.test.config.upload.delay * 1000 + this.test.config.upload.gracetime * 1000)
    );
    this.test.timeouts.push(
      self.setTimeout(() => {
        this.status = STATUS.DONE;
        this.running = false;
      }, this.test.config.upload.delay * 1000 + this.test.config.upload.duration * 1000)
    );

    return Promise.all(this.promises)
      .then(() => this.processResult)
      .catch(reason => {
        this.error = reason;
        this.test.result.latency = null;
      })
      .then(() => {
        this.running = false;
        delete this.blob;
        Request.clearRequests(this.requests);

        if (this.error) {
          throw this.error;
        }
      });
  }

  /**
   * Run the WebSocket based upload speed test
   *
   * @param {any} size
   * @param {number} [delay=0]
   * @returns {Promise}
   */
  testWebSocket(size, delay = 0) {
    const index = this.index++;

    return new Promise((resolve, reject) => {
      if (STATUS.ABORTED === this.status) {
        return reject({
          status: STATUS.ABORTED
        });
      }

      if (STATUS.DONE === this.status) {
        return resolve();
      }

      const endpoint = `${this.test.config.endpoint.websocket.uri}/${this.test.config.upload.websocket.path}`;
      const socket = new WebSocket(endpoint);
      socket.binaryType = "arraybuffer";

      this.requests[index] = socket;
      socket.addEventListener("message", () => {
        if (STATUS.ABORTED === this.status) {
          socket.close();
          return reject({ status: STATUS.ABORTED });
        }

        if (STATUS.DONE === this.status) {
          socket.close();
          return resolve();
        }

        if (STATUS.RUNNING === this.status) {
          this.size += this.blob.size;
        }
        this.processResult();

        socket.send(this.blob);
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
          socket.send(this.blob);
        }, delay);
      });
    });
  }

  /**
   * Run the XHR based upload speed test
   *
   * @param {any} size
   * @param {number} [delay=0]
   * @returns {Promise}
   */
  testXHR(size, delay = 0) {
    const index = this.index++;

    return new Promise((resolve, reject) => {
      if (STATUS.ABORTED === this.status) {
        return reject({
          status: STATUS.ABORTED
        });
      }

      if (STATUS.DONE === this.status) {
        return resolve();
      }

      const endpoint = `${this.test.config.endpoint.xhr.uri}/${this.test.config.upload.xhr.path}?${Uuid.v4()}`;

      const xhr = new XMLHttpRequest();

      this.requests[index] = xhr;

      let sizeLoaded = 0;
      xhr.open("POST", endpoint, true);
      xhr.setRequestHeader("Content-Encoding", "identity");
      xhr.upload.addEventListener("progress", e => {
        if (STATUS.ABORTED === this.status) {
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

      xhr.upload.addEventListener("load", () => {
        Request.clearXMLHttpRequest(xhr);

        this.testXHR(size)
          .then(resolve)
          .catch(reject);
      });

      xhr.upload.addEventListener("error", e => {
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

      this.test.timeouts.push(
        self.setTimeout(() => {
          xhr.send(this.blob);
        }, delay)
      );
    });
  }

  /**
   * Process the upload speed test result
   */
  processResult() {
    this.test.result.upload = {
      status: this.status,
      progress: 0
    };
    if (this.status <= STATUS.WAITING) {
      return;
    }

    const durationFromInit = (Date.now() - this.initDate) / 1000;
    const durationFromStart = (Date.now() - this.startDate) / 1000;
    const progress = durationFromInit / this.test.config.upload.duration;
    this.test.result.upload.progress = progress;
    if (this.status <= STATUS.STARTING) {
      return;
    }

    const { bitBandwidth: bandwidth } = Bandwidth.compute(
      this.size,
      durationFromStart,
      this.test.config.overheadCompensation
    );
    this.test.result.upload.speed = +bandwidth.toFixed(2);
  }
}
