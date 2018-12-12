export default class Results {
    /**
     * Build a sharable results string from a results object
     *
     * @param {Object} results
     * @returns {string}
     */
    static toString(results) {
        return `${results.latency.avg},${results.latency.jitter},${
            results.download.speed
        },${results.upload.speed},${results.ip},${results.asn || ""}`;
    }
}
