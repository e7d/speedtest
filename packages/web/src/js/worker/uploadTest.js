import Uuid from "../utils/uuid";
import BandwidthTest from "./bandwidthTest";
import Config from "./config";
import STEP from "./step";

export default class UploadTest extends BandwidthTest {
  constructor() {
    super(STEP.UPLOAD);
    this.buffer = this.getRandomData();
  }

  /**
   * Produce random data
   *
   * @returns {Float32Array}
   */
  getRandomData(bufferSize = 64 * 1024) {
    const buffer = new Float32Array(new ArrayBuffer(bufferSize));
    for (let index = 0; index < buffer.length; index++) {
      buffer[index] = Math.random();
    }
    return buffer;
  }

  /**
   * Produce a Blob made of random data
   *
   * @returns {Blob}
   */
  getRandomBlob(size) {
    const data = [];
    for (let i = 0; i < size / this.buffer.byteLength; i++) {
      data.push(this.buffer);
    }
    return new Blob(data, {
      type: "application/octet-stream"
    });
  }

  /**
   * Prepapre the XHR object
   *
   * @param {*} index
   * @param {*} xhr
   * @param {*} params
   */
  initXHR(index, xhr) {
    this.sizeLoaded[index] = 0;
    const endpoint = `${Config.getEndpointUri(this.test.config.endpoint, "xhr")}/${
      this.test.config.upload.path
    }?${Uuid.v4()}`;
    xhr.open("POST", endpoint, true);
    xhr.upload.timeout = this.test.config.upload.maxDuration;
    xhr.setRequestHeader("Content-Encoding", "identity");
    return xhr.upload;
  }

  /**
   * Send the XHR message
   *
   * @param {*} xhr
   */
  sendMessage(xhr) {
    xhr.send(this.getRandomBlob(this.test.config.upload.size));
  }
}
