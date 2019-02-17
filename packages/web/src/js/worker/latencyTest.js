import Jitter from "../utils/jitter";
import Performance from "../utils/performance";
import Request from "../utils/request";
import Uuid from "../utils/uuid";

import STATUS from "./status";
import Test from "./test";

export default class LantencyTEst {
  constructor() {
    this.test = new Test();
  }

  /**
   * Run the latency test
   *
   * @returns {Promise}
   */
  async run() {
    Object.assign(this, {
      requests: [],
      initDate: null,
      status: STATUS.WAITING,
      running: true,
      data: [],
      pingDate: []
    });

    const run =
      "websocket" === this.test.config.latency.mode
        ? (delay = 0) => this.testWebSocket(delay)
        : (delay = 0) => this.testXHR(delay);

    this.processResult();
    this.test.timeouts.push(
      self.setTimeout(() => {
        this.status = STATUS.STARTING;
        this.initDate = Date.now();
      }, this.test.config.latency.delay * 1000)
    );
    this.test.timeouts.push(
      self.setTimeout(() => {
        this.status = STATUS.RUNNING;
        this.startDate = Date.now();
      }, this.test.config.latency.delay * 1000 + this.test.config.latency.gracetime * 1000)
    );
    this.test.timeouts.push(
      self.setTimeout(() => {
        this.status = STATUS.DONE;
        this.running = false;
      }, this.test.config.latency.delay * 1000 + this.test.config.latency.duration * 1000)
    );

    return run(this.test.config.latency.delay * 1000)
      .then(() => this.processResult)
      .catch(reason => {
        this.error = reason;
        this.test.result.latency = null;
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
   * Run the WebSocket based latency test
   *
   * @param {number} [delay=0]
   * @returns {Promise}
   */
  testWebSocket(delay = 0) {
    let index = 0;

    return new Promise((resolve, reject) => {
      if (STATUS.ABORTED === this.status) {
        return reject({
          status: STATUS.ABORTED
        });
      }

      if (STATUS.DONE === this.status) {
        return resolve();
      }

      const endpoint = `${this.test.config.endpoint.websocket.uri}/${this.test.config.latency.websocket.path}`;
      const socket = new WebSocket(endpoint);
      this.requests[index] = socket;

      socket.addEventListener("message", e => {
        if (STATUS.ABORTED === this.status) {
          socket.close();
          return reject({ status: STATUS.ABORTED });
        }

        if (STATUS.DONE === this.status) {
          socket.close();
          return resolve();
        }

        if (STATUS.RUNNING === this.status) {
          const data = JSON.parse(e.data);
          const index = data.index;
          let networkLatency = Date.now() - this.pingDate[index];
          networkLatency = +networkLatency.toFixed(2);
          this.data.push(networkLatency);
        }

        this.processResult();

        index += 1;
        this.pingDate[index] = Date.now();
        socket.send(
          JSON.stringify({
            action: "ping",
            index: index
          })
        );
      });

      socket.addEventListener("close", () => {
        Request.clearWebSocket(socket);
      });

      socket.addEventListener("error", e => {
        if (this.test.config.ignoreErrors) {
          this.testWebSocket()
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
          index += 1;
          this.pingDate[index] = +new Date();
          socket.send(
            JSON.stringify({
              action: "ping",
              index: index
            })
          );
        }, delay);
      });
    });
  }

  /**
   * Run the XHR based latency test
   *
   * @param {number} [delay=0]
   * @returns {Promise}
   */
  testXHR(delay = 0) {
    let pingDate, pongDate;
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

      const endpoint = `${this.test.config.endpoint.xhr.uri}/${this.test.config.latency.xhr.path}?${Uuid.v4()}`;
      const xhr = new XMLHttpRequest();
      this.requests[index] = xhr;

      xhr.open("GET", endpoint, true);
      xhr.addEventListener("loadstart", () => {
        pingDate = Date.now();
      });
      xhr.addEventListener("readystatechange", e => {
        if (!pongDate && xhr.readyState >= 2) pongDate = Date.now();
      });
      xhr.addEventListener("load", () => {
        if (STATUS.ABORTED === this.status) {
          return reject({ status: STATUS.ABORTED });
        }

        if (STATUS.DONE === this.status) {
          return resolve();
        }

        if (STATUS.RUNNING === this.status) {
          const performance = Performance.getEntry(self, endpoint);
          let networkLatency =
            null !== performance
              ? performance.responseStart - performance.requestStart || performance.duration
              : pongDate - pingDate;

          networkLatency = +networkLatency.toFixed(2);
          this.data.push(networkLatency);
        }

        this.processResult();
        if (this.test.config.latency.count && index >= this.test.config.latency.count) {
          return resolve();
        }

        this.testXHR()
          .then(resolve)
          .catch(reject);
      });
      xhr.addEventListener("error", e => {
        if (this.test.config.ignoreErrors) {
          this.testXHR()
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
          xhr.send();
          pingDate = Date.now();
        }, delay)
      );
    });
  }

  /**
   * Process the latency test result
   *
   * @returns {Promise}
   */
  processResult() {
    this.test.result.latency = {
      status: this.status,
      progress: 0
    };
    if (this.status <= STATUS.WAITING) {
      return;
    }

    const durationFromInit = (Date.now() - this.initDate) / 1000;
    const progress = durationFromInit / this.test.config.latency.duration;
    this.test.result.latency.progress = progress;
    if (this.status <= STATUS.STARTING) {
      return;
    }

    const latencies = this.data;
    this.test.result.latency = {
      ...this.test.result.latency,
      min: +Math.min.apply(null, latencies).toFixed(2),
      max: +Math.max.apply(null, latencies).toFixed(2),
      avg: +(latencies.reduce((total, latency) => total + latency, 0) / latencies.length).toFixed(2)
    };
    this.test.result.jitter = Jitter.compute(latencies).toFixed(2);
  }
}
