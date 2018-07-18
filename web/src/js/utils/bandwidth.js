export default class Bandwidth {
    /**
     * Compute the bandwidth used from data use over time
     *
     * @param {number} size
     * @param {number} duration
     * @returns {Object}
     */
    static compute(size, duration) {
        const byteBandwidth =
            (size / duration) * this.config.overheadCompensation;
        const bitBandwidth = 8 * byteBandwidth;

        return {
            byteBandwidth: byteBandwidth,
            bitBandwidth: bitBandwidth
        };
    }
}
