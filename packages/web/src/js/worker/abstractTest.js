import Request from "../utils/request";
import STATUS from "./status";
import Test from "./test";

export default class AbstractTest {
  constructor(type) {
    this.type = type;
    this.test = new Test();
  }

  /**
   * Run the bandwidth test
   *
   * @returns {Promise}
   */
  async run() {
    this.prepareRun();
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
   * Setup the current test steps with timeouts
   */
  getTimeouts() {
    return [
      self.setTimeout(() => {
        this.status = STATUS.STARTING;
        this.initDate = Date.now();
      }, this.test.config[this.type].delay * 1000),
      self.setTimeout(() => {
        this.status = STATUS.RUNNING;
        this.startDate = Date.now();
      }, this.test.config[this.type].delay * 1000 + this.test.config[this.type].gracetime * 1000),
      self.setTimeout(() => {
        this.status = STATUS.DONE;
        this.running = false;
      }, this.test.config[this.type].delay * 1000 + this.test.config[this.type].duration * 1000)
    ];
  }

  /**
   * Build and return the current test promises
   */
  getPromises() {
    const config = this.test.config[this.type];
    const getPromise = (index, config) =>
      new Promise((resolve, reject) => {
        this.test.timeouts.push(
          self.setTimeout(() => {
            this.runTest(config)
              .then(resolve)
              .catch(reject);
          }, config.delay * 1000 + config.delay * index)
        );
      });

    const promises = [];

    for (let index = 0; index < (config.streams || 1); index++) {
      promises.push(getPromise(index, config));
    }
    return promises;
  }
}
