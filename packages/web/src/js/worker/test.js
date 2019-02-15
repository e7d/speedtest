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
   */
  storeResult() {
    return new Promise((resolve, reject) => {
      const endpoint = `${this.config.endpoint.xhr.uri}/${this.config.result.xhr.path}`;
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
      xhr.send(
        JSON.stringify({
          timestamp: new Date().getTime(),
          latency: {
            avg: this.result.latency.avg
          },
          jitter: this.result.jitter,
          download: {
            speed: this.result.download.speed
          },
          upload: {
            speed: this.result.upload.speed
          },
          ipInfo: {
            ip: this.result.ipInfo.ip,
            org: this.result.ipInfo.org
          }
        })
      );
    });
  }
}
