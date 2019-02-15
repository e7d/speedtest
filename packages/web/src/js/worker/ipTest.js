import Request from "../utils/request";
import Uuid from "../utils/uuid";

import STATUS from "./status";
import Test from "./test";
import Result from "./result";
import Messaging from "./messaging";

export default class IpTest {
  constructor() {
    this.messaging = new Messaging();
    this.test = new Test();
  }

  /**
   * Run the IP test
   *
   * @returns {Promise}
   */
  async run() {
    const run = () => {
      return new Promise((resolve, reject) => {
        const endpoint = `${this.test.config.endpoint.xhr.uri}/${this.test.config.ip.path}?${Uuid.v4()}`;
        const xhr = new XMLHttpRequest();

        xhr.open("GET", endpoint, true);
        xhr.addEventListener("load", () => {
          this.test.result.ipInfo = JSON.parse(xhr.response);
          Request.clearXMLHttpRequest(xhr);

          resolve();
        });
        xhr.addEventListener("error", e => {
          Request.clearXMLHttpRequest(xhr);

          reject({
            status: STATUS.FAILED,
            error: e.error,
            message: e.message
          });
        });
        xhr.send();
      });
    };

    this.test.ip = {
      status: STATUS.STARTING,
      running: true,
      data: []
    };

    return run()
      .catch(reason => {
        this.test.ip.error = reason;
        this.test.result.ip = null;
      })
      .then(() => {
        this.test.ip.running = false;
        this.messaging.postStatus();
        Request.clearRequests(this.requests);

        if (this.test.ip.error) {
          throw this.test.ip.error;
        }
      });
  }
}
