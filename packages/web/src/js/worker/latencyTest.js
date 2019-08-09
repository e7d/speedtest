import Jitter from "../utils/jitter";
import Request from "../utils/request";
import Config from "./config";
import STATUS from "./status";
import AbstractTest from "./abstractTest";
import STEP from "./step";

export default class LantencyTest extends AbstractTest {
  constructor() {
    super(STEP.LATENCY);
  }

  /**
   * Prepare the test run
   */
  prepareRun() {
    Object.assign(this, {
      data: [],
      pingDate: []
    });
  }

  /**
   * Run the WebSocket based upload speed test
   *
   * @param {any} size
   * @param {number} [delay=0]
   * @returns {Promise}
   */
  runTest(params) {
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

      const endpoint = `${Config.getEndpointUri(this.test.config.endpoint, 'websocket')}/${this.test.config.latency.path}`;
      const socket = new WebSocket(endpoint);
      socket.binaryType = this.test.config.latency.binaryType || "arraybuffer";
      this.requests.push(socket);
      this.registerEvents(socket, params, resolve, reject);
    });
  }

  /**
   * Register events for the WebSocket of the latency test
   *
   * @param {*} socket
   * @param {*} params
   * @param {*} resolve
   * @param {*} reject
   */
  registerEvents(socket, params, resolve, reject) {
    socket.addEventListener("open", () => this.handleOpen(socket));
    socket.addEventListener("message", e => this.handleMessage(e, socket, resolve, reject));
    socket.addEventListener("close", () => this.handleClose(socket));
    socket.addEventListener("error", e => this.handleError(e, socket, resolve, reject, params));
  }

  /**
   * Handle the WebSocket open event
   *
   * @param {*} socket
   */
  handleOpen(socket) {
    this.sendMessage(socket);
  }

  /**
   * Handle the WebSocket message event
   *
   * @param {*} e
   * @param {*} socket
   * @param {*} resolve
   * @param {*} reject
   */
  handleMessage(e, socket, resolve, reject) {
    if (this.test.status === STATUS.ABORTED) {
      this.status = STATUS.ABORTED;
      socket.close();
      return reject({ status: STATUS.ABORTED });
    }

    if (this.status === STATUS.DONE) {
      socket.close();
      return resolve();
    }

    if (this.status === STATUS.RUNNING) {
      const data = JSON.parse(e.data);
      const index = data.index;
      let networkLatency = Date.now() - this.pingDate[index];
      networkLatency = +networkLatency.toFixed(2);
      this.data.push(networkLatency);
    }
    this.processResult();

    this.sendMessage(socket);
  }

  /**
   * Handle the WebSocket close event
   *
   * @param {*} socket
   */
  handleClose(socket) {
    Request.clearWebSocket(socket);
  }

  /**
   * Handle the WebSocket error event
   *
   * @param {*} e
   * @param {*} socket
   * @param {*} params
   * @param {*} resolve
   * @param {*} reject
   */
  handleError(e, socket, params, resolve, reject) {
    if (this.test.config.ignoreErrors) {
      this.runTest(params)
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
  }

  /**
   * Send a WebSocket message
   *
   * @param {*} socket
   */
  sendMessage(socket) {
    const index = this.index++;
    this.pingDate[index] = Date.now();
    socket.send(
      JSON.stringify({
        action: "ping",
        index
      })
    );
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
    if (this.status <= STATUS.WAITING) return;

    const durationFromInit = (Date.now() - this.initDate);
    const progress = durationFromInit / this.test.config.latency.duration;
    this.test.result.latency.progress = progress;
    if (this.status <= STATUS.STARTING) return;

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
