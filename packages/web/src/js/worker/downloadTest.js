import Uuid from "../utils/uuid";
import BandwidthTest from "./bandwidthTest";

export default class DownloadTest extends BandwidthTest {
  constructor() {
    super("download");
  }

  /**
   * Prepapre the XHR object
   *
   * @param {*} index
   * @param {*} xhr
   * @param {*} params
   */
  initXHR(index, xhr, params) {
    this.sizeLoaded[index] = 0;
    const endpoint = `${this.test.config.endpoint.xhr.uri}/${this.test.config.download.path}?${Uuid.v4()}&size=${
      params.size
    }`;
    xhr.open("GET", endpoint, true);
    return xhr;
  }

  /**
   * Send the XHR message
   *
   * @param {*} xhr
   */
  sendMessage(xhr) {
    xhr.send(null);
  }
}
