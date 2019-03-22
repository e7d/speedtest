import Uuid from "../utils/uuid";
import BandwidthTest from "./bandwidthTest";

export default class UploadTest extends BandwidthTest {
  constructor() {
    super("upload");
    this.blob = this.getRandomBlob();
  }

  /**
   * Produce random data
   *
   * @returns {Float32Array}
   */
  getRandomData() {
    const bufferSize = 128 * 1024;
    const buffer = new Float32Array(new ArrayBuffer(bufferSize));
    for (let index = 0; index < buffer.length; index++) {
      buffer[index] = Math.random();
    }

    const dataSize = this.test.config.upload.size;
    let data = new Float32Array(new ArrayBuffer(dataSize));
    for (let i = 0; i < data.byteLength / buffer.byteLength; i++) {
      data.set(buffer, i * buffer.length);
    }

    return data;
  }

  /**
   * Produce a Blob made of random data
   *
   * @returns {Blob}
   */
  getRandomBlob() {
    return new Blob([this.getRandomData()], {
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
    const endpoint = `${this.test.config.endpoint.xhr.uri}/${this.test.config.upload.path}?${Uuid.v4()}`;
    xhr.open("POST", endpoint, true);
    xhr.setRequestHeader("Content-Encoding", "identity");
    return xhr.upload;
  }

  /**
   * Send the XHR message
   *
   * @param {*} xhr
   */
  sendMessage(xhr) {
    xhr.send(this.blob);
  }
}
