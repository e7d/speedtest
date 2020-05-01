export default class Bandwidth {
  /**
   * Compute the bandwidth used from data use over time
   * @param {number} size
   * @param {number} duration
   * @returns {Object}
   */
  static compute(size, duration, overheadCompensation) {
    const byteBandwidth = (size / duration) * overheadCompensation;
    const bitBandwidth = 8 * byteBandwidth;

    return {
      byteBandwidth: byteBandwidth,
      bitBandwidth: bitBandwidth
    };
  }
}
