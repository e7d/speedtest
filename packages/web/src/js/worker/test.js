import Result from "./result";

export default class Test {
  constructor() {
    if (!Test.instance) {
      this.timeouts = [];

      this.config = null;
      this.result = new Result();

      this.running = false;
      this.status = null;
      this.step = null;
      this.error = false;
      this.alerts = {};

      Test.instance = this;
    }

    return Test.instance;
  }

  /**
   * Store the result in the server
   * @returns {Promise<void>}
   */
  storeResult() {
    return new Promise((resolve, reject) => {
      const endpoint = `${this.config.result.path}`;
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint, true);
      xhr.addEventListener("load", e => {
        this.result.id = xhr.response;
        resolve();
      });
      xhr.addEventListener("error", e => {
        reject({
          status: STATUS.FAILED,
          error: e.error,
          message: e.message
        });
      });
      xhr.send(this.getJsonResult(this.result));
    });
  }

  /**
   * Get result as JSON
   * @param {object} result
   * @returns {string}
   */
  getJsonResult(result) {
    return JSON.stringify({
      timestamp: new Date().getTime(),
      latency: {
        avg: result.latency.avg
      },
      jitter: result.jitter,
      download: {
        speed: result.download.speed
      },
      upload: {
        speed: result.upload.speed
      },
      ipInfo: {
        ip: result.ipInfo.ip,
        org: result.ipInfo.org
      }
    });
  }
}
