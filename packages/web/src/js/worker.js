import { deepMerge } from "./utils/object";
import Request from "./utils/request";
import Config from "./worker/config";
import DownloadTest from "./worker/downloadTest";
import IpTest from "./worker/ipTest";
import LatencyTest from "./worker/latencyTest";
import Messaging from "./worker/messaging";
import Result from "./worker/result";
import Scope from "./worker/scope";
import STATUS from "./worker/status";
import Test from "./worker/test";
import UploadTest from "./worker/uploadTest";

/**
 * Speed Test worker
 *
 * @class SpeedTestWorker
 */
export default class SpeedTestWorker {
  /**
   * Creates an instance of SpeedTestWorker
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
      this.run().catch(reason => console.error("FAIL", reason));
      break;
    case "status":
      this.messaging.postStatus();
      break;
    default:
      if (event.data.config) {
        this.test.config = deepMerge(this.test.config, event.data.config);
      }
    }
  }

  /**
   * Prepare test run
   */
  prepareRun() {
    if (this.test.config.optimize) {
      // TODO: Auto adjust config to best values following the browser in use
    }
    this.test.running = true;
    this.date = new Date().toJSON();
    this.test.step = null;
    this.test.error = null;
    this.test.result = new Result();
    this.test.status = STATUS.RUNNING;
  }

  /**
   * Run tests
   */
  runTests() {
    return this.ipTest
      .run()
      .then(() => this.latencyTest.run())
      .then(() => this.downloadTest.run())
      .then(() => this.uploadTest.run())
      .then(() => this.test.storeResult())
      .then(() => (this.test.status = STATUS.DONE))
      .catch(reason => {
        reason.status = STATUS.FAILED;
        this.test.error = reason;
      })
      .then(() => {
        this.test.running = false;
        this.test.step = null;
        Request.clearRequests(this.scope.requests);
        if (this.test.status !== STATUS.DONE) throw this.test.error;
      });
  }

  /**
   * Run the speed test
   * @returns {Promise<void>}
   */
  async run() {
    if (this.test.running) {
      return new Promise((_, reject) => {
        reject({
          status: this.test.status,
          error: "Stop the current test before starting another one."
        });
      });
    }

    this.prepareRun();
    return this.runTests();
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
