export default class Bytes {
  /**
   * Compute the bandwidth used from data use over time
   * @param {number} size
   * @param {number} duration
   * @returns {Object}
   */
  static convert(bytes, power = 1) {
    return (bytes / 1024 ** power).toFixed(2);
  }
}
