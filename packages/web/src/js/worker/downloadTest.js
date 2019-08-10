import Uuid from "../utils/uuid";
import BandwidthTest from "./bandwidthTest";
import Config from './config';
import STEP from "./step";

export default class DownloadTest extends BandwidthTest {
  constructor() {
    super(STEP.DOWNLOAD);
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
    const endpoint = `${Config.getEndpointUri(this.test.config.endpoint, 'xhr')}/${this.test.config.download.path}?${Uuid.v4()}&size=${
      params.size
    }`;
    xhr.timeout = this.test.config.download.maxDuration;
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
