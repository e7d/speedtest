import Request from "./utils/request";

import STATUS from "./worker/status";
import STEP from "./worker/step";

import Config from "./worker/config";
import DownloadTest from "./worker/downloadTest";
import IpTest from "./worker/ipTest";
import LatencyTest from "./worker/latencyTest";
import Messaging from "./worker/messaging";
import Scope from "./worker/scope";
import Test from "./worker/test";
import UploadTest from "./worker/uploadTest";

/**
 * Speed Test worker
 *
 * @class SpeedTestWorker
 */
export default class SpeedTestWorker {
  /**
   * Creates an instance of SpeedTestWorker.
   * @param {DedicatedWorkerGlobalScope} scope
   */
  constructor(scope = self) {
    this.scope = new Scope(scope);
    this.scope.addEventListener("message", this.processMessage.bind(this));

    this.config = new Config();
    this.config
      .load()
      .then(config => {
        this.test = new Test();
        this.test.config = config;

        this.messaging = new Messaging();

        this.ipTest = new IpTest();
        this.latencyTest = new LatencyTest();
        this.downloadTest = new DownloadTest();
        this.uploadTest = new UploadTest();

        if (config.endpoint.xhr.protocol === "https" || config.endpoint.websocket.protocol === "wss") {
          this.test.alerts = {
            https: "Speed test endpoint is accessed through a secured connection, results may be impacted."
          };
          console.warn(this.test.alerts.https);
        }
        this.test.status = STATUS.READY;
        this.messaging.postStatus();
      })
      .then(() => {
        this.test.status = STATUS.WAITING;
      });

    return this;
  }

  /**
   * Process incoming event message
   *
   * @param {any} event
   */
  processMessage(event) {
    switch (event.data) {
    case "abort":
      this.abort();
      this.messaging.postStatus();
      break;
    case "config":
      this.messaging.postMessage(this.test.config);
      break;
    case "start":
      this.run()
        .then(() => {
          this.messaging.postStatus();
        })
        .catch(reason => {
          console.error("FAIL", reason);
        });
      break;
    case "status":
      this.messaging.postStatus();
      break;
    }
  }

  /**
   * Run the speed test
   *
   * @returns {Promise}
   */
  async run() {
    if (this.test.running) {
      return new Promise((resolve, reject) => {
        reject({
          status: this.test.status,
          error: "Stop the current test before starting another one."
        });
      });
    }

    if (this.test.config.optimize) {
      // TODO: Auto adjust config to best values following the browser in use
    }

    this.test.running = true;
    this.date = new Date().toJSON();
    this.test.status = STATUS.STARTING;
    this.test.step = null;
    this.test.error = null;
    Object.assign(this.test.result, {
      latency: null,
      download: null,
      upload: null
    });

    this.test.status = STATUS.RUNNING;
    this.test.step = STEP.IP;
    return this.ipTest
      .run()
      .then(() => {
        this.test.step = STEP.LATENCY;
        return this.latencyTest.run();
      })
      .then(() => {
        this.test.step = STEP.DOWNLOAD;
        return this.downloadTest.run();
      })
      .then(() => {
        this.test.step = STEP.UPLOAD;
        return this.uploadTest.run();
      })
      .then(() => {
        return this.test.storeResult();
      })
      .then(() => {
        this.test.status = STATUS.DONE;
      })
      .catch(reason => {
        reason.status = STATUS.FAILED;
        this.test.error = reason;
      })
      .then(() => {
        this.test.running = false;
        this.test.step = null;

        Request.clearRequests(this.scope.requests);

        if (STATUS.DONE !== this.test.status) {
          throw this.test.error;
        }
      });
  }

  /**
   * Abort the speed test
   */
  abort() {
    this.test.status = STATUS.ABORTED;
    this.test.running = false;

    this.test.timeouts.forEach((timeoutIndex, index) => {
      this.scope.clearTimeout(timeoutIndex);
      delete this.test.timeouts[index];
    });

    Request.clearRequests(this.scope.requests);
  }
}

new SpeedTestWorker(self);
