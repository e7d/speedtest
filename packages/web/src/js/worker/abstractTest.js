import Request from "../utils/request";
import STATUS from "./status";
import Test from "./test";

export default class AbstractTest {
  constructor(step) {
    this.step = step;
    this.test = new Test();
  }

  /**
   * Run the bandwidth test
   * @returns {Promise<void>}
   */
  async run() {
    this.test.step = this.step;

    this.prepareRun();
    this.prepareData();
    this.processResult();
    this.test.timeouts.push(...this.getTimeouts());
    return Promise.all(this.getPromises())
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
   * Prepare test data
   */
  prepareData() {
    Object.assign(this, {
      error: null,
      requests: [],
      initDate: null,
      status: STATUS.WAITING,
      running: true,
      startDate: null,
      index: 0,
      promises: []
    });
  }

  /**
   * Setup the current test steps with timeouts
   * @returns {number[]}
   */
  getTimeouts() {
    const delay = this.test.config[this.step].delay;
    return [
      self.setTimeout(() => {
        this.status = STATUS.STARTING;
        this.initDate = Date.now();
      }, delay),
      self.setTimeout(() => {
        this.status = STATUS.RUNNING;
        this.startDate = Date.now();
      }, delay + this.test.config[this.step].gracetime),
      self.setTimeout(() => {
        this.status = STATUS.DONE;
        this.running = false;
      }, delay + this.test.config[this.step].duration)
    ];
  }

  /**
   * Build and return the current test promises
   * @returns {Promise[]}
   */
  getPromises() {
    const config = this.test.config[this.step];
    const getPromise = (index, config) =>
      new Promise((resolve, reject) => {
        this.test.timeouts.push(
          self.setTimeout(() => {
            this.runTest(config)
              .then(resolve)
              .catch(reject);
          }, config.delay * index)
        );
      });

    const promises = [];
    const streams = (this.test.config.connections === "multi" && config.streams) || 1;
    for (let index = 0; index < streams; index++) {
      promises.push(getPromise(index, config));
    }
    return promises;
  }
}
