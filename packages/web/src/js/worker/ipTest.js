import Request from "../utils/request";
import Uuid from "../utils/uuid";
import Config from "./config";
import Messaging from "./messaging";
import STATUS from "./status";
import STEP from "./step";
import Test from "./test";

export default class IpTest {
  constructor() {
    this.messaging = new Messaging();
    this.test = new Test();
  }

  /**
   * Run the IP test
   * @returns {Promise<void>}
   */
  async run() {
    this.test.step = STEP.IP;
    this.test.ip = {
      status: STATUS.STARTING,
      running: true,
      data: []
    };

    return this.runTest()
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

  /**
   * Run the XHR based ip test
   */
  runTest() {
    return new Promise((resolve, reject) => {
      const endpoint = `${Config.getEndpointUri(this.test.config.endpoint, 'xhr')}/${this.test.config.ip.path}?${Uuid.v4()}`;
      const xhr = new XMLHttpRequest();

      xhr.open("GET", endpoint, true);
      xhr.addEventListener("load", () => {
        this.test.result.ipInfo = JSON.parse(xhr.response);
        resolve();
      });
      xhr.addEventListener("error", e => {
        reject({
          status: STATUS.FAILED,
          error: e.error,
          message: e.message
        });
      });
      xhr.send();
    });
  };
}
